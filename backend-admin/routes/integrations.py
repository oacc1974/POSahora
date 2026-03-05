"""
Rutas de Integraciones
- Configuración de integraciones por empresa
- Loyverse: sincronización de ventas
"""
import os
import asyncio
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId
import uuid
import httpx

from models.integration import (
    IntegrationCreate, IntegrationUpdate, IntegrationResponse,
    SyncLogResponse, SyncRequest, IntegrationType, IntegrationStatus,
    LoyverseConfig
)
from utils.security import get_current_user, require_permission

router = APIRouter(prefix="/integrations", tags=["Integraciones"])

# Loyverse API Base URL
LOYVERSE_API_URL = "https://api.loyverse.com/v1.0"

# Backend FE URL (para crear facturas)
BACKEND_FE_URL = os.environ.get("BACKEND_FE_URL", "http://localhost:8000")


async def prepare_invoice_from_loyverse(receipt: dict, tenant_id: str, fe_db) -> Optional[dict]:
    """
    Convierte un recibo de Loyverse a formato de factura para backend-fe
    """
    # Obtener configuración de la empresa
    tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        return None
    
    # Obtener items del recibo
    line_items = receipt.get("line_items", [])
    if not line_items:
        return None
    
    # Preparar items para la factura
    items = []
    for item in line_items:
        # Calcular precio unitario (Loyverse puede enviar con descuento ya aplicado)
        quantity = float(item.get("quantity", 1))
        total_money = float(item.get("total_money", 0))
        discount_money = float(item.get("total_discount_money", 0))
        
        # Precio unitario antes de descuento
        if quantity > 0:
            unit_price = (total_money + discount_money) / quantity
        else:
            unit_price = 0
        
        items.append({
            "code": item.get("item_id", "PROD")[:25],
            "description": item.get("item_name", "Producto")[:300],
            "quantity": quantity,
            "unit_price": round(unit_price, 2),
            "discount": round(discount_money, 2),
            "iva_rate": 15  # IVA por defecto Ecuador
        })
    
    # Datos del cliente (consumidor final si no hay datos)
    customer = receipt.get("customer", {})
    customer_id = customer.get("id") if customer else None
    
    buyer_data = {
        "identification_type": "07",  # Consumidor final
        "identification": "9999999999999",
        "name": "CONSUMIDOR FINAL",
        "address": "S/N",
        "email": None,
        "phone": None
    }
    
    # Si hay cliente en Loyverse, intentar obtener sus datos
    if customer_id and customer:
        buyer_data["name"] = customer.get("name", "CONSUMIDOR FINAL")[:300]
        if customer.get("email"):
            buyer_data["email"] = customer.get("email")
        if customer.get("phone_number"):
            buyer_data["phone"] = customer.get("phone_number")
        # Si tiene identificación fiscal
        if customer.get("customer_code"):
            code = customer.get("customer_code", "")
            if len(code) == 13:
                buyer_data["identification_type"] = "04"  # RUC
                buyer_data["identification"] = code
            elif len(code) == 10:
                buyer_data["identification_type"] = "05"  # Cédula
                buyer_data["identification"] = code
    
    # Preparar pagos
    payments = []
    receipt_payments = receipt.get("payments", [])
    for payment in receipt_payments:
        payment_type = payment.get("payment_type_id", "")
        # Mapear tipos de pago de Loyverse a SRI
        # 01 = Efectivo, 19 = Tarjeta, 20 = Otros
        if "cash" in payment_type.lower():
            method = "01"
        elif "card" in payment_type.lower():
            method = "19"
        else:
            method = "20"
        
        payments.append({
            "method": method,
            "total": float(payment.get("money_amount", 0))
        })
    
    # Si no hay pagos, asumir efectivo
    if not payments:
        total = sum(float(item.get("total_money", 0)) for item in line_items)
        payments.append({
            "method": "01",
            "total": total
        })
    
    # Construir factura
    invoice = {
        "store_code": "001",
        "emission_point": "001",
        "customer": buyer_data,
        "items": items,
        "payments": payments
    }
    
    return invoice


@router.get("")
async def list_available_integrations(
    current_user: dict = Depends(get_current_user)
):
    """
    Lista las integraciones disponibles en el sistema
    """
    return {
        "integrations": [
            {
                "type": "loyverse",
                "name": "Loyverse POS",
                "description": "Sincroniza ventas desde Loyverse POS para generar facturas electrónicas",
                "logo": "https://loyverse.com/favicon.ico",
                "status": "available",
                "config_fields": [
                    {"name": "api_key", "type": "password", "required": True, "label": "API Key"},
                    {"name": "store_id", "type": "text", "required": False, "label": "ID de Tienda (opcional)"},
                    {"name": "sync_interval_minutes", "type": "number", "required": False, "label": "Intervalo de sincronización (minutos)", "default": 15},
                    {"name": "auto_sync", "type": "boolean", "required": False, "label": "Sincronización automática", "default": True}
                ]
            }
        ]
    }


@router.get("/empresa/{tenant_id}")
async def list_empresa_integrations(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("integrations:read"))
):
    """
    Lista las integraciones configuradas para una empresa
    """
    admin_db = request.app.state.admin_db
    
    cursor = admin_db.integrations.find({"tenant_id": tenant_id})
    
    integrations = []
    async for integration in cursor:
        integrations.append(IntegrationResponse(
            id=str(integration["_id"]),
            tenant_id=integration["tenant_id"],
            type=integration["type"],
            status=integration.get("status", "pending"),
            is_active=integration.get("is_active", False),
            last_sync=integration.get("last_sync"),
            last_error=integration.get("last_error"),
            created_at=integration["created_at"],
            updated_at=integration["updated_at"]
        ))
    
    return {"integrations": integrations}


@router.post("/loyverse/{tenant_id}")
async def configure_loyverse(
    request: Request,
    tenant_id: str,
    config: LoyverseConfig,
    current_user: dict = Depends(require_permission("integrations:write"))
):
    """
    Configura la integración con Loyverse para una empresa
    """
    admin_db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    # Verificar empresa existe
    tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Validar API Key con Loyverse
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{LOYVERSE_API_URL}/merchant",
                headers={"Authorization": f"Bearer {config.api_key}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400, 
                    detail="API Key de Loyverse inválida o sin permisos"
                )
            
            merchant_data = response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Loyverse: {str(e)}")
    
    now = datetime.now(timezone.utc)
    
    # Verificar si ya existe integración
    existing = await admin_db.integrations.find_one({
        "tenant_id": tenant_id,
        "type": "loyverse"
    })
    
    integration_data = {
        "tenant_id": tenant_id,
        "type": "loyverse",
        "config": {
            "api_key": config.api_key,
            "store_id": config.store_id,
            "sync_interval_minutes": config.sync_interval_minutes,
            "auto_sync": config.auto_sync,
            "sync_from_date": config.sync_from_date
        },
        "merchant_info": {
            "id": merchant_data.get("id"),
            "name": merchant_data.get("name"),
            "email": merchant_data.get("email")
        },
        "status": "active",
        "is_active": True,
        "updated_at": now,
        "updated_by": current_user["user_id"]
    }
    
    if existing:
        await admin_db.integrations.update_one(
            {"_id": existing["_id"]},
            {"$set": integration_data}
        )
        integration_id = str(existing["_id"])
    else:
        integration_data["_id"] = str(uuid.uuid4())
        integration_data["created_at"] = now
        await admin_db.integrations.insert_one(integration_data)
        integration_id = integration_data["_id"]
    
    return {
        "success": True,
        "integration_id": integration_id,
        "merchant": {
            "name": merchant_data.get("name"),
            "email": merchant_data.get("email")
        },
        "message": "Integración con Loyverse configurada correctamente"
    }


@router.get("/loyverse/{tenant_id}/status")
async def get_loyverse_status(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("integrations:read"))
):
    """
    Obtiene el estado de la integración Loyverse
    """
    admin_db = request.app.state.admin_db
    
    integration = await admin_db.integrations.find_one({
        "tenant_id": tenant_id,
        "type": "loyverse"
    })
    
    if not integration:
        return {
            "configured": False,
            "status": "not_configured",
            "message": "Integración no configurada"
        }
    
    # Verificar conexión actual
    api_key = integration.get("config", {}).get("api_key")
    connection_ok = False
    
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{LOYVERSE_API_URL}/merchant",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                connection_ok = response.status_code == 200
        except:
            connection_ok = False
    
    # Obtener últimos logs de sincronización
    last_logs = await admin_db.sync_logs.find(
        {"integration_id": str(integration["_id"])}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "configured": True,
        "status": integration.get("status", "unknown"),
        "is_active": integration.get("is_active", False),
        "connection_ok": connection_ok,
        "merchant": integration.get("merchant_info", {}),
        "last_sync": integration.get("last_sync"),
        "last_error": integration.get("last_error"),
        "sync_interval_minutes": integration.get("config", {}).get("sync_interval_minutes", 15),
        "auto_sync": integration.get("config", {}).get("auto_sync", False),
        "recent_logs": [
            {
                "id": str(log["_id"]),
                "status": log["status"],
                "records_processed": log.get("records_processed", 0),
                "records_success": log.get("records_success", 0),
                "created_at": log["created_at"]
            }
            for log in last_logs
        ]
    }


@router.post("/loyverse/{tenant_id}/sync")
async def sync_loyverse_sales(
    request: Request,
    tenant_id: str,
    sync_request: Optional[SyncRequest] = None,
    current_user: dict = Depends(require_permission("integrations:write"))
):
    """
    Sincroniza ventas de Loyverse y genera facturas
    """
    admin_db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    # Obtener integración
    integration = await admin_db.integrations.find_one({
        "tenant_id": tenant_id,
        "type": "loyverse",
        "is_active": True
    })
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integración Loyverse no configurada o inactiva")
    
    api_key = integration.get("config", {}).get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key no configurada")
    
    # Determinar rango de fechas
    now = datetime.now(timezone.utc)
    
    if sync_request and sync_request.from_date:
        from_date = sync_request.from_date
    elif integration.get("last_sync"):
        from_date = integration["last_sync"]
    else:
        from_date = now - timedelta(days=1)
    
    to_date = sync_request.to_date if sync_request and sync_request.to_date else now
    
    # Crear log de sincronización
    sync_log_id = str(uuid.uuid4())
    sync_log = {
        "_id": sync_log_id,
        "integration_id": str(integration["_id"]),
        "tenant_id": tenant_id,
        "status": "running",
        "records_processed": 0,
        "records_success": 0,
        "records_failed": 0,
        "errors": [],
        "started_at": now,
        "created_at": now
    }
    await admin_db.sync_logs.insert_one(sync_log)
    
    try:
        # Obtener recibos de Loyverse
        receipts = []
        cursor = None
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                params = {
                    "created_at_min": from_date.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    "created_at_max": to_date.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    "limit": 250
                }
                if cursor:
                    params["cursor"] = cursor
                
                response = await client.get(
                    f"{LOYVERSE_API_URL}/receipts",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params=params
                )
                
                if response.status_code != 200:
                    raise Exception(f"Error obteniendo recibos: {response.text}")
                
                data = response.json()
                receipts.extend(data.get("receipts", []))
                
                cursor = data.get("cursor")
                if not cursor:
                    break
        
        records_processed = len(receipts)
        records_success = 0
        records_failed = 0
        errors = []
        
        # Procesar cada recibo y crear factura
        for receipt in receipts:
            try:
                # Verificar si ya fue procesado
                existing_doc = await fe_db.documents.find_one({
                    "tenant_id": tenant_id,
                    "external_reference": f"loyverse:{receipt['receipt_number']}"
                })
                
                if existing_doc:
                    continue  # Ya procesado
                
                # Preparar datos para factura desde recibo Loyverse
                invoice_data = await prepare_invoice_from_loyverse(receipt, tenant_id, fe_db)
                
                if invoice_data:
                    # Llamar a backend-fe para crear la factura con retry
                    max_retries = 3
                    for attempt in range(max_retries):
                        async with httpx.AsyncClient(timeout=60.0) as fe_client:
                            fe_response = await fe_client.post(
                                f"{BACKEND_FE_URL}/fe/documents/invoice",
                                json=invoice_data,
                                headers={"X-Tenant-ID": tenant_id}
                            )
                            
                            if fe_response.status_code in [200, 201]:
                                # Marcar como procesado guardando referencia
                                result = fe_response.json()
                                await fe_db.documents.update_one(
                                    {"_id": result.get("document_id")},
                                    {"$set": {"external_reference": f"loyverse:{receipt['receipt_number']}"}}
                                )
                                records_success += 1
                                break
                            elif fe_response.status_code == 429:
                                # Rate limited, esperar y reintentar
                                if attempt < max_retries - 1:
                                    await asyncio.sleep(5 * (attempt + 1))
                                    continue
                                else:
                                    raise Exception(f"Rate limit excedido después de {max_retries} intentos")
                            else:
                                raise Exception(f"Error creando factura: {fe_response.text}")
                else:
                    # Recibo sin items válidos, saltar
                    continue
                
            except Exception as e:
                records_failed += 1
                errors.append({
                    "receipt_number": receipt.get("receipt_number"),
                    "error": str(e)
                })
        
        # Actualizar log
        await admin_db.sync_logs.update_one(
            {"_id": sync_log_id},
            {"$set": {
                "status": "completed",
                "records_processed": records_processed,
                "records_success": records_success,
                "records_failed": records_failed,
                "errors": errors[:10],  # Limitar errores guardados
                "completed_at": datetime.now(timezone.utc)
            }}
        )
        
        # Actualizar última sincronización
        # Si hubo fallos, retroceder last_sync 1 hora para no perder recibos
        effective_last_sync = now if records_failed == 0 else (now - timedelta(hours=1))
        await admin_db.integrations.update_one(
            {"_id": integration["_id"]},
            {"$set": {
                "last_sync": effective_last_sync,
                "last_error": None if records_failed == 0 else f"{records_failed} errores",
                "status": "active"
            }}
        )
        
        return {
            "success": True,
            "sync_log_id": sync_log_id,
            "records_processed": records_processed,
            "records_success": records_success,
            "records_failed": records_failed,
            "message": f"Sincronización completada: {records_success}/{records_processed} exitosos"
        }
        
    except Exception as e:
        # Actualizar log con error
        await admin_db.sync_logs.update_one(
            {"_id": sync_log_id},
            {"$set": {
                "status": "error",
                "error_message": str(e),
                "completed_at": datetime.now(timezone.utc)
            }}
        )
        
        # Actualizar integración
        await admin_db.integrations.update_one(
            {"_id": integration["_id"]},
            {"$set": {
                "last_error": str(e),
                "status": "error"
            }}
        )
        
        raise HTTPException(status_code=500, detail=f"Error en sincronización: {str(e)}")


@router.delete("/loyverse/{tenant_id}")
async def delete_loyverse_integration(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("integrations:write"))
):
    """
    Elimina la integración Loyverse de una empresa
    """
    admin_db = request.app.state.admin_db
    
    result = await admin_db.integrations.delete_one({
        "tenant_id": tenant_id,
        "type": "loyverse"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Integración no encontrada")
    
    return {
        "success": True,
        "message": "Integración eliminada"
    }


@router.get("/sync-logs/{tenant_id}")
async def get_sync_logs(
    request: Request,
    tenant_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_permission("integrations:read"))
):
    """
    Obtiene los logs de sincronización de una empresa
    """
    admin_db = request.app.state.admin_db
    
    query = {"tenant_id": tenant_id}
    total = await admin_db.sync_logs.count_documents(query)
    
    skip = (page - 1) * limit
    cursor = admin_db.sync_logs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    logs = []
    async for log in cursor:
        logs.append(SyncLogResponse(
            id=str(log["_id"]),
            integration_id=log["integration_id"],
            tenant_id=log["tenant_id"],
            status=log["status"],
            records_processed=log.get("records_processed", 0),
            records_success=log.get("records_success", 0),
            records_failed=log.get("records_failed", 0),
            error_message=log.get("error_message"),
            started_at=log["started_at"],
            completed_at=log.get("completed_at")
        ))
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
