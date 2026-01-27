"""
Generador de PDF RIDE (Representación Impresa del Documento Electrónico)
Formato oficial del SRI Ecuador
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode import code128
from reportlab.graphics.shapes import Drawing
from io import BytesIO
from datetime import datetime
from typing import Dict, Optional
import base64


def generate_ride_pdf(document: dict, emitter: dict, logo_base64: Optional[str] = None) -> bytes:
    """
    Genera PDF del RIDE según formato oficial del SRI
    
    Args:
        document: Documento electrónico (de la BD)
        emitter: Datos del emisor
        logo_base64: Logo en base64 (opcional)
    
    Returns:
        bytes: Contenido del PDF
    """
    buffer = BytesIO()
    
    # Configurar documento A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=0.5*cm,
        bottomMargin=0.5*cm
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    style_title = ParagraphStyle('Title', fontSize=11, fontName='Helvetica-Bold', alignment=TA_CENTER)
    style_subtitle = ParagraphStyle('Subtitle', fontSize=9, alignment=TA_CENTER)
    style_normal = ParagraphStyle('Normal', fontSize=8, alignment=TA_LEFT)
    style_small = ParagraphStyle('Small', fontSize=7, alignment=TA_LEFT)
    style_bold = ParagraphStyle('Bold', fontSize=8, fontName='Helvetica-Bold', alignment=TA_LEFT)
    style_bold_center = ParagraphStyle('BoldCenter', fontSize=8, fontName='Helvetica-Bold', alignment=TA_CENTER)
    style_right = ParagraphStyle('Right', fontSize=8, alignment=TA_RIGHT)
    style_center = ParagraphStyle('Center', fontSize=8, alignment=TA_CENTER)
    style_header = ParagraphStyle('Header', fontSize=9, fontName='Helvetica-Bold', alignment=TA_CENTER, 
                                   backColor=colors.lightgrey)
    
    elements = []
    
    # Determinar tipo de documento
    doc_type = document.get("doc_type", "01")
    doc_type_name = "FACTURA" if doc_type == "01" else "NOTA DE CRÉDITO" if doc_type == "04" else "COMPROBANTE"
    
    # Extraer fecha de emisión de la clave de acceso (más confiable)
    access_key = document.get("access_key", "")
    if len(access_key) >= 8:
        fecha_emision = f"{access_key[0:2]}/{access_key[2:4]}/{access_key[4:8]}"
    else:
        issue_date = document.get("issue_date", datetime.now())
        if isinstance(issue_date, datetime):
            fecha_emision = issue_date.strftime("%d/%m/%Y")
        else:
            fecha_emision = str(issue_date)[:10]
    
    # ==========================================
    # SECCIÓN 1: ENCABEZADO (Logo + Emisor | Documento)
    # ==========================================
    
    # --- Columna Izquierda: Logo y datos del emisor ---
    left_content = []
    
    # Logo (si existe)
    if logo_base64:
        try:
            logo_data = base64.b64decode(logo_base64)
            logo_img = Image(BytesIO(logo_data), width=3*cm, height=2*cm)
            left_content.append(logo_img)
        except:
            pass
    
    # Datos del emisor
    left_content.append(Paragraph(f"<b>{emitter.get('razon_social', '')}</b>", style_bold))
    if emitter.get('nombre_comercial'):
        left_content.append(Paragraph(emitter['nombre_comercial'], style_small))
    left_content.append(Paragraph(f"<b>RUC:</b> {emitter.get('ruc', '')}", style_small))
    
    # Dirección
    direccion = emitter.get('direccion', '')
    if direccion:
        left_content.append(Paragraph(f"<b>Dir. Matriz:</b> {direccion}", style_small))
        left_content.append(Paragraph(f"<b>Dir. Establecimiento:</b> {direccion}", style_small))
    
    # Contribuyente especial
    if emitter.get('contribuyente_especial'):
        left_content.append(Paragraph(f"<b>Contribuyente Especial Nro:</b> {emitter['contribuyente_especial']}", style_small))
    
    # Obligado a contabilidad
    obligado = emitter.get('obligado_contabilidad', 'NO')
    left_content.append(Paragraph(f"<b>OBLIGADO A LLEVAR CONTABILIDAD:</b> {obligado}", style_small))
    
    left_table = Table([[c] for c in left_content], colWidths=[9*cm])
    left_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    
    # --- Columna Derecha: Datos del documento ---
    right_content = []
    
    # Número de autorización
    auth_number = document.get("sri_authorization_number", "")
    
    right_content.append(Paragraph(f"<b>R.U.C.: {emitter.get('ruc', '')}</b>", style_bold_center))
    right_content.append(Spacer(1, 2*mm))
    right_content.append(Paragraph(f"<b>{doc_type_name}</b>", style_bold_center))
    right_content.append(Paragraph(f"<b>No. {document.get('doc_number', '')}</b>", style_bold_center))
    right_content.append(Spacer(1, 2*mm))
    
    # Número de autorización
    right_content.append(Paragraph("<b>NÚMERO DE AUTORIZACIÓN</b>", style_small))
    if auth_number:
        right_content.append(Paragraph(auth_number, style_small))
    else:
        right_content.append(Paragraph("PENDIENTE", style_small))
    
    right_content.append(Spacer(1, 2*mm))
    
    # Fecha y hora de autorización
    auth_date = document.get("sri_authorization_date")
    if auth_date:
        if isinstance(auth_date, datetime):
            fecha_auth_str = auth_date.strftime("%d/%m/%Y %H:%M:%S")
        else:
            fecha_auth_str = str(auth_date)
    else:
        fecha_auth_str = "PENDIENTE"
    
    right_content.append(Paragraph(f"<b>FECHA Y HORA DE AUTORIZACIÓN</b>", style_small))
    right_content.append(Paragraph(fecha_auth_str, style_small))
    right_content.append(Spacer(1, 2*mm))
    
    # Ambiente
    ambiente = "PRODUCCIÓN" if emitter.get('ambiente') == 'produccion' else "PRUEBAS"
    right_content.append(Paragraph(f"<b>AMBIENTE:</b> {ambiente}", style_small))
    
    # Emisión
    right_content.append(Paragraph("<b>EMISIÓN:</b> NORMAL", style_small))
    right_content.append(Spacer(1, 2*mm))
    
    # Clave de acceso
    right_content.append(Paragraph("<b>CLAVE DE ACCESO</b>", style_small))
    
    # Código de barras - ajustado para caber en el recuadro de 9cm
    if access_key:
        # barWidth reducido de 0.4mm a 0.28mm para que quepa la clave de 49 dígitos
        barcode = code128.Code128(access_key, barWidth=0.28*mm, barHeight=10*mm)
        right_content.append(barcode)
        # Texto de la clave dividido en 2 líneas para mejor lectura
        clave_parte1 = access_key[:25]
        clave_parte2 = access_key[25:]
        right_content.append(Paragraph(f"{clave_parte1}<br/>{clave_parte2}", 
                                       ParagraphStyle('Barcode', fontSize=6, alignment=TA_CENTER, leading=8)))
    
    right_table = Table([[c] for c in right_content], colWidths=[9*cm])
    right_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    # Combinar columnas
    header_table = Table([[left_table, right_table]], colWidths=[9.5*cm, 9.5*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 3*mm))
    
    # ==========================================
    # SECCIÓN 2: DATOS DEL ADQUIRENTE
    # ==========================================
    customer = document.get("customer", {})
    
    tipo_id_map = {
        "04": "RUC",
        "05": "CÉDULA", 
        "06": "PASAPORTE",
        "07": "CONSUMIDOR FINAL"
    }
    tipo_id = tipo_id_map.get(customer.get("identification_type", ""), "")
    
    customer_data = [
        [Paragraph(f"<b>Razón Social / Nombres y Apellidos:</b> {customer.get('name', '')}", style_small), ""],
        [Paragraph(f"<b>Identificación:</b> {customer.get('identification', '')}", style_small),
         Paragraph(f"<b>Fecha Emisión:</b> {fecha_emision}", style_small)],
    ]
    
    if customer.get('address'):
        customer_data.append([
            Paragraph(f"<b>Dirección:</b> {customer.get('address', '')}", style_small), ""
        ])
    
    # Guía de remisión (si aplica)
    customer_data.append([
        Paragraph("<b>Guía Remisión:</b>", style_small), ""
    ])
    
    customer_table = Table(customer_data, colWidths=[12*cm, 6*cm])
    customer_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 3*mm))
    
    # ==========================================
    # SECCIÓN 3: DETALLE DE PRODUCTOS
    # ==========================================
    items = document.get("items", [])
    
    # Header
    detail_header = [
        Paragraph("<b>Cod.<br/>Principal</b>", style_small),
        Paragraph("<b>Cod.<br/>Auxiliar</b>", style_small),
        Paragraph("<b>Cant.</b>", style_small),
        Paragraph("<b>Descripción</b>", style_small),
        Paragraph("<b>Precio<br/>Unitario</b>", style_small),
        Paragraph("<b>Descuento</b>", style_small),
        Paragraph("<b>Precio<br/>Total</b>", style_small),
    ]
    
    detail_data = [detail_header]
    
    for item in items:
        qty = item.get('quantity', 0)
        price = item.get('unit_price', 0)
        discount = item.get('discount', 0)
        subtotal = (qty * price) - discount
        
        detail_data.append([
            Paragraph(str(item.get('code', ''))[:10], style_small),
            Paragraph("", style_small),  # Código auxiliar
            Paragraph(f"{qty:.2f}", style_small),
            Paragraph(item.get('description', '')[:40], style_small),
            Paragraph(f"{price:.2f}", style_small),
            Paragraph(f"{discount:.2f}", style_small),
            Paragraph(f"{subtotal:.2f}", style_small),
        ])
    
    detail_table = Table(detail_data, colWidths=[1.8*cm, 1.5*cm, 1.2*cm, 7*cm, 2*cm, 2*cm, 2*cm])
    detail_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
        ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(detail_table)
    elements.append(Spacer(1, 3*mm))
    
    # ==========================================
    # SECCIÓN 4: INFORMACIÓN ADICIONAL + TOTALES
    # ==========================================
    totals = document.get("totals", {})
    
    # Información adicional (columna izquierda)
    info_adicional = []
    info_adicional.append(Paragraph("<b>Información Adicional</b>", style_small))
    
    if customer.get('email'):
        info_adicional.append(Paragraph(f"Email: {customer['email']}", style_small))
    if customer.get('phone'):
        info_adicional.append(Paragraph(f"Teléfono: {customer['phone']}", style_small))
    if customer.get('address'):
        info_adicional.append(Paragraph(f"Dirección: {customer['address']}", style_small))
    
    info_table = Table([[c] for c in info_adicional], colWidths=[10*cm])
    info_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    
    # Totales (columna derecha)
    subtotal_sin_iva = totals.get('subtotal_0', 0) + totals.get('subtotal_12', 0) + totals.get('subtotal_15', 0)
    
    totals_data = [
        ["SUBTOTAL 15%", f"{totals.get('subtotal_15', 0):.2f}"],
        ["SUBTOTAL 0%", f"{totals.get('subtotal_0', 0):.2f}"],
        ["SUBTOTAL No Objeto de IVA", "0.00"],
        ["SUBTOTAL Exento de IVA", "0.00"],
        ["SUBTOTAL SIN IMPUESTOS", f"{subtotal_sin_iva:.2f}"],
        ["DESCUENTO", f"{totals.get('total_discount', 0):.2f}"],
        ["ICE", "0.00"],
        ["IVA 15%", f"{totals.get('total_iva_15', totals.get('total_iva', 0)):.2f}"],
        ["IRBPNR", "0.00"],
        ["PROPINA", "0.00"],
        ["VALOR TOTAL", f"{totals.get('total', 0):.2f}"],
    ]
    
    totals_table = Table(totals_data, colWidths=[5*cm, 2.5*cm])
    totals_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    
    # Combinar info + totales
    footer_table = Table([[info_table, totals_table]], colWidths=[10.5*cm, 8*cm])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(footer_table)
    elements.append(Spacer(1, 3*mm))
    
    # ==========================================
    # SECCIÓN 5: FORMA DE PAGO
    # ==========================================
    payments = document.get("payments", [])
    if payments:
        payment_names = {
            "01": "SIN UTILIZACIÓN DEL SISTEMA FINANCIERO",
            "15": "COMPENSACIÓN DE DEUDAS",
            "16": "TARJETA DE DÉBITO",
            "17": "DINERO ELECTRÓNICO",
            "18": "TARJETA PREPAGO",
            "19": "TARJETA DE CRÉDITO",
            "20": "OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO",
            "21": "ENDOSO DE TÍTULOS"
        }
        
        payment_data = [[
            Paragraph("<b>Forma de Pago</b>", style_small),
            Paragraph("<b>Valor</b>", style_small),
            Paragraph("<b>Plazo</b>", style_small),
            Paragraph("<b>Tiempo</b>", style_small),
        ]]
        
        for payment in payments:
            payment_data.append([
                Paragraph(payment_names.get(payment.get("method", "01"), "OTROS"), style_small),
                Paragraph(f"{payment.get('total', 0):.2f}", style_small),
                Paragraph(str(payment.get('term', 0)), style_small),
                Paragraph(payment.get('time_unit', 'días'), style_small),
            ])
        
        payment_table = Table(payment_data, colWidths=[10*cm, 3*cm, 2*cm, 3*cm])
        payment_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('ALIGN', (1, 1), (2, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(payment_table)
    
    # Construir PDF
    doc.build(elements)
    
    return buffer.getvalue()
