"""
Rutas de Gestión de Empresas (Tenants)
- CRUD empresas
- Configuración fiscal
- Certificados
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query, UploadFile, File, Form
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
import uuid

from models.empresa import EmpresaCreate, EmpresaUpdate, EmpresaResponse, EmpresaListResponse
from utils.security import get_current_user, require_permission

router = APIRouter(prefix="/empresas", tags=["Empresas"])


def validate_ruc(ruc: str) -> tuple:
    """Valida RUC ecuatoriano"""
    if not ruc or not ruc.isdigit() or len(ruc) != 13:
        return False, "RUC debe tener 13 dígitos"
    if not ruc.endswith("001"):
        return False, "RUC debe terminar en 001"
    provincia = int(ruc[:2])
    if provincia < 1 or (provincia > 24 and provincia != 30):
        return False, "Código de provincia inválido"
    return True, "OK"


@router.get("", response_model=EmpresaListResponse)
async def list_empresas(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    current_user: dict = Depends(require_permission("empresas:read"))
):
    """
    Lista empresas con filtros y paginación
    Solo muestra empresas asignadas al usuario (excepto admin)
    """
    admin_db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    query = {"is_active": True}
    
    # Si no es admin, filtrar por empresas asignadas
    if "*" not in current_user.get("permissions", []):
        user_empresas = await admin_db.user_empresas.find(
            {"user_id": current_user["user_id"]}
        ).to_list(1000)
        tenant_ids = [ue["tenant_id"] for ue in user_empresas]
        query["tenant_id"] = {"$in": tenant_ids}
    
    if search:
        query["$or"] = [
            {"ruc": {"$regex": search, "$options": "i"}},
            {"razon_social": {"$regex": search, "$options": "i"}},
            {"nombre_comercial": {"$regex": search, "$options": "i"}}
        ]
    
    total = await fe_db.tenants.count_documents(query)
    skip = (page - 1) * limit
    
    cursor = fe_db.tenants.find(query).skip(skip).limit(limit).sort("created_at", -1)
    
    empresas = []
    async for tenant in cursor:
        # Obtener config fiscal
        config = await fe_db.configs_fiscal.find_one({"tenant_id": tenant["tenant_id"]})
        
        # Verificar certificado
        cert = await fe_db.certificates.find_one({"tenant_id": tenant["tenant_id"], "is_active": True})
        has_cert = cert is not None
        cert_expires = None
        if cert and cert.get("certificate_info", {}).get("valid_to"):
            cert_expires = cert["certificate_info"]["valid_to"]
        
        empresas.append(EmpresaResponse(
            tenant_id=tenant["tenant_id"],
            ruc=tenant["ruc"],
            razon_social=tenant["razon_social"],
            nombre_comercial=tenant.get("nombre_comercial"),
            direccion=tenant.get("address", {}).get("direccion", ""),
            telefono=tenant.get("phone"),
            email=tenant.get("email", ""),
            ambiente=config.get("ambiente", "pruebas") if config else "pruebas",
            obligado_contabilidad=config.get("obligado_contabilidad", "NO") if config else "NO",
            is_active=tenant.get("is_active", True),
            has_certificate=has_cert,
            certificate_expires=cert_expires,
            created_at=tenant.get("created_at", datetime.now(timezone.utc))
        ))
    
    pages = (total + limit - 1) // limit
    
    return EmpresaListResponse(
        empresas=empresas,
        total=total,
        page=page,
        pages=pages
    )


@router.get("/{tenant_id}", response_model=EmpresaResponse)
async def get_empresa(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("empresas:read"))
):
    """
    Obtiene detalle de una empresa
    """
    fe_db = request.app.state.fe_db
    
    tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    config = await fe_db.configs_fiscal.find_one({"tenant_id": tenant_id})
    cert = await fe_db.certificates.find_one({"tenant_id": tenant_id, "is_active": True})
    
    return EmpresaResponse(
        tenant_id=tenant["tenant_id"],
        ruc=tenant["ruc"],
        razon_social=tenant["razon_social"],
        nombre_comercial=tenant.get("nombre_comercial"),
        direccion=tenant.get("address", {}).get("direccion", ""),
        telefono=tenant.get("phone"),
        email=tenant.get("email", ""),
        ambiente=config.get("ambiente", "pruebas") if config else "pruebas",
        obligado_contabilidad=config.get("obligado_contabilidad", "NO") if config else "NO",
        is_active=tenant.get("is_active", True),
        has_certificate=cert is not None,
        certificate_expires=cert["certificate_info"]["valid_to"] if cert else None,
        created_at=tenant.get("created_at", datetime.now(timezone.utc))
    )


@router.post("", response_model=EmpresaResponse)
async def create_empresa(
    request: Request,
    empresa: EmpresaCreate,
    current_user: dict = Depends(require_permission("empresas:write"))
):
    """
    Crea una nueva empresa en fe_db
    """
    fe_db = request.app.state.fe_db
    admin_db = request.app.state.admin_db
    
    # Validar RUC
    valid, msg = validate_ruc(empresa.ruc)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    # Verificar RUC único
    existing = await fe_db.tenants.find_one({"ruc": empresa.ruc})
    if existing:
        raise HTTPException(status_code=400, detail="RUC ya registrado")
    
    now = datetime.now(timezone.utc)
    tenant_id = str(uuid.uuid4())
    
    # Crear tenant en fe_db
    tenant_doc = {
        "_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "ruc": empresa.ruc,
        "razon_social": empresa.razon_social,
        "nombre_comercial": empresa.nombre_comercial,
        "email": empresa.email,
        "phone": empresa.telefono,
        "address": {"direccion": empresa.direccion},
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await fe_db.tenants.insert_one(tenant_doc)
    
    # Crear store
    await fe_db.stores.insert_one({
        "_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "store_code": empresa.establecimiento,
        "emission_point": empresa.punto_emision,
        "name": f"Establecimiento {empresa.establecimiento}",
        "address": empresa.direccion,
        "phone": empresa.telefono,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    })
    
    # Crear config fiscal
    await fe_db.configs_fiscal.insert_one({
        "_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "ambiente": empresa.ambiente,
        "obligado_contabilidad": empresa.obligado_contabilidad,
        "tipo_contribuyente": empresa.tipo_contribuyente,
        "agente_retencion": empresa.agente_retencion,
        "config": {
            "iva_default": 15,
            "moneda": "DOLAR",
            "decimales": 2,
            "incluir_iva_precio": False
        },
        "sri_endpoints": {
            "recepcion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl" if empresa.ambiente == "pruebas" else "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
            "autorizacion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl" if empresa.ambiente == "pruebas" else "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
        },
        "is_configured": True,
        "created_at": now,
        "updated_at": now
    })
    
    # Asignar empresa al usuario creador
    await admin_db.user_empresas.insert_one({
        "user_id": current_user["user_id"],
        "tenant_id": tenant_id,
        "assigned_at": now,
        "assigned_by": current_user["user_id"]
    })
    
    return EmpresaResponse(
        tenant_id=tenant_id,
        ruc=empresa.ruc,
        razon_social=empresa.razon_social,
        nombre_comercial=empresa.nombre_comercial,
        direccion=empresa.direccion,
        telefono=empresa.telefono,
        email=empresa.email,
        ambiente=empresa.ambiente,
        obligado_contabilidad=empresa.obligado_contabilidad,
        is_active=True,
        has_certificate=False,
        certificate_expires=None,
        created_at=now
    )


@router.put("/{tenant_id}", response_model=EmpresaResponse)
async def update_empresa(
    request: Request,
    tenant_id: str,
    empresa: EmpresaUpdate,
    current_user: dict = Depends(require_permission("empresas:write"))
):
    """
    Actualiza una empresa existente
    """
    fe_db = request.app.state.fe_db
    
    tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    now = datetime.now(timezone.utc)
    
    # Actualizar tenant
    tenant_update = {"updated_at": now}
    if empresa.razon_social:
        tenant_update["razon_social"] = empresa.razon_social
    if empresa.nombre_comercial is not None:
        tenant_update["nombre_comercial"] = empresa.nombre_comercial
    if empresa.direccion:
        tenant_update["address"] = {"direccion": empresa.direccion}
    if empresa.telefono is not None:
        tenant_update["phone"] = empresa.telefono
    if empresa.email:
        tenant_update["email"] = empresa.email
    
    await fe_db.tenants.update_one({"tenant_id": tenant_id}, {"$set": tenant_update})
    
    # Actualizar config fiscal si hay cambios
    config_update = {"updated_at": now}
    if empresa.ambiente:
        config_update["ambiente"] = empresa.ambiente
        config_update["sri_endpoints"] = {
            "recepcion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl" if empresa.ambiente == "pruebas" else "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
            "autorizacion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl" if empresa.ambiente == "pruebas" else "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
        }
    if empresa.obligado_contabilidad:
        config_update["obligado_contabilidad"] = empresa.obligado_contabilidad
    if empresa.tipo_contribuyente is not None:
        config_update["tipo_contribuyente"] = empresa.tipo_contribuyente
    if empresa.agente_retencion is not None:
        config_update["agente_retencion"] = empresa.agente_retencion
    
    await fe_db.configs_fiscal.update_one({"tenant_id": tenant_id}, {"$set": config_update})
    
    # Obtener datos actualizados
    return await get_empresa(request, tenant_id, current_user)


@router.post("/{tenant_id}/certificate")
async def upload_certificate(
    request: Request,
    tenant_id: str,
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: dict = Depends(require_permission("empresas:write"))
):
    """
    Sube certificado .p12 para una empresa
    Usa la misma lógica que backend-fe
    """
    fe_db = request.app.state.fe_db
    
    # Verificar empresa existe
    tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Validar extensión
    if not file.filename.endswith('.p12'):
        raise HTTPException(status_code=400, detail="El archivo debe ser .p12")
    
    # Leer contenido
    file_data = await file.read()
    
    if len(file_data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx 10MB)")
    
    # Validar certificado
    try:
        from cryptography.hazmat.primitives.serialization import pkcs12
        from cryptography.hazmat.backends import default_backend
        
        private_key, certificate, _ = pkcs12.load_key_and_certificates(
            file_data, password.encode(), default_backend()
        )
        
        # Extraer info del certificado
        subject_parts = []
        for attr in certificate.subject:
            try:
                subject_parts.append(f"{attr.oid._name}={attr.value}")
            except:
                subject_parts.append(f"{attr.oid.dotted_string}={attr.value}")
        
        issuer_parts = []
        for attr in certificate.issuer:
            try:
                issuer_parts.append(f"{attr.oid._name}={attr.value}")
            except:
                issuer_parts.append(f"{attr.oid.dotted_string}={attr.value}")
        
        cert_info = {
            "subject": ", ".join(subject_parts),
            "issuer": ", ".join(issuer_parts),
            "serial_number": str(certificate.serial_number),
            "valid_from": certificate.not_valid_before,
            "valid_to": certificate.not_valid_after
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error al cargar certificado: {str(e)}. Verifique la contraseña."
        )
    
    # Verificar no expirado
    if cert_info["valid_to"] < datetime.now():
        raise HTTPException(status_code=400, detail="El certificado está expirado")
    
    now = datetime.now(timezone.utc)
    
    # Desactivar certificados anteriores
    await fe_db.certificates.update_many(
        {"tenant_id": tenant_id},
        {"$set": {"is_active": False}}
    )
    
    # Encriptar contraseña (misma lógica que backend-fe)
    import os
    import base64
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    
    encryption_key = os.environ.get("ENCRYPTION_KEY", "fe-encryption-key-32-bytes-here!")
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'fe_salt_constant_2026',
        iterations=100000,
        backend=default_backend()
    )
    fernet_key = base64.urlsafe_b64encode(kdf.derive(encryption_key.encode()))
    f = Fernet(fernet_key)
    password_encrypted = f.encrypt(password.encode()).decode()
    
    # Guardar certificado
    cert_doc = {
        "_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "file_data": file_data,
        "password_encrypted": password_encrypted,
        "certificate_info": cert_info,
        "is_active": True,
        "uploaded_at": now,
        "uploaded_by": current_user["user_id"]
    }
    
    await fe_db.certificates.insert_one(cert_doc)
    
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


@router.delete("/{tenant_id}/certificate")
async def delete_certificate(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("empresas:write"))
):
    """
    Elimina el certificado activo de una empresa
    """
    fe_db = request.app.state.fe_db
    
    result = await fe_db.certificates.delete_many({"tenant_id": tenant_id})
    
    return {
        "success": True,
        "deleted_count": result.deleted_count,
        "message": "Certificado(s) eliminado(s)"
    }
