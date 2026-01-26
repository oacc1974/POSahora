"""
Generador de PDF RIDE (Representación Impresa del Documento Electrónico)
Genera el documento PDF al vuelo, no se persiste
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Optional
import base64

def generate_ride_pdf(document: dict, emitter: dict, xml_authorized: Optional[str] = None) -> bytes:
    """
    Genera PDF del RIDE para una factura o nota de crédito
    
    Args:
        document: Documento electrónico (de la BD)
        emitter: Datos del emisor
        xml_authorized: XML autorizado (opcional, para incluir número autorización)
    
    Returns:
        bytes: Contenido del PDF
    """
    buffer = BytesIO()
    
    # Configurar documento
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=3
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_LEFT,
        spaceAfter=2
    )
    
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_LEFT
    )
    
    bold_style = ParagraphStyle(
        'Bold',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # === ENCABEZADO ===
    # Tipo de documento
    doc_type_name = "FACTURA" if document.get("doc_type") == "01" else "NOTA DE CRÉDITO"
    elements.append(Paragraph(f"<b>{doc_type_name}</b>", title_style))
    
    # Datos del emisor
    elements.append(Paragraph(f"<b>{emitter.get('razon_social', '')}</b>", subtitle_style))
    if emitter.get('nombre_comercial'):
        elements.append(Paragraph(emitter['nombre_comercial'], normal_style))
    elements.append(Paragraph(f"RUC: {emitter.get('ruc', '')}", normal_style))
    elements.append(Paragraph(emitter.get('direccion', ''), normal_style))
    if emitter.get('telefono'):
        elements.append(Paragraph(f"Tel: {emitter['telefono']}", normal_style))
    
    elements.append(Spacer(1, 5*mm))
    
    # === INFORMACIÓN DEL DOCUMENTO ===
    info_data = [
        ["No. Documento:", document.get("doc_number", "")],
        ["Clave de Acceso:", document.get("access_key", "")],
        ["Fecha de Emisión:", document.get("issue_date", datetime.now()).strftime("%d/%m/%Y %H:%M") if isinstance(document.get("issue_date"), datetime) else str(document.get("issue_date", ""))],
        ["Ambiente:", "PRUEBAS" if emitter.get("ambiente") == "pruebas" else "PRODUCCIÓN"],
    ]
    
    if document.get("sri_authorization_number"):
        info_data.append(["No. Autorización:", document["sri_authorization_number"]])
    
    if document.get("sri_authorization_date"):
        fecha_auth = document["sri_authorization_date"]
        if isinstance(fecha_auth, datetime):
            fecha_auth = fecha_auth.strftime("%d/%m/%Y %H:%M")
        info_data.append(["Fecha Autorización:", str(fecha_auth)])
    
    info_table = Table(info_data, colWidths=[4*cm, 14*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(info_table)
    
    elements.append(Spacer(1, 5*mm))
    
    # === DATOS DEL CLIENTE ===
    customer = document.get("customer", {})
    
    elements.append(Paragraph("<b>DATOS DEL CLIENTE</b>", bold_style))
    
    tipo_id = {
        "04": "RUC",
        "05": "CÉDULA",
        "06": "PASAPORTE",
        "07": "CONSUMIDOR FINAL"
    }.get(customer.get("identification_type", ""), "")
    
    customer_data = [
        ["Razón Social:", customer.get("name", "")],
        [f"Identificación ({tipo_id}):", customer.get("identification", "")],
    ]
    
    if customer.get("address"):
        customer_data.append(["Dirección:", customer["address"]])
    
    if customer.get("email"):
        customer_data.append(["Email:", customer["email"]])
    
    customer_table = Table(customer_data, colWidths=[4*cm, 14*cm])
    customer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(customer_table)
    
    elements.append(Spacer(1, 5*mm))
    
    # === REFERENCIA (para Notas de Crédito) ===
    if document.get("invoice_reference"):
        ref = document["invoice_reference"]
        elements.append(Paragraph("<b>DOCUMENTO MODIFICADO</b>", bold_style))
        ref_data = [
            ["Tipo:", "FACTURA"],
            ["Número:", ref.get("doc_number", "")],
            ["Fecha:", ref.get("issue_date", "")],
            ["Motivo:", ref.get("reason", "")],
        ]
        ref_table = Table(ref_data, colWidths=[4*cm, 14*cm])
        ref_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        elements.append(ref_table)
        elements.append(Spacer(1, 5*mm))
    
    # === DETALLE DE ITEMS ===
    elements.append(Paragraph("<b>DETALLE</b>", bold_style))
    
    items = document.get("items", [])
    
    # Headers de la tabla
    detail_data = [["Código", "Descripción", "Cant.", "P. Unit.", "Desc.", "Subtotal"]]
    
    for item in items:
        subtotal = item.get("quantity", 0) * item.get("unit_price", 0) - item.get("discount", 0)
        detail_data.append([
            item.get("code", "")[:15],
            item.get("description", "")[:50],
            f"{item.get('quantity', 0):.2f}",
            f"${item.get('unit_price', 0):.2f}",
            f"${item.get('discount', 0):.2f}",
            f"${subtotal:.2f}"
        ])
    
    detail_table = Table(detail_data, colWidths=[2.5*cm, 7*cm, 1.5*cm, 2*cm, 2*cm, 2.5*cm])
    detail_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(detail_table)
    
    elements.append(Spacer(1, 5*mm))
    
    # === TOTALES ===
    totals = document.get("totals", {})
    
    totals_data = []
    
    if totals.get("subtotal_0", 0) > 0:
        totals_data.append(["Subtotal IVA 0%:", f"${totals['subtotal_0']:.2f}"])
    if totals.get("subtotal_12", 0) > 0:
        totals_data.append(["Subtotal IVA 12%:", f"${totals['subtotal_12']:.2f}"])
    if totals.get("subtotal_15", 0) > 0:
        totals_data.append(["Subtotal IVA 15%:", f"${totals['subtotal_15']:.2f}"])
    
    totals_data.append(["Subtotal sin impuestos:", f"${(totals.get('total', 0) - totals.get('total_iva', 0)):.2f}"])
    totals_data.append(["Total Descuento:", f"${totals.get('total_discount', 0):.2f}"])
    totals_data.append(["Total IVA:", f"${totals.get('total_iva', 0):.2f}"])
    totals_data.append(["TOTAL:", f"${totals.get('total', 0):.2f}"])
    
    totals_table = Table(totals_data, colWidths=[12*cm, 4*cm])
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(totals_table)
    
    elements.append(Spacer(1, 5*mm))
    
    # === FORMAS DE PAGO ===
    payments = document.get("payments", [])
    if payments:
        elements.append(Paragraph("<b>FORMAS DE PAGO</b>", bold_style))
        
        payment_names = {
            "01": "Sin utilización del sistema financiero",
            "15": "Compensación de deudas",
            "16": "Tarjeta de débito",
            "17": "Dinero electrónico",
            "18": "Tarjeta prepago",
            "19": "Tarjeta de crédito",
            "20": "Otros con utilización del sistema financiero",
            "21": "Endoso de títulos"
        }
        
        payment_data = [["Forma de Pago", "Valor", "Plazo"]]
        for payment in payments:
            payment_data.append([
                payment_names.get(payment.get("method", "01"), "Otros"),
                f"${payment.get('total', 0):.2f}",
                f"{payment.get('term', 0)} {payment.get('time_unit', 'días')}" if payment.get("term", 0) > 0 else "Contado"
            ])
        
        payment_table = Table(payment_data, colWidths=[10*cm, 3*cm, 3*cm])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(payment_table)
    
    elements.append(Spacer(1, 10*mm))
    
    # === PIE DE PÁGINA ===
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=7,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    elements.append(Paragraph("Documento generado electrónicamente", footer_style))
    elements.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", footer_style))
    
    # Construir PDF
    doc.build(elements)
    
    return buffer.getvalue()
