"""
Rutas de Documentos Electrónicos (lectura desde fe_db)
- Listar documentos por empresa
- Ver detalle de documento
- Descargar XML/PDF
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
import base64
import gzip

from utils.security import get_current_user, require_permission

router = APIRouter(prefix="/documents", tags=["Documentos"])


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
