"""
Rutas de Dashboard y Reportería
- Métricas generales
- Estadísticas de documentos
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional

from utils.security import get_current_user, require_permission

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("")
async def get_dashboard(
    request: Request,
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(require_permission("dashboard:read"))
):
    """
    Obtiene métricas del dashboard
    Si se especifica tenant_id, filtra por esa empresa
    """
    admin_db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    # Determinar empresas a consultar
    if tenant_id:
        tenant_ids = [tenant_id]
    elif "*" in current_user.get("permissions", []):
        # Admin ve todas
        tenants = await fe_db.tenants.find({"is_active": True}).to_list(1000)
        tenant_ids = [t["tenant_id"] for t in tenants]
    else:
        # Usuario normal ve solo sus empresas asignadas
        user_empresas = await admin_db.user_empresas.find(
            {"user_id": current_user["user_id"]}
        ).to_list(1000)
        tenant_ids = [ue["tenant_id"] for ue in user_empresas]
    
    if not tenant_ids:
        return {
            "total_empresas": 0,
            "total_documentos": 0,
            "documentos_hoy": 0,
            "documentos_mes": 0,
            "por_estado": {},
            "por_tipo": {},
            "integraciones_activas": 0
        }
    
    # Fechas
    now = datetime.now(timezone.utc)
    hoy_inicio = now.replace(hour=0, minute=0, second=0, microsecond=0)
    mes_inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Query base
    base_query = {"tenant_id": {"$in": tenant_ids}}
    
    # Total documentos
    total_docs = await fe_db.documents.count_documents(base_query)
    
    # Documentos hoy
    docs_hoy = await fe_db.documents.count_documents({
        **base_query,
        "created_at": {"$gte": hoy_inicio}
    })
    
    # Documentos este mes
    docs_mes = await fe_db.documents.count_documents({
        **base_query,
        "created_at": {"$gte": mes_inicio}
    })
    
    # Por estado
    pipeline_estado = [
        {"$match": base_query},
        {"$group": {"_id": "$sri_status", "count": {"$sum": 1}}}
    ]
    estados = {}
    async for doc in fe_db.documents.aggregate(pipeline_estado):
        estados[doc["_id"]] = doc["count"]
    
    # Por tipo
    pipeline_tipo = [
        {"$match": base_query},
        {"$group": {"_id": "$doc_type", "count": {"$sum": 1}}}
    ]
    tipos = {}
    tipo_nombres = {"01": "Facturas", "04": "Notas de Crédito", "05": "Notas de Débito"}
    async for doc in fe_db.documents.aggregate(pipeline_tipo):
        tipo_nombre = tipo_nombres.get(doc["_id"], doc["_id"])
        tipos[tipo_nombre] = doc["count"]
    
    # Integraciones activas
    integraciones = await admin_db.integrations.count_documents({
        "tenant_id": {"$in": tenant_ids},
        "is_active": True
    })
    
    # Total empresas
    total_empresas = len(tenant_ids)
    
    return {
        "total_empresas": total_empresas,
        "total_documentos": total_docs,
        "documentos_hoy": docs_hoy,
        "documentos_mes": docs_mes,
        "por_estado": estados,
        "por_tipo": tipos,
        "integraciones_activas": integraciones
    }


@router.get("/documentos")
async def get_documentos_stats(
    request: Request,
    tenant_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_permission("dashboard:read"))
):
    """
    Obtiene estadísticas de documentos por día
    """
    admin_db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    # Determinar empresas
    if tenant_id:
        tenant_ids = [tenant_id]
    elif "*" in current_user.get("permissions", []):
        tenants = await fe_db.tenants.find({"is_active": True}).to_list(1000)
        tenant_ids = [t["tenant_id"] for t in tenants]
    else:
        user_empresas = await admin_db.user_empresas.find(
            {"user_id": current_user["user_id"]}
        ).to_list(1000)
        tenant_ids = [ue["tenant_id"] for ue in user_empresas]
    
    # Fecha inicio
    now = datetime.now(timezone.utc)
    desde = now - timedelta(days=days)
    
    # Agregación por día
    pipeline = [
        {
            "$match": {
                "tenant_id": {"$in": tenant_ids},
                "created_at": {"$gte": desde}
            }
        },
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"}
                },
                "count": {"$sum": 1},
                "total": {"$sum": "$totals.total"}
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]
    
    stats = []
    async for doc in fe_db.documents.aggregate(pipeline):
        fecha = f"{doc['_id']['year']}-{str(doc['_id']['month']).zfill(2)}-{str(doc['_id']['day']).zfill(2)}"
        stats.append({
            "fecha": fecha,
            "documentos": doc["count"],
            "total": round(doc.get("total", 0), 2)
        })
    
    return {"stats": stats, "days": days}


@router.get("/empresas-resumen")
async def get_empresas_resumen(
    request: Request,
    current_user: dict = Depends(require_permission("dashboard:read"))
):
    """
    Resumen de empresas con sus métricas
    """
    admin_db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    # Determinar empresas
    if "*" in current_user.get("permissions", []):
        tenants = await fe_db.tenants.find({"is_active": True}).to_list(100)
    else:
        user_empresas = await admin_db.user_empresas.find(
            {"user_id": current_user["user_id"]}
        ).to_list(100)
        tenant_ids = [ue["tenant_id"] for ue in user_empresas]
        tenants = await fe_db.tenants.find({"tenant_id": {"$in": tenant_ids}}).to_list(100)
    
    resumen = []
    for tenant in tenants:
        tid = tenant["tenant_id"]
        
        # Contar documentos
        total_docs = await fe_db.documents.count_documents({"tenant_id": tid})
        docs_autorizados = await fe_db.documents.count_documents({
            "tenant_id": tid,
            "sri_status": "AUTORIZADO"
        })
        
        # Verificar certificado
        cert = await fe_db.certificates.find_one({"tenant_id": tid, "is_active": True})
        cert_status = "ok"
        cert_days = None
        if cert:
            valid_to = cert.get("certificate_info", {}).get("valid_to")
            if valid_to:
                cert_days = (valid_to - datetime.now()).days
                if cert_days < 0:
                    cert_status = "expired"
                elif cert_days < 30:
                    cert_status = "warning"
        else:
            cert_status = "missing"
        
        # Verificar integración
        integration = await admin_db.integrations.find_one({
            "tenant_id": tid,
            "is_active": True
        })
        
        resumen.append({
            "tenant_id": tid,
            "ruc": tenant["ruc"],
            "razon_social": tenant["razon_social"],
            "total_documentos": total_docs,
            "documentos_autorizados": docs_autorizados,
            "certificado_status": cert_status,
            "certificado_dias": cert_days,
            "tiene_integracion": integration is not None
        })
    
    return {"empresas": resumen}
