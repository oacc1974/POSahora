"""
Rutas de Documentos Electrónicos (lectura desde fe_db)
- Listar documentos por empresa
- Ver detalle de documento
- Descargar XML/PDF
"""
import os
import httpx
import asyncio
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
import base64
import gzip

from utils.security import get_current_user, require_permission

BACKEND_FE_URL = os.environ.get("BACKEND_FE_URL", "http://localhost:8000")

router = APIRouter(prefix="/documents", tags=["Documentos"])


@router.get("/debug")
async def debug_documents(
    request: Request,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Endpoint de diagnóstico para verificar documentos en fe_db
    """
    fe_db = request.app.state.fe_db
    
    # Contar documentos totales
    total_docs = await fe_db.documents.count_documents({})
    
    # Obtener tenant_ids únicos
    tenant_ids = await fe_db.documents.distinct("tenant_id")
    
    # Obtener muestra de documento
    sample = await fe_db.documents.find_one({})
    sample_info = None
    if sample:
        sample_info = {
            "id": str(sample.get("_id")),
            "tenant_id": sample.get("tenant_id"),
            "doc_number": sample.get("doc_number"),
            "status": sample.get("status")
        }
    
    # Contar tenants en fe_db
    total_tenants = await fe_db.tenants.count_documents({})
    tenant_list = await fe_db.tenants.distinct("tenant_id")
    
    return {
        "total_documents": total_docs,
        "document_tenant_ids": tenant_ids,
        "total_tenants": total_tenants,
        "tenant_ids": tenant_list,
        "sample_document": sample_info,
        "db_name": fe_db.name
    }


@router.get("")
async def list_documents(
    request: Request,
    tenant_id: str = Query(..., description="ID de la empresa"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Lista documentos electrónicos de una empresa
    """
    fe_db = request.app.state.fe_db
    
    # Debug: contar todos los documentos sin filtro
    total_all = await fe_db.documents.count_documents({})
    print(f"DEBUG: Total documentos en fe_db (sin filtro): {total_all}")
    print(f"DEBUG: Buscando tenant_id: {tenant_id}")
    
    # Debug: listar tenant_ids únicos
    if total_all > 0:
        sample = await fe_db.documents.find_one({})
        if sample:
            print(f"DEBUG: Ejemplo de documento - tenant_id: {sample.get('tenant_id')}")
    
    query = {"tenant_id": tenant_id}
    
    if status:
        query["status"] = status
    
    if doc_type:
        query["doc_type"] = doc_type
    
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            query["issue_date"] = {"$gte": from_dt}
        except:
            pass
    
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            if "issue_date" in query:
                query["issue_date"]["$lte"] = to_dt
            else:
                query["issue_date"] = {"$lte": to_dt}
        except:
            pass
    
    if search:
        query["$or"] = [
            {"doc_number": {"$regex": search, "$options": "i"}},
            {"access_key": {"$regex": search, "$options": "i"}},
            {"buyer.name": {"$regex": search, "$options": "i"}},
            {"buyer.id_number": {"$regex": search, "$options": "i"}}
        ]
    
    total = await fe_db.documents.count_documents(query)
    
    skip = (page - 1) * limit
    cursor = fe_db.documents.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    documents = []
    async for doc in cursor:
        documents.append({
            "id": str(doc["_id"]),
            "doc_type": doc.get("doc_type", "01"),
            "doc_type_name": get_doc_type_name(doc.get("doc_type", "01")),
            "doc_number": doc.get("doc_number"),
            "access_key": doc.get("access_key"),
            "issue_date": doc.get("issue_date"),
            "buyer_name": doc.get("buyer", {}).get("name", "N/A"),
            "buyer_id": doc.get("buyer", {}).get("id_number", "N/A"),
            "total": doc.get("totals", {}).get("total", 0),
            "status": doc.get("status", "pending"),
            "status_name": get_status_name(doc.get("status", "pending")),
            "sri_status": doc.get("sri_status"),
            "sri_message": doc.get("sri_message"),
            "created_at": doc.get("created_at"),
            "has_xml": bool(doc.get("xml_signed")),
            "has_pdf": bool(doc.get("pdf_ride"))
        })
    
    return {
        "documents": documents,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{document_id}")
async def get_document(
    request: Request,
    document_id: str,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Obtiene detalle de un documento
    """
    fe_db = request.app.state.fe_db
    
    try:
        doc = await fe_db.documents.find_one({"_id": document_id})
    except:
        doc = None
    
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    return {
        "id": str(doc["_id"]),
        "tenant_id": doc.get("tenant_id"),
        "doc_type": doc.get("doc_type"),
        "doc_type_name": get_doc_type_name(doc.get("doc_type", "01")),
        "doc_number": doc.get("doc_number"),
        "access_key": doc.get("access_key"),
        "issue_date": doc.get("issue_date"),
        "buyer": doc.get("buyer"),
        "items": doc.get("items", []),
        "totals": doc.get("totals"),
        "payments": doc.get("payments", []),
        "status": doc.get("status"),
        "status_name": get_status_name(doc.get("status", "pending")),
        "sri_status": doc.get("sri_status"),
        "sri_message": doc.get("sri_message"),
        "sri_authorization_date": doc.get("sri_authorization_date"),
        "external_reference": doc.get("external_reference"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "has_xml": bool(doc.get("xml_signed")),
        "has_pdf": bool(doc.get("pdf_ride"))
    }


@router.get("/{document_id}/xml")
async def download_xml(
    request: Request,
    document_id: str,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Descarga XML firmado del documento
    """
    fe_db = request.app.state.fe_db
    
    doc = await fe_db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    xml_data = doc.get("xml_signed")
    if not xml_data:
        raise HTTPException(status_code=404, detail="XML no disponible")
    
    # Descomprimir si está comprimido
    if isinstance(xml_data, bytes):
        try:
            xml_content = gzip.decompress(xml_data).decode('utf-8')
        except:
            xml_content = xml_data.decode('utf-8') if isinstance(xml_data, bytes) else xml_data
    else:
        xml_content = xml_data
    
    filename = f"{doc.get('access_key', document_id)}.xml"
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{document_id}/pdf")
async def download_pdf(
    request: Request,
    document_id: str,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Descarga PDF RIDE del documento
    """
    fe_db = request.app.state.fe_db
    
    doc = await fe_db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    pdf_data = doc.get("pdf_ride")
    if not pdf_data:
        raise HTTPException(status_code=404, detail="PDF no disponible")
    
    # Decodificar base64 si es necesario
    if isinstance(pdf_data, str):
        pdf_content = base64.b64decode(pdf_data)
    else:
        pdf_content = pdf_data
    
    filename = f"{doc.get('access_key', document_id)}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/stats/{tenant_id}")
async def get_document_stats(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("documents:read"))
):
    """
    Obtiene estadísticas de documentos de una empresa
    """
    fe_db = request.app.state.fe_db
    
    # Total por estado
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total": {"$sum": "$totals.total"}
        }}
    ]
    
    stats_by_status = {}
    async for stat in fe_db.documents.aggregate(pipeline):
        stats_by_status[stat["_id"] or "unknown"] = {
            "count": stat["count"],
            "total": round(stat["total"], 2)
        }
    
    # Total por tipo de documento
    pipeline_type = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": "$doc_type",
            "count": {"$sum": 1}
        }}
    ]
    
    stats_by_type = {}
    async for stat in fe_db.documents.aggregate(pipeline_type):
        doc_type = stat["_id"] or "01"
        stats_by_type[get_doc_type_name(doc_type)] = stat["count"]
    
    return {
        "by_status": stats_by_status,
        "by_type": stats_by_type
    }


def get_doc_type_name(doc_type: str) -> str:
    """Retorna nombre del tipo de documento"""
    types = {
        "01": "Factura",
        "04": "Nota de Crédito",
        "05": "Nota de Débito",
        "06": "Guía de Remisión",
        "07": "Comprobante de Retención"
    }
    return types.get(doc_type, "Documento")


def get_status_name(status: str) -> str:
    """Retorna nombre del estado"""
    statuses = {
        "pending": "Pendiente",
        "signed": "Firmado",
        "sent": "Enviado",
        "authorized": "Autorizado",
        "rejected": "Rechazado",
        "error": "Error"
    }
    return statuses.get(status, status)


@router.post("/retry/{tenant_id}")
async def retry_pending_documents(
    request: Request,
    tenant_id: str,
    current_user: dict = Depends(require_permission("documents:write"))
):
    """
    Reintenta autorizar documentos pendientes de una empresa
    """
    fe_db = request.app.state.fe_db
    
    # Buscar documentos pendientes o con error
    pending_statuses = ["pending", "signed", "sent", "error", "PENDIENTE", "ERROR", "RECIBIDO"]
    docs = await fe_db.documents.find({
        "tenant_id": tenant_id,
        "status": {"$in": pending_statuses}
    }).to_list(50)
    
    if not docs:
        return {
            "success": True,
            "message": "No hay documentos pendientes para reintentar",
            "processed": 0,
            "success_count": 0,
            "failed_count": 0
        }
    
    processed = 0
    success_count = 0
    failed_count = 0
    errors = []
    
    for doc in docs:
        doc_id = str(doc["_id"])
        try:
            # Llamar a backend-fe para reintentar autorización
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{BACKEND_FE_URL}/fe/documents/{doc_id}/retry",
                    headers={"X-Tenant-ID": tenant_id}
                )
                
                if response.status_code in [200, 201]:
                    success_count += 1
                elif response.status_code == 429:
                    # Rate limited, esperar y continuar
                    await asyncio.sleep(3)
                    failed_count += 1
                    errors.append({
                        "doc_id": doc_id,
                        "doc_number": doc.get("doc_number"),
                        "error": "Rate limit - reintentar más tarde"
                    })
                else:
                    failed_count += 1
                    errors.append({
                        "doc_id": doc_id,
                        "doc_number": doc.get("doc_number"),
                        "error": response.text[:200]
                    })
            
            processed += 1
            
            # Pequeña pausa entre documentos para evitar rate limiting
            await asyncio.sleep(1)
            
        except Exception as e:
            failed_count += 1
            errors.append({
                "doc_id": doc_id,
                "doc_number": doc.get("doc_number"),
                "error": str(e)
            })
    
    return {
        "success": True,
        "message": f"Procesados {processed} documentos: {success_count} exitosos, {failed_count} fallidos",
        "processed": processed,
        "success_count": success_count,
        "failed_count": failed_count,
        "errors": errors[:10]
    }


@router.post("/{document_id}/retry")
async def retry_single_document(
    request: Request,
    document_id: str,
    current_user: dict = Depends(require_permission("documents:write"))
):
    """
    Reintenta autorizar un documento específico
    """
    fe_db = request.app.state.fe_db
    
    doc = await fe_db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    tenant_id = doc.get("tenant_id")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{BACKEND_FE_URL}/fe/documents/{document_id}/retry",
                headers={"X-Tenant-ID": tenant_id}
            )
            
            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "message": "Documento reenviado para autorización",
                    "result": response.json()
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error del SRI: {response.text}"
                )
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Error de conexión: {str(e)}")
