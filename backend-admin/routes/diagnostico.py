"""
Rutas de diagnóstico para debugging
"""
from fastapi import APIRouter, Request, Depends
from utils.security import require_permission

router = APIRouter(prefix="/diagnostico", tags=["Diagnóstico"])


@router.get("/sync-logs/{tenant_id}")
async def get_sync_logs(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("integrations:read"))
):
    """
    Obtiene los logs de sincronización de una empresa
    """
    admin_db = request.app.state.admin_db
    
    logs = await admin_db.sync_logs.find(
        {"tenant_id": tenant_id}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "logs": [
            {
                "id": str(log["_id"]),
                "status": log.get("status"),
                "records_processed": log.get("records_processed", 0),
                "records_success": log.get("records_success", 0),
                "records_failed": log.get("records_failed", 0),
                "errors": log.get("errors", []),
                "created_at": log.get("created_at"),
                "completed_at": log.get("completed_at")
            }
            for log in logs
        ]
    }


@router.get("/stats/{tenant_id}")
async def get_db_stats(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Obtiene estadísticas de documentos de una empresa
    """
    fe_db = request.app.state.fe_db
    
    # Contar por estado
    total = await fe_db.documents.count_documents({"tenant_id": tenant_id})
    authorized = await fe_db.documents.count_documents({"tenant_id": tenant_id, "status": "AUTORIZADO"})
    pending = await fe_db.documents.count_documents({"tenant_id": tenant_id, "status": {"$in": ["PENDIENTE", "RECIBIDO", "PROCESANDO"]}})
    rejected = await fe_db.documents.count_documents({"tenant_id": tenant_id, "status": "RECHAZADO"})
    error = await fe_db.documents.count_documents({"tenant_id": tenant_id, "status": "ERROR"})
    
    # Verificar si existe el tenant
    tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
    
    # Verificar certificado
    cert = await fe_db.certificates.find_one({"tenant_id": tenant_id, "is_active": True})
    
    # Verificar config fiscal
    config = await fe_db.configs_fiscal.find_one({"tenant_id": tenant_id})
    
    return {
        "total_documents": total,
        "authorized": authorized,
        "pending": pending,
        "rejected": rejected,
        "error": error,
        "tenant_exists": tenant is not None,
        "has_certificate": cert is not None,
        "has_config": config is not None,
        "ambiente": config.get("ambiente") if config else None
    }


@router.get("/recent-documents/{tenant_id}")
async def get_recent_documents(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Obtiene los documentos más recientes de una empresa con detalles de error
    """
    fe_db = request.app.state.fe_db
    
    docs = await fe_db.documents.find(
        {"tenant_id": tenant_id}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "documents": [
            {
                "id": str(doc["_id"]),
                "doc_number": doc.get("doc_number"),
                "doc_type": doc.get("doc_type"),
                "client_name": doc.get("buyer", {}).get("razon_social") or doc.get("buyer", {}).get("nombre"),
                "total": doc.get("totals", {}).get("importe_total") or doc.get("total"),
                "status": doc.get("status"),
                "sri_error": doc.get("sri_response", {}).get("mensajes", [{}])[0].get("mensaje") if doc.get("sri_response") else doc.get("error"),
                "authorization_number": doc.get("authorization_number"),
                "created_at": doc.get("created_at"),
                "external_reference": doc.get("external_reference")
            }
            for doc in docs
        ]
    }


@router.get("/debug-all")
async def debug_all(
    request: Request,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Endpoint de debug general - muestra estado de todas las bases de datos
    """
    admin_db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    # Estadísticas generales
    total_docs = await fe_db.documents.count_documents({})
    total_tenants = await fe_db.tenants.count_documents({})
    total_integrations = await admin_db.integrations.count_documents({})
    total_sync_logs = await admin_db.sync_logs.count_documents({})
    
    # Tenant IDs únicos en documentos
    doc_tenant_ids = await fe_db.documents.distinct("tenant_id")
    
    # Tenant IDs en tenants
    tenant_ids = await fe_db.tenants.distinct("tenant_id")
    
    # Últimos errores de sync
    recent_errors = await admin_db.sync_logs.find(
        {"status": {"$in": ["failed", "completed"]}, "errors": {"$ne": []}}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "fe_db_name": fe_db.name,
        "admin_db_name": admin_db.name,
        "total_documents": total_docs,
        "total_tenants": total_tenants,
        "total_integrations": total_integrations,
        "total_sync_logs": total_sync_logs,
        "document_tenant_ids": doc_tenant_ids,
        "tenant_ids": tenant_ids,
        "recent_sync_errors": [
            {
                "tenant_id": log.get("tenant_id"),
                "status": log.get("status"),
                "errors": log.get("errors", [])[:3],
                "created_at": log.get("created_at")
            }
            for log in recent_errors
        ]
    }
