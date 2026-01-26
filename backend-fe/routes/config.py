"""
Rutas de Configuración FE
- Datos del emisor
- Certificado digital
- Configuración fiscal
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from datetime import datetime, timezone
from typing import Optional
import uuid

from models.config import EmitterConfig, FullConfigResponse
from models.certificate import CertificateResponse, CertificateInfo
from middleware.tenant import get_tenant_id, validate_tenant_exists
from services.xml_signer import load_p12_certificate, get_certificate_info
from utils.crypto import encrypt_password
from utils.validators import validate_ruc, validate_email, validate_phone

router = APIRouter(prefix="/fe/config", tags=["Configuración"])

@router.post("/emitter")
async def save_emitter_config(
    request: Request,
    config: EmitterConfig
):
    """
    Guarda/actualiza configuración del emisor
    Crea el tenant si no existe
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    # Sanitizar establecimiento y punto_emision (deben ser códigos de 3 dígitos)
    establecimiento = config.establecimiento.strip()
    punto_emision = config.punto_emision.strip()
    
    # Si vienen con valores incorrectos (URLs, textos largos), usar valores por defecto
    if len(establecimiento) > 3 or not establecimiento.isdigit():
        establecimiento = "001"
    if len(punto_emision) > 3 or not punto_emision.isdigit():
        punto_emision = "001"
    
    # Validar RUC
    valid, msg = validate_ruc(config.ruc)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    # Validar email
    valid, msg = validate_email(config.email)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    now = datetime.now(timezone.utc)
    
    # Verificar si tenant existe
    existing_tenant = await db.tenants.find_one({"tenant_id": tenant_id})
    
    if existing_tenant:
        # Verificar que el RUC no esté en uso por otro tenant
        ruc_conflict = await db.tenants.find_one({
            "ruc": config.ruc,
            "tenant_id": {"$ne": tenant_id}
        })
        if ruc_conflict:
            raise HTTPException(status_code=400, detail="RUC ya registrado para otro tenant")
        
        # Actualizar tenant existente
        await db.tenants.update_one(
            {"tenant_id": tenant_id},
            {
                "$set": {
                    "ruc": config.ruc,
                    "razon_social": config.razon_social,
                    "nombre_comercial": config.nombre_comercial,
                    "email": config.email,
                    "phone": config.telefono,
                    "address": {"direccion": config.direccion},
                    "updated_at": now
                }
            }
        )
    else:
        # Verificar RUC único
        ruc_exists = await db.tenants.find_one({"ruc": config.ruc})
        if ruc_exists:
            raise HTTPException(status_code=400, detail="RUC ya registrado")
        
        # Crear nuevo tenant
        tenant_doc = {
            "_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "ruc": config.ruc,
            "razon_social": config.razon_social,
            "nombre_comercial": config.nombre_comercial,
            "email": config.email,
            "phone": config.telefono,
            "address": {"direccion": config.direccion},
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        await db.tenants.insert_one(tenant_doc)
    
    # Crear/actualizar store (establecimiento)
    store_key = {
        "tenant_id": tenant_id,
        "store_code": establecimiento,
        "emission_point": punto_emision
    }
    
    await db.stores.update_one(
        store_key,
        {
            "$set": {
                "name": f"Establecimiento {establecimiento}",
                "address": config.direccion,
                "phone": config.telefono,
                "is_active": True,
                "updated_at": now
            },
            "$setOnInsert": {
                "_id": str(uuid.uuid4()),
                "created_at": now
            }
        },
        upsert=True
    )
    
    # Crear/actualizar configuración fiscal
    await db.configs_fiscal.update_one(
        {"tenant_id": tenant_id},
        {
            "$set": {
                "ambiente": config.ambiente,
                "obligado_contabilidad": config.obligado_contabilidad,
                "tipo_contribuyente": config.tipo_contribuyente,
                "agente_retencion": config.agente_retencion,
                "config": {
                    "iva_default": 15,
                    "moneda": "DOLAR",
                    "decimales": 2,
                    "incluir_iva_precio": False
                },
                "sri_endpoints": {
                    "recepcion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl" if config.ambiente == "pruebas" else "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
                    "autorizacion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl" if config.ambiente == "pruebas" else "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
                },
                "is_configured": True,
                "updated_at": now
            },
            "$setOnInsert": {
                "_id": str(uuid.uuid4()),
                "created_at": now
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "message": "Configuración del emisor guardada correctamente"
    }


@router.post("/certificate")
async def upload_certificate(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    Sube y valida certificado .p12
    El certificado se almacena encriptado en la BD
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    # Validar extensión
    if not file.filename.endswith('.p12'):
        raise HTTPException(status_code=400, detail="El archivo debe ser .p12")
    
    # Leer contenido
    file_data = await file.read()
    
    if len(file_data) > 10 * 1024 * 1024:  # 10MB max
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx 10MB)")
    
    # Validar certificado
    try:
        private_key, certificate = load_p12_certificate(file_data, password)
        cert_info = get_certificate_info(certificate)
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Error al cargar certificado: {str(e)}. Verifique la contraseña."
        )
    
    # Verificar que no esté expirado
    if cert_info["valid_to"] < datetime.now():
        raise HTTPException(status_code=400, detail="El certificado está expirado")
    
    now = datetime.now(timezone.utc)
    
    # Desactivar certificados anteriores
    await db.certificates.update_many(
        {"tenant_id": tenant_id},
        {"$set": {"is_active": False}}
    )
    
    # Encriptar contraseña
    password_encrypted = encrypt_password(password)
    
    # Guardar nuevo certificado
    cert_doc = {
        "_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "file_data": file_data,
        "password_encrypted": password_encrypted,
        "certificate_info": {
            "subject": cert_info["subject"],
            "issuer": cert_info["issuer"],
            "serial_number": cert_info["serial_number"],
            "valid_from": cert_info["valid_from"],
            "valid_to": cert_info["valid_to"]
        },
        "is_active": True,
        "uploaded_at": now,
        "uploaded_by": None
    }
    
    await db.certificates.insert_one(cert_doc)
    
    # Calcular días hasta expiración
    days_until_expiry = (cert_info["valid_to"] - datetime.now()).days
    
    return {
        "success": True,
        "certificate_info": {
            "subject": cert_info["subject"],
            "issuer": cert_info["issuer"],
            "valid_from": cert_info["valid_from"].isoformat(),
            "valid_to": cert_info["valid_to"].isoformat(),
            "days_until_expiry": days_until_expiry
        },
        "message": "Certificado cargado correctamente"
    }


@router.get("")
async def get_config(request: Request):
    """
    Obtiene la configuración completa del tenant
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    # Obtener tenant
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0, "file_data": 0})
    
    # Obtener config fiscal
    fiscal = await db.configs_fiscal.find_one({"tenant_id": tenant_id}, {"_id": 0})
    
    # Obtener certificado activo (sin file_data)
    certificate = await db.certificates.find_one(
        {"tenant_id": tenant_id, "is_active": True},
        {"_id": 0, "file_data": 0, "password_encrypted": 0}
    )
    
    # Determinar estado de configuración
    missing = []
    if not tenant:
        missing.append("emitter")
    if not fiscal:
        missing.append("fiscal")
    if not certificate:
        missing.append("certificate")
    
    is_configured = len(missing) == 0
    
    # Calcular días hasta expiración del certificado
    if certificate and certificate.get("certificate_info", {}).get("valid_to"):
        valid_to = certificate["certificate_info"]["valid_to"]
        if isinstance(valid_to, datetime):
            certificate["days_until_expiry"] = (valid_to - datetime.now()).days
    
    return {
        "emitter": tenant,
        "fiscal": fiscal,
        "certificate": certificate,
        "is_configured": is_configured,
        "missing_config": missing
    }


@router.delete("/certificate")
async def delete_certificate(request: Request):
    """
    Elimina el certificado activo del tenant
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    result = await db.certificates.delete_many({"tenant_id": tenant_id})
    
    return {
        "success": True,
        "deleted_count": result.deleted_count,
        "message": "Certificado(s) eliminado(s)"
    }
