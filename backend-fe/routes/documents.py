"""
Rutas de Documentos Electrónicos
- Crear facturas
- Crear notas de crédito
- Listar documentos
- Descargar XML/PDF
- Reenviar documentos
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import gzip

from models.document import (
    InvoiceCreate, CreditNoteCreate, DocumentResponse, 
    DocumentListResponse, DocumentCreateResponse
)
from middleware.tenant import get_tenant_id
from services.sequential import get_next_sequential, format_doc_number
from services.access_key import generate_access_key
from services.xml_generator import generate_invoice_xml, generate_credit_note_xml
from services.xml_signer import sign_xml_xades_bes
from services.java_signer_client import sign_xml_with_java
from services.sri_client import SRIClient
from services.pdf_generator import generate_ride_pdf
from utils.crypto import decrypt_password

router = APIRouter(prefix="/fe/documents", tags=["Documentos"])


def calculate_totals(items: list, iva_default: float = 15) -> dict:
    """
    Calcula totales a partir de items
    """
    subtotal_0 = 0.0
    subtotal_12 = 0.0
    subtotal_15 = 0.0
    total_discount = 0.0
    
    processed_items = []
    
    for i, item in enumerate(items):
        quantity = float(item.quantity)
        unit_price = float(item.unit_price)
        discount = float(item.discount) if item.discount else 0
        iva_rate = float(item.iva_rate) if item.iva_rate is not None else iva_default
        
        subtotal_before_discount = quantity * unit_price
        subtotal = subtotal_before_discount - discount
        iva_amount = subtotal * iva_rate / 100
        total = subtotal + iva_amount
        
        # Agregar a subtotales por tasa
        if iva_rate == 0:
            subtotal_0 += subtotal
        elif iva_rate == 12:
            subtotal_12 += subtotal
        else:  # 15% u otras
            subtotal_15 += subtotal
        
        total_discount += discount
        
        processed_items.append({
            "sequence": i + 1,
            "code": item.code,
            "auxiliary_code": item.auxiliary_code,
            "description": item.description,
            "quantity": quantity,
            "unit_price": unit_price,
            "discount": discount,
            "subtotal_before_discount": round(subtotal_before_discount, 2),
            "subtotal": round(subtotal, 2),
            "iva_rate": iva_rate,
            "iva_amount": round(iva_amount, 2),
            "total": round(total, 2)
        })
    
    # Calcular IVAs
    total_iva_0 = 0.0
    total_iva_12 = round(subtotal_12 * 0.12, 2)
    total_iva_15 = round(subtotal_15 * 0.15, 2)
    total_iva = total_iva_0 + total_iva_12 + total_iva_15
    
    # Total final
    total = round(subtotal_0 + subtotal_12 + subtotal_15 + total_iva, 2)
    
    totals = {
        "subtotal_0": round(subtotal_0, 2),
        "subtotal_12": round(subtotal_12, 2),
        "subtotal_15": round(subtotal_15, 2),
        "subtotal_not_subject": 0.0,
        "subtotal_exempt": 0.0,
        "total_discount": round(total_discount, 2),
        "total_iva_0": total_iva_0,
        "total_iva_12": total_iva_12,
        "total_iva_15": total_iva_15,
        "total_iva": round(total_iva, 2),
        "propina": 0.0,
        "total": total
    }
    
    return totals, processed_items


@router.post("/invoice", response_model=DocumentCreateResponse)
async def create_invoice(request: Request, invoice: InvoiceCreate):
    """
    Crea una factura electrónica
    1. Genera secuencial
    2. Genera clave de acceso
    3. Crea documento en BD
    4. Genera XML
    5. Firma XML
    6. Envía a SRI
    7. Actualiza estado
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    # Validar configuración completa
    tenant = await db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=400, detail="Configuración del emisor no encontrada. Configure primero.")
    
    config = await db.configs_fiscal.find_one({"tenant_id": tenant_id})
    if not config:
        raise HTTPException(status_code=400, detail="Configuración fiscal no encontrada. Configure primero.")
    
    certificate = await db.certificates.find_one({"tenant_id": tenant_id, "is_active": True})
    if not certificate:
        raise HTTPException(status_code=400, detail="Certificado no configurado. Suba un certificado primero.")
    
    # Validar certificado no expirado
    valid_to = certificate["certificate_info"].get("valid_to")
    if valid_to and valid_to < datetime.now():
        raise HTTPException(status_code=400, detail="El certificado está expirado. Suba uno nuevo.")
    
    now = datetime.now(timezone.utc)
    issue_date = invoice.issue_date or now
    
    # Obtener ambiente configurado
    ambiente = config.get("ambiente", "pruebas")
    
    if ambiente == "pruebas":
        # El servidor de pruebas del SRI (celcer) está configurado para nov-dic 2025
        issue_date_for_sri = datetime(2025, 11, 28, tzinfo=timezone.utc)
    else:
        # En producción: usar la fecha de Ecuador (UTC-5)
        # El SRI valida contra la fecha de Ecuador, no UTC
        # Convertir UTC a hora de Ecuador restando 5 horas
        from datetime import timedelta
        ecuador_offset = timedelta(hours=-5)
        issue_date_for_sri = now + ecuador_offset
    
    # Obtener secuencial atómico
    sequential = await get_next_sequential(
        db, tenant_id, 
        invoice.store_code, 
        invoice.emission_point, 
        "01"  # Factura
    )
    
    doc_number = format_doc_number(invoice.store_code, invoice.emission_point, sequential)
    
    # Generar clave de acceso
    access_key = generate_access_key(
        issue_date=issue_date_for_sri,
        doc_type="01",
        ruc=tenant["ruc"],
        ambiente=ambiente,
        establecimiento=invoice.store_code,
        punto_emision=invoice.emission_point,
        secuencial=sequential
    )
    
    # Calcular totales
    totals, processed_items = calculate_totals(invoice.items, config.get("config", {}).get("iva_default", 15))
    
    # Procesar pagos
    payments = []
    if invoice.payments:
        for p in invoice.payments:
            payments.append({
                "method": p.method,
                "total": float(p.total),
                "term": p.term,
                "time_unit": p.time_unit
            })
    else:
        # Pago por defecto: efectivo
        payments.append({
            "method": "01",
            "total": totals["total"],
            "term": 0,
            "time_unit": "dias"
        })
    
    # Crear documento en BD (estado PENDIENTE)
    document_id = str(uuid.uuid4())
    document = {
        "_id": document_id,
        "tenant_id": tenant_id,
        "doc_type": "01",
        "doc_number": doc_number,
        "access_key": access_key,
        "store": {
            "code": invoice.store_code,
            "emission_point": invoice.emission_point,
            "name": f"Establecimiento {invoice.store_code}"
        },
        "issue_date": issue_date,
        "customer": {
            "identification_type": invoice.customer.identification_type,
            "identification": invoice.customer.identification,
            "name": invoice.customer.name,
            "email": invoice.customer.email,
            "phone": invoice.customer.phone,
            "address": invoice.customer.address
        },
        "items": processed_items,
        "totals": totals,
        "payments": payments,
        "sri_status": "PENDIENTE",
        "sri_authorization_number": None,
        "sri_authorization_date": None,
        "sri_messages": [],
        "created_at": now,
        "updated_at": now,
        "created_by_system": "POS",
        "is_voided": False,
        "has_credit_note": False
    }
    
    await db.documents.insert_one(document)
    
    # Registrar evento
    await db.document_events.insert_one({
        "_id": str(uuid.uuid4()),
        "document_id": document_id,
        "tenant_id": tenant_id,
        "event_type": "CREADO",
        "status": "success",
        "message": "Documento creado",
        "metadata": {},
        "created_at": now
    })
    
    # Generar XML
    emitter_data = {
        "ruc": tenant["ruc"],
        "razon_social": tenant["razon_social"],
        "nombre_comercial": tenant.get("nombre_comercial"),
        "direccion": tenant.get("address", {}).get("direccion", ""),
        "obligado_contabilidad": config.get("obligado_contabilidad", "NO"),
        "contribuyente_especial": config.get("tipo_contribuyente")
    }
    
    xml_unsigned = generate_invoice_xml(
        access_key=access_key,
        emitter=emitter_data,
        customer=document["customer"],
        items=processed_items,
        totals=totals,
        payments=payments,
        issue_date=issue_date_for_sri,  # Usar la fecha ajustada para Ecuador
        store_code=invoice.store_code,
        emission_point=invoice.emission_point,
        sequential=sequential,
        ambiente=ambiente
    )
    
    # Firmar XML usando servicio Java XAdES
    try:
        cert_password = decrypt_password(certificate["password_encrypted"])
        p12_data = bytes(certificate["file_data"]) if not isinstance(certificate["file_data"], bytes) else certificate["file_data"]
        xml_signed = await sign_xml_with_java(xml_unsigned, p12_data, cert_password)
    except Exception as e:
        # Actualizar estado a ERROR
        await db.documents.update_one(
            {"_id": document_id},
            {"$set": {"sri_status": "ERROR", "sri_messages": [{"mensaje": f"Error al firmar: {str(e)}"}]}}
        )
        await db.document_events.insert_one({
            "_id": str(uuid.uuid4()),
            "document_id": document_id,
            "tenant_id": tenant_id,
            "event_type": "ERROR",
            "status": "error",
            "message": f"Error al firmar XML: {str(e)}",
            "created_at": datetime.now(timezone.utc)
        })
        raise HTTPException(status_code=500, detail=f"Error al firmar documento: {str(e)}")
    
    # Guardar XML comprimido
    xml_gzip = gzip.compress(xml_signed.encode('utf-8'))
    await db.document_xml.insert_one({
        "_id": str(uuid.uuid4()),
        "document_id": document_id,
        "tenant_id": tenant_id,
        "xml_gzip": xml_gzip,
        "is_compressed": True,
        "encoding": "UTF-8",
        "size_bytes": len(xml_signed),
        "created_at": now
    })
    
    await db.document_events.insert_one({
        "_id": str(uuid.uuid4()),
        "document_id": document_id,
        "tenant_id": tenant_id,
        "event_type": "FIRMADO",
        "status": "success",
        "message": "XML firmado correctamente",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Enviar a SRI
    print(f"[SRI] Enviando documento {doc_number} a SRI...")
    sri_client = SRIClient(ambiente=ambiente)
    sri_status, auth_number, auth_date, sri_messages = await sri_client.emitir_y_autorizar(
        xml_signed, access_key
    )
    print(f"[SRI] Resultado: status={sri_status}, auth={auth_number}")
    
    # Actualizar documento con resultado SRI
    update_data = {
        "sri_status": sri_status,
        "sri_messages": sri_messages,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if auth_number:
        update_data["sri_authorization_number"] = auth_number
    if auth_date:
        update_data["sri_authorization_date"] = auth_date
    
    await db.documents.update_one({"_id": document_id}, {"$set": update_data})
    
    # Registrar evento SRI
    await db.document_events.insert_one({
        "_id": str(uuid.uuid4()),
        "document_id": document_id,
        "tenant_id": tenant_id,
        "event_type": sri_status,
        "status": "success" if sri_status == "AUTORIZADO" else "error",
        "message": f"Respuesta SRI: {sri_status}",
        "metadata": {"messages": sri_messages},
        "created_at": datetime.now(timezone.utc)
    })
    
    return DocumentCreateResponse(
        document_id=document_id,
        doc_number=doc_number,
        access_key=access_key,
        sri_status=sri_status,
        sri_authorization_number=auth_number,
        sri_messages=sri_messages
    )


@router.post("/credit-note", response_model=DocumentCreateResponse)
async def create_credit_note(request: Request, credit_note: CreditNoteCreate):
    """
    Crea una nota de crédito electrónica
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    # Validar factura original
    invoice = await db.documents.find_one({
        "_id": credit_note.invoice_id,
        "tenant_id": tenant_id,
        "doc_type": "01"
    })
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    if invoice.get("sri_status") != "AUTORIZADO":
        raise HTTPException(status_code=400, detail="Solo se pueden crear NC de facturas AUTORIZADAS")
    
    if invoice.get("has_credit_note"):
        raise HTTPException(status_code=400, detail="Esta factura ya tiene una nota de crédito")
    
    # Obtener configuraciones
    tenant = await db.tenants.find_one({"tenant_id": tenant_id})
    config = await db.configs_fiscal.find_one({"tenant_id": tenant_id})
    certificate = await db.certificates.find_one({"tenant_id": tenant_id, "is_active": True})
    
    if not all([tenant, config, certificate]):
        raise HTTPException(status_code=400, detail="Configuración incompleta")
    
    now = datetime.now(timezone.utc)
    store_code = invoice["store"]["code"]
    emission_point = invoice["store"]["emission_point"]
    
    # Obtener secuencial para NC
    sequential = await get_next_sequential(db, tenant_id, store_code, emission_point, "04")
    doc_number = format_doc_number(store_code, emission_point, sequential)
    
    # Generar clave de acceso
    ambiente = config.get("ambiente", "pruebas")
    access_key = generate_access_key(
        issue_date=now,
        doc_type="04",
        ruc=tenant["ruc"],
        ambiente=ambiente,
        establecimiento=store_code,
        punto_emision=emission_point,
        secuencial=sequential
    )
    
    # Calcular totales
    totals, processed_items = calculate_totals(credit_note.items)
    
    # Referencia a factura
    invoice_reference = {
        "invoice_id": credit_note.invoice_id,
        "doc_number": invoice["doc_number"],
        "issue_date": invoice["issue_date"],
        "reason": credit_note.reason
    }
    
    # Crear documento
    document_id = str(uuid.uuid4())
    document = {
        "_id": document_id,
        "tenant_id": tenant_id,
        "doc_type": "04",
        "doc_number": doc_number,
        "access_key": access_key,
        "store": invoice["store"],
        "issue_date": now,
        "invoice_reference": invoice_reference,
        "customer": invoice["customer"],
        "items": processed_items,
        "totals": totals,
        "payments": [],
        "sri_status": "PENDIENTE",
        "sri_authorization_number": None,
        "sri_authorization_date": None,
        "sri_messages": [],
        "created_at": now,
        "updated_at": now,
        "created_by_system": "POS",
        "is_voided": False,
        "has_credit_note": False
    }
    
    await db.documents.insert_one(document)
    
    # Generar y firmar XML
    emitter_data = {
        "ruc": tenant["ruc"],
        "razon_social": tenant["razon_social"],
        "nombre_comercial": tenant.get("nombre_comercial"),
        "direccion": tenant.get("address", {}).get("direccion", ""),
        "obligado_contabilidad": config.get("obligado_contabilidad", "NO")
    }
    
    xml_unsigned = generate_credit_note_xml(
        access_key=access_key,
        emitter=emitter_data,
        customer=invoice["customer"],
        items=processed_items,
        totals=totals,
        invoice_reference=invoice_reference,
        issue_date=now,
        store_code=store_code,
        emission_point=emission_point,
        sequential=sequential,
        ambiente=ambiente
    )
    
    cert_password = decrypt_password(certificate["password_encrypted"])
    xml_signed = sign_xml_xades_bes(xml_unsigned, certificate["file_data"], cert_password)
    
    # Guardar XML
    xml_gzip = gzip.compress(xml_signed.encode('utf-8'))
    await db.document_xml.insert_one({
        "_id": str(uuid.uuid4()),
        "document_id": document_id,
        "tenant_id": tenant_id,
        "xml_gzip": xml_gzip,
        "is_compressed": True,
        "created_at": now
    })
    
    # Enviar a SRI
    sri_client = SRIClient(ambiente=ambiente)
    sri_status, auth_number, auth_date, sri_messages = await sri_client.emitir_y_autorizar(
        xml_signed, access_key
    )
    
    # Actualizar NC
    await db.documents.update_one(
        {"_id": document_id},
        {"$set": {
            "sri_status": sri_status,
            "sri_authorization_number": auth_number,
            "sri_authorization_date": auth_date,
            "sri_messages": sri_messages,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Marcar factura original
    if sri_status == "AUTORIZADO":
        await db.documents.update_one(
            {"_id": credit_note.invoice_id},
            {"$set": {"has_credit_note": True}}
        )
    
    return DocumentCreateResponse(
        document_id=document_id,
        doc_number=doc_number,
        access_key=access_key,
        sri_status=sri_status,
        sri_authorization_number=auth_number,
        sri_messages=sri_messages
    )


@router.get("")
async def list_documents(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer_id: Optional[str] = None
):
    """
    Lista documentos electrónicos con filtros y paginación
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    # Construir filtro
    query = {"tenant_id": tenant_id}
    
    if status:
        query["sri_status"] = status
    
    if doc_type:
        query["doc_type"] = doc_type
    
    if date_from:
        try:
            df = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query["issue_date"] = {"$gte": df}
        except:
            pass
    
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            if "issue_date" in query:
                query["issue_date"]["$lte"] = dt
            else:
                query["issue_date"] = {"$lte": dt}
        except:
            pass
    
    if customer_id:
        query["customer.identification"] = customer_id
    
    # Contar total
    total = await db.documents.count_documents(query)
    
    # Obtener documentos
    skip = (page - 1) * limit
    cursor = db.documents.find(query, {"_id": 1, "tenant_id": 1, "doc_type": 1, "doc_number": 1, 
                                        "access_key": 1, "store": 1, "issue_date": 1, "customer": 1,
                                        "totals": 1, "sri_status": 1, "sri_authorization_number": 1,
                                        "created_at": 1, "is_voided": 1, "has_credit_note": 1, "invoice_reference": 1})
    cursor = cursor.sort("issue_date", -1).skip(skip).limit(limit)
    
    documents = []
    async for doc in cursor:
        doc["document_id"] = doc.pop("_id")
        doc["items"] = []  # No incluir items en listado
        doc["payments"] = []
        doc["sri_messages"] = []
        documents.append(doc)
    
    pages = (total + limit - 1) // limit
    
    return {
        "documents": documents,
        "total": total,
        "page": page,
        "pages": pages
    }


@router.get("/{document_id}")
async def get_document(request: Request, document_id: str):
    """
    Obtiene detalle de un documento
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    document = await db.documents.find_one({"_id": document_id, "tenant_id": tenant_id})
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Obtener eventos
    events = []
    cursor = db.document_events.find({"document_id": document_id}).sort("created_at", -1)
    async for event in cursor:
        event["event_id"] = str(event.pop("_id"))
        events.append(event)
    
    document["document_id"] = document.pop("_id")
    
    return {
        "document": document,
        "events": events
    }


@router.get("/{document_id}/xml")
async def download_xml(request: Request, document_id: str):
    """
    Descarga el XML firmado de un documento
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    # Verificar documento existe
    document = await db.documents.find_one({"_id": document_id, "tenant_id": tenant_id})
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Obtener XML
    xml_doc = await db.document_xml.find_one({"document_id": document_id, "tenant_id": tenant_id})
    if not xml_doc:
        raise HTTPException(status_code=404, detail="XML no encontrado")
    
    # Descomprimir si es necesario
    if xml_doc.get("is_compressed") and xml_doc.get("xml_gzip"):
        xml_content = gzip.decompress(xml_doc["xml_gzip"]).decode('utf-8')
    else:
        xml_content = xml_doc.get("xml_signed", "")
    
    filename = f"{document['doc_number'].replace('-', '')}.xml"
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{document_id}/pdf")
async def download_pdf(request: Request, document_id: str):
    """
    Genera y descarga el PDF RIDE de un documento
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    document = await db.documents.find_one({"_id": document_id, "tenant_id": tenant_id})
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    tenant = await db.tenants.find_one({"tenant_id": tenant_id})
    config = await db.configs_fiscal.find_one({"tenant_id": tenant_id})
    
    emitter = {
        "ruc": tenant["ruc"],
        "razon_social": tenant["razon_social"],
        "nombre_comercial": tenant.get("nombre_comercial"),
        "direccion": tenant.get("address", {}).get("direccion", ""),
        "telefono": tenant.get("phone"),
        "ambiente": config.get("ambiente", "pruebas") if config else "pruebas"
    }
    
    pdf_bytes = generate_ride_pdf(document, emitter)
    
    filename = f"{document['doc_number'].replace('-', '')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/{document_id}/resend")
async def resend_document(request: Request, document_id: str):
    """
    Reenvía un documento al SRI
    """
    tenant_id = await get_tenant_id(request)
    db = request.app.state.db
    
    document = await db.documents.find_one({"_id": document_id, "tenant_id": tenant_id})
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if document["sri_status"] == "AUTORIZADO":
        raise HTTPException(status_code=400, detail="Documento ya está autorizado")
    
    # Obtener XML
    xml_doc = await db.document_xml.find_one({"document_id": document_id})
    if not xml_doc:
        raise HTTPException(status_code=404, detail="XML no encontrado")
    
    if xml_doc.get("is_compressed"):
        xml_signed = gzip.decompress(xml_doc["xml_gzip"]).decode('utf-8')
    else:
        xml_signed = xml_doc.get("xml_signed", "")
    
    # Obtener config
    config = await db.configs_fiscal.find_one({"tenant_id": tenant_id})
    ambiente = config.get("ambiente", "pruebas") if config else "pruebas"
    
    # Reenviar
    sri_client = SRIClient(ambiente=ambiente)
    sri_status, auth_number, auth_date, sri_messages = await sri_client.emitir_y_autorizar(
        xml_signed, document["access_key"]
    )
    
    # Actualizar
    await db.documents.update_one(
        {"_id": document_id},
        {"$set": {
            "sri_status": sri_status,
            "sri_authorization_number": auth_number,
            "sri_authorization_date": auth_date,
            "sri_messages": sri_messages,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    await db.document_events.insert_one({
        "_id": str(uuid.uuid4()),
        "document_id": document_id,
        "tenant_id": tenant_id,
        "event_type": "REENVIADO",
        "status": "success" if sri_status == "AUTORIZADO" else "error",
        "message": f"Reenvío: {sri_status}",
        "metadata": {"messages": sri_messages},
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": sri_status == "AUTORIZADO",
        "sri_status": sri_status,
        "sri_authorization_number": auth_number,
        "sri_messages": sri_messages
    }
