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


async def wake_up_backend_fe(url: str, max_wait_seconds: int = 90) -> bool:
    """
    Despierta backend-fe (Render Free Tier duerme tras inactividad).
    Llama al health endpoint hasta que responda 200.
    """
    print(f"[Sync] Despertando backend-fe en {url}...")
    for attempt in range(max_wait_seconds // 5):
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{url}/fe/health")
                if resp.status_code == 200:
                    print(f"[Sync] backend-fe listo tras {attempt * 5}s")
                    return True
        except Exception:
            pass
        await asyncio.sleep(5)
    print(f"[Sync] backend-fe no respondio en {max_wait_seconds}s")
    return False

# Backend FE URL (para crear facturas)
BACKEND_FE_URL = os.environ.get("BACKEND_FE_URL", "http://localhost:8000")


async def prepare_invoice_from_loyverse(receipt: dict, tenant_id: str, fe_db) -> Optional[dict]:
    """
    Convierte un recibo de Loyverse a formato de factura para backend-fe
    """
    # Obtener configuración de la empresa
    tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
    if tenant is None:
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
    # Loyverse API devuelve customer_id como campo top-level (string), NO un objeto customer
    customer_id = receipt.get("customer_id")
    
    buyer_data = {
        "identification_type": "07",  # Consumidor final
        "identification": "9999999999999",
        "name": "CONSUMIDOR FINAL",
        "address": "S/N",
        "email": None,
        "phone": None
    }
    
    # Si hay cliente en Loyverse, obtener sus datos via API
    if customer_id and fe_db is not None:
        try:
            customer_doc = await fe_db.customers.find_one({"loyverse_id": customer_id})
            if customer_doc is not None:
                buyer_data["name"] = customer_doc.get("name", "CONSUMIDOR FINAL")[:300]
                if customer_doc.get("email"):
                    buyer_data["email"] = customer_doc.get("email")
                if customer_doc.get("phone"):
                    buyer_data["phone"] = customer_doc.get("phone")
                if customer_doc.get("identification"):
                    code = customer_doc["identification"]
                    if len(code) == 13:
                        buyer_data["identification_type"] = "04"  # RUC
                        buyer_data["identification"] = code
                    elif len(code) == 10:
                        buyer_data["identification_type"] = "05"  # Cédula
                        buyer_data["identification"] = code
        except Exception:
            pass  # Si falla, usar consumidor final
    
    # Preparar pagos
    payments = []
    receipt_payments = receipt.get("payments", [])
    for payment in receipt_payments:
        # Loyverse API: cada payment tiene 'name' (ej: "Cash", "Card") y 'type' (ej: "CASH", "CARD")
        payment_name = (payment.get("name", "") or payment.get("type", "")).lower()
        if any(k in payment_name for k in ["efectivo", "cash", "dinero"]):
            method = "01"
        elif any(k in payment_name for k in ["tarjeta", "card", "crédito", "débito", "credito", "debito"]):
            method = "19"
        elif any(k in payment_name for k in ["transferencia", "transfer"]):
            method = "20"
        else:
            method = "01"  # Por defecto: sin utilización del sistema financiero
        
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


@router.get("/loyverse/{tenant_id}/test-api")
async def test_loyverse_api(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("integrations:write"))
):
    """
    Endpoint de diagnóstico: llama a Loyverse API sin filtros de fecha
    para verificar que la API key funciona y devuelve recibos.
    """
    admin_db = request.app.state.admin_db
    integration = await admin_db.integrations.find_one({
        "tenant_id": tenant_id,
        "type": "loyverse",
        "is_active": True
    })
    if not integration:
        raise HTTPException(status_code=404, detail="Integración Loyverse no configurada")
    
    api_key = integration.get("config", {}).get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key no configurada")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Filtrar solo últimas 24 horas (Loyverse gratis no permite más de 31 días)
            from_date_test = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            response = await client.get(
                f"{LOYVERSE_API_URL}/receipts",
                headers={"Authorization": f"Bearer {api_key}"},
                params={"limit": 50, "created_at_min": from_date_test}
            )
            
            raw_body = response.json()
            response_keys = list(raw_body.keys())
            
            # Detectar errores de Loyverse API
            if "errors" in raw_body:
                loyverse_errors = raw_body["errors"]
                error_details = []
                for err in loyverse_errors:
                    if isinstance(err, dict):
                        error_details.append(f"{err.get('code', '?')}: {err.get('details', err.get('message', str(err)))}")
                    else:
                        error_details.append(str(err))
                return {
                    "status": "api_error",
                    "http_status": response.status_code,
                    "loyverse_errors": error_details,
                    "message": f"Loyverse devolvió error: {'; '.join(error_details)}. Verifica que la API Key tenga permiso RECEIPTS_READ.",
                    "api_key_preview": f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***",
                    "last_sync": integration.get("last_sync"),
                }
            
            receipts = raw_body.get("receipts", [])
            
            # Mostrar info del primer recibo si existe
            first_receipt = None
            if receipts:
                r = receipts[0]
                first_receipt = {
                    "receipt_number": r.get("receipt_number"),
                    "receipt_type": r.get("receipt_type"),
                    "created_at": r.get("created_at"),
                    "total_money": r.get("total_money"),
                    "customer_id": r.get("customer_id"),
                    "line_items_count": len(r.get("line_items", [])),
                    "payments_count": len(r.get("payments", [])),
                    "payment_fields": list(r["payments"][0].keys()) if r.get("payments") else [],
                }
            
            return {
                "status": "ok",
                "http_status": response.status_code,
                "response_keys": response_keys,
                "receipts_count": len(receipts),
                "first_receipt_preview": first_receipt,
                "last_sync": integration.get("last_sync"),
                "message": f"API OK. {len(receipts)} recibos encontrados." + (f" Primer recibo: #{first_receipt['receipt_number']}" if first_receipt else ""),
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "api_url": f"{LOYVERSE_API_URL}/receipts"
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
    
    # Parsear from_date del body
    has_custom_date = False
    if sync_request and sync_request.from_date:
        from_date = sync_request.from_date
        has_custom_date = True
        print(f"[Sync] Usando from_date del request: {from_date}")
    elif integration.get("last_sync"):
        from_date = integration["last_sync"]
        print(f"[Sync] Usando last_sync: {from_date}")
    else:
        from_date = now - timedelta(days=1)
        print(f"[Sync] Sin last_sync, usando 1 día atrás: {from_date}")
    
    to_date = sync_request.to_date if sync_request and sync_request.to_date else now
    
    # Asegurar que from_date sea timezone-aware (UTC)
    if from_date.tzinfo is None:
        from_date = from_date.replace(tzinfo=timezone.utc)
    if to_date.tzinfo is None:
        to_date = to_date.replace(tzinfo=timezone.utc)
    
    # Protección: Loyverse gratis no permite más de 30 días atrás
    max_days_back = now - timedelta(days=30)
    if from_date < max_days_back:
        print(f"[Sync] from_date {from_date.isoformat()} es más de 30 días atrás, ajustando a {max_days_back.isoformat()}")
        from_date = max_days_back
    
    print(f"[Sync] Rango: {from_date.isoformat()} -> {to_date.isoformat()}")
    
    # Limpiar syncs anteriores que quedaron en "running" (stuck)
    await admin_db.sync_logs.update_many(
        {"tenant_id": tenant_id, "status": "running"},
        {"$set": {"status": "failed", "errors": ["Cancelado: nueva sincronización iniciada"]}}
    )
    
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
        
        # Usar isoformat para fechas (más robusto que strftime manual)
        from_date_str = from_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        to_date_str = to_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
        print(f"[Sync] Llamando Loyverse API: created_at_min={from_date_str}, created_at_max={to_date_str}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                params = {
                    "created_at_min": from_date_str,
                    "created_at_max": to_date_str,
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
                    raise Exception(f"Error obteniendo recibos de Loyverse (HTTP {response.status_code}): {response.text}")
                
                data = response.json()
                response_keys = list(data.keys())
                print(f"[Sync] Loyverse response keys: {response_keys}")
                
                batch = data.get("receipts", [])
                # Si no hay receipts, buscar en otras claves (por si la API cambió)
                if not batch:
                    for key in response_keys:
                        if isinstance(data[key], list) and len(data[key]) > 0:
                            first_item = data[key][0]
                            if isinstance(first_item, dict) and "receipt_number" in first_item:
                                print(f"[Sync] Recibos encontrados bajo clave '{key}' en vez de 'receipts'!")
                                batch = data[key]
                                break
                
                print(f"[Sync] Loyverse devolvió {len(batch)} recibos en este lote")
                receipts.extend(batch)
                
                cursor = data.get("cursor")
                if not cursor:
                    break
        
        # Si no hay recibos con filtro de fecha, intentar SIN filtro como diagnóstico
        if not receipts and has_custom_date:
            print(f"[Sync] 0 recibos con filtro de fecha. Probando SIN filtro...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                test_response = await client.get(
                    f"{LOYVERSE_API_URL}/receipts",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={"limit": 10}
                )
                if test_response.status_code == 200:
                    test_data = test_response.json()
                    test_keys = list(test_data.keys())
                    test_receipts = test_data.get("receipts", [])
                    if not test_receipts:
                        for key in test_keys:
                            if isinstance(test_data[key], list):
                                test_receipts = test_data[key]
                                break
                    print(f"[Sync] SIN filtro: keys={test_keys}, recibos={len(test_receipts)}")
                    if test_receipts:
                        first = test_receipts[0]
                        print(f"[Sync] Primer recibo: number={first.get('receipt_number')}, created_at={first.get('created_at')}")
                else:
                    print(f"[Sync] Test sin filtro falló: HTTP {test_response.status_code}")
        
        # Filtrar solo ventas (excluir reembolsos)
        all_receipts = receipts
        receipts = [r for r in all_receipts if r.get("receipt_type", "SALE") == "SALE"]
        skipped_refunds = len(all_receipts) - len(receipts)
        
        print(f"[Sync] Total recibos Loyverse: {len(all_receipts)}, ventas: {len(receipts)}, reembolsos omitidos: {skipped_refunds}")
        
        records_processed = len(receipts)
        records_success = 0
        records_failed = 0
        records_skipped = 0
        errors = []
        
        # Despertar backend-fe antes de procesar (cold start de Render)
        if receipts:
            await wake_up_backend_fe(BACKEND_FE_URL)
        
        # Procesar cada recibo y crear factura
        for receipt in receipts:
            try:
                # Verificar si ya fue procesado
                existing_doc = await fe_db.documents.find_one({
                    "tenant_id": tenant_id,
                    "external_reference": f"loyverse:{receipt['receipt_number']}"
                })
                
                if existing_doc is not None:
                    records_skipped += 1
                    print(f"[Sync] Recibo {receipt['receipt_number']} ya existe, saltando")
                    continue  # Ya procesado
                
                # Preparar datos para factura desde recibo Loyverse
                invoice_data = await prepare_invoice_from_loyverse(receipt, tenant_id, fe_db)
                
                if invoice_data is not None:
                    # Pausa entre cada recibo para no saturar backend-fe
                    await asyncio.sleep(3)
                    
                    # Llamar a backend-fe para crear la factura con retry
                    max_retries = 5
                    retry_delays = [15, 30, 60, 90, 120]  # espera progresiva
                    created = False
                    for attempt in range(max_retries):
                        async with httpx.AsyncClient(timeout=120.0) as fe_client:
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
                                created = True
                                break
                            elif fe_response.status_code == 429:
                                # Rate limited, esperar tiempo progresivo y reintentar
                                wait_time = retry_delays[attempt] if attempt < len(retry_delays) else 120
                                if attempt < max_retries - 1:
                                    await asyncio.sleep(wait_time)
                                    continue
                                else:
                                    raise Exception(f"Rate limit excedido después de {max_retries} intentos ({sum(retry_delays[:max_retries])}s de espera total)")
                            else:
                                raise Exception(f"Error creando factura: {fe_response.text}")
                    
                    if not created and not any(True for _ in []):
                        pass  # excepción ya fue lanzada arriba
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
        
        message_parts = [f"Sincronización completada: {records_success}/{records_processed} exitosos"]
        if records_skipped > 0:
            message_parts.append(f"{records_skipped} ya existían")
        if skipped_refunds > 0:
            message_parts.append(f"{skipped_refunds} reembolsos omitidos")
        if records_failed > 0:
            message_parts.append(f"{records_failed} fallidos")
        
        return {
            "success": True,
            "sync_log_id": sync_log_id,
            "records_processed": records_processed,
            "records_success": records_success,
            "records_failed": records_failed,
            "records_skipped": records_skipped,
            "message": ", ".join(message_parts),
            "debug": {
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat(),
                "custom_date_used": has_custom_date,
                "loyverse_total_receipts": len(all_receipts),
                "loyverse_sales": len(receipts),
                "loyverse_refunds_skipped": skipped_refunds,
                "errors": errors[:5]
            }
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
