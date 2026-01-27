"""
Generador de PDF RIDE (Representación Impresa del Documento Electrónico)
Formato oficial del SRI Ecuador - Estructura idéntica al ejemplo oficial
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
    style_title = ParagraphStyle('Title', fontSize=12, fontName='Helvetica-Bold', alignment=TA_CENTER)
    style_ruc = ParagraphStyle('RUC', fontSize=11, fontName='Helvetica-Bold', alignment=TA_CENTER)
    style_normal = ParagraphStyle('Normal', fontSize=8, alignment=TA_LEFT, leading=10)
    style_small = ParagraphStyle('Small', fontSize=7, alignment=TA_LEFT, leading=9)
    style_bold = ParagraphStyle('Bold', fontSize=9, fontName='Helvetica-Bold', alignment=TA_LEFT)
    style_bold_small = ParagraphStyle('BoldSmall', fontSize=8, fontName='Helvetica-Bold', alignment=TA_LEFT)
    style_center = ParagraphStyle('Center', fontSize=8, alignment=TA_CENTER)
    style_center_small = ParagraphStyle('CenterSmall', fontSize=7, alignment=TA_CENTER)
    
    elements = []
    
    # Determinar tipo de documento
    doc_type = document.get("doc_type", "01")
    doc_type_name = "FACTURA" if doc_type == "01" else "NOTA DE CRÉDITO" if doc_type == "04" else "COMPROBANTE"
    
    # Extraer fecha de emisión de la clave de acceso
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
    # SECCIÓN 1: ENCABEZADO CON LOGO
    # ==========================================
    
    # --- Columna Izquierda: Logo y datos del emisor en recuadro ---
    left_elements = []
    
    # Logo (si existe) - va ARRIBA
    logo_img = None
    if logo_base64:
        try:
            logo_data = base64.b64decode(logo_base64)
            logo_img = Image(BytesIO(logo_data), width=4*cm, height=3*cm)
            logo_img.hAlign = 'CENTER'
        except:
            pass
    
    # Crear contenido del recuadro izquierdo
    left_box_content = []
    
    # Si hay logo, agregarlo primero
    if logo_img:
        left_box_content.append([logo_img])
        left_box_content.append([Spacer(1, 3*mm)])
    
    # Razón social en negrita y grande
    left_box_content.append([Paragraph(f"<b>{emitter.get('razon_social', '').upper()}</b>", style_bold)])
    
    # Nombre comercial
    if emitter.get('nombre_comercial'):
        left_box_content.append([Paragraph(emitter['nombre_comercial'].upper(), style_normal)])
    
    left_box_content.append([Spacer(1, 2*mm)])
    
    # Dirección Matriz
    direccion = emitter.get('direccion', '')
    left_box_content.append([Paragraph(f"<b>Dirección</b>", style_bold_small)])
    left_box_content.append([Paragraph(f"<b>Matriz:</b>          {direccion}", style_small)])
    left_box_content.append([Spacer(1, 1*mm)])
    
    # Dirección Sucursal
    left_box_content.append([Paragraph(f"<b>Dirección</b>", style_bold_small)])
    left_box_content.append([Paragraph(f"<b>Sucursal:</b>        {direccion}", style_small)])
    left_box_content.append([Spacer(1, 2*mm)])
    
    # Obligado a llevar contabilidad
    obligado = emitter.get('obligado_contabilidad', 'NO')
    left_box_content.append([
        Table([["OBLIGADO A LLEVAR CONTABILIDAD", obligado]], 
              colWidths=[6.5*cm, 1.5*cm],
              style=TableStyle([
                  ('FONTSIZE', (0, 0), (-1, -1), 7),
                  ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                  ('ALIGN', (1, 0), (1, 0), 'CENTER'),
              ]))
    ])
    
    # Contribuyente especial o RIMPE
    if emitter.get('contribuyente_especial'):
        left_box_content.append([Spacer(1, 2*mm)])
        left_box_content.append([Paragraph(f"CONTRIBUYENTE RÉGIMEN RIMPE", style_bold_small)])
    
    left_table = Table(left_box_content, colWidths=[8.5*cm])
    left_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    # --- Columna Derecha: Datos del documento en recuadro ---
    right_box_content = []
    
    # RUC grande y centrado
    right_box_content.append([Paragraph(f"<b>R.U.C.:       {emitter.get('ruc', '')}</b>", style_ruc)])
    right_box_content.append([Spacer(1, 2*mm)])
    
    # Tipo de documento
    right_box_content.append([Paragraph(f"<b>{doc_type_name}</b>", style_title)])
    right_box_content.append([Spacer(1, 1*mm)])
    
    # Número
    right_box_content.append([Paragraph(f"<b>No.       {document.get('doc_number', '')}</b>", style_center)])
    right_box_content.append([Spacer(1, 3*mm)])
    
    # Número de autorización
    auth_number = document.get("sri_authorization_number", "")
    right_box_content.append([Paragraph("<b>NÚMERO DE AUTORIZACIÓN</b>", style_bold_small)])
    right_box_content.append([Spacer(1, 1*mm)])
    if auth_number:
        right_box_content.append([Paragraph(auth_number, style_small)])
    else:
        right_box_content.append([Paragraph("PENDIENTE DE AUTORIZACIÓN", style_small)])
    right_box_content.append([Spacer(1, 2*mm)])
    
    # Fecha y hora de autorización
    # La fecha del SRI viene en hora de Ecuador, no necesita conversión
    auth_date = document.get("sri_authorization_date")
    if auth_date:
        if isinstance(auth_date, datetime):
            # La fecha ya viene en hora de Ecuador desde el SRI
            # Si parece estar en UTC (hora > issue_date), ajustar a Ecuador
            issue_date_check = document.get("issue_date")
            if issue_date_check and isinstance(issue_date_check, datetime):
                # Si la hora de auth es ~5 horas mayor, es UTC y hay que restar 5h
                from datetime import timedelta
                if auth_date.hour > 18:  # Probablemente es UTC
                    auth_date = auth_date - timedelta(hours=5)
            fecha_auth_str = auth_date.strftime("%d/%m/%Y %H:%M:%S")
        else:
            fecha_auth_str = str(auth_date)
    else:
        fecha_auth_str = "PENDIENTE"
    
    right_box_content.append([
        Table([["FECHA Y HORA DE", fecha_auth_str]], 
              colWidths=[4*cm, 5*cm],
              style=TableStyle([
                  ('FONTSIZE', (0, 0), (-1, -1), 7),
                  ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                  ('ALIGN', (1, 0), (1, 0), 'LEFT'),
              ]))
    ])
    right_box_content.append([Paragraph("<b>AUTORIZACIÓN:</b>", style_bold_small)])
    right_box_content.append([Spacer(1, 2*mm)])
    
    # Ambiente
    ambiente = "PRODUCCIÓN" if emitter.get('ambiente') == 'produccion' else "PRUEBAS"
    right_box_content.append([
        Table([["AMBIENTE:", ambiente]], 
              colWidths=[4*cm, 5*cm],
              style=TableStyle([
                  ('FONTSIZE', (0, 0), (-1, -1), 7),
                  ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
              ]))
    ])
    right_box_content.append([Spacer(1, 1*mm)])
    
    # Emisión
    right_box_content.append([
        Table([["EMISIÓN:", "NORMAL"]], 
              colWidths=[4*cm, 5*cm],
              style=TableStyle([
                  ('FONTSIZE', (0, 0), (-1, -1), 7),
                  ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
              ]))
    ])
    right_box_content.append([Spacer(1, 3*mm)])
    
    # Clave de acceso con código de barras
    right_box_content.append([Paragraph("<b>CLAVE DE ACCESO</b>", style_bold_small)])
    right_box_content.append([Spacer(1, 2*mm)])
    
    # Código de barras - centrado y con ancho ajustado
    if access_key:
        # Calcular barWidth para que quepa en ~8cm
        # Code128 para 49 caracteres necesita barWidth pequeño
        barcode = code128.Code128(access_key, barWidth=0.22*mm, barHeight=12*mm)
        barcode.hAlign = 'CENTER'
        right_box_content.append([barcode])
        right_box_content.append([Spacer(1, 1*mm)])
        # Clave de acceso en texto debajo del código de barras
        clave_linea1 = access_key[:25]
        clave_linea2 = access_key[25:]
        right_box_content.append([Paragraph(f"{clave_linea1}", style_center_small)])
        right_box_content.append([Paragraph(f"{clave_linea2}", style_center_small)])
    
    right_table = Table(right_box_content, colWidths=[9*cm])
    right_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    # Combinar columnas
    header_table = Table([[left_table, right_table]], colWidths=[9*cm, 10*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 4*mm))
    
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
        [Paragraph(f"<b>Razón Social / Nombres y Apellidos:</b>", style_small), 
         Paragraph(f"{customer.get('name', '').upper()}", style_normal)],
        [Paragraph(f"<b>Identificación:</b>", style_small),
         Paragraph(f"{customer.get('identification', '')}", style_normal)],
        [Paragraph(f"<b>Fecha Emisión:</b>", style_small),
         Paragraph(f"{fecha_emision}", style_normal)],
    ]
    
    if customer.get('address'):
        customer_data.append([
            Paragraph(f"<b>Dirección:</b>", style_small),
            Paragraph(f"{customer.get('address', '')}", style_normal)
        ])
    
    customer_table = Table(customer_data, colWidths=[5*cm, 14*cm])
    customer_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 4*mm))
    
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
            Paragraph("", style_small),
            Paragraph(f"{qty:.2f}", style_center_small),
            Paragraph(item.get('description', '')[:40], style_small),
            Paragraph(f"{price:.2f}", style_center_small),
            Paragraph(f"{discount:.2f}", style_center_small),
            Paragraph(f"{subtotal:.2f}", style_center_small),
        ])
    
    detail_table = Table(detail_data, colWidths=[1.8*cm, 1.5*cm, 1.2*cm, 7*cm, 2*cm, 2*cm, 2.5*cm])
    detail_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),
        ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(detail_table)
    elements.append(Spacer(1, 4*mm))
    
    # ==========================================
    # SECCIÓN 4: INFORMACIÓN ADICIONAL + TOTALES
    # ==========================================
    totals = document.get("totals", {})
    
    # Información adicional (columna izquierda)
    info_adicional = []
    info_adicional.append([Paragraph("<b>Información Adicional</b>", style_bold_small)])
    
    if customer.get('email'):
        info_adicional.append([Paragraph(f"<b>Email:</b> {customer['email']}", style_small)])
    if customer.get('phone'):
        info_adicional.append([Paragraph(f"<b>Teléfono:</b> {customer['phone']}", style_small)])
    if customer.get('address'):
        info_adicional.append([Paragraph(f"<b>Dirección:</b> {customer['address']}", style_small)])
    
    info_table = Table(info_adicional, colWidths=[10*cm])
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
        [Paragraph("<b>SUBTOTAL 15%</b>", style_small), f"{totals.get('subtotal_15', 0):.2f}"],
        [Paragraph("<b>SUBTOTAL 0%</b>", style_small), f"{totals.get('subtotal_0', 0):.2f}"],
        [Paragraph("<b>SUBTOTAL No Objeto de IVA</b>", style_small), "0.00"],
        [Paragraph("<b>SUBTOTAL Exento de IVA</b>", style_small), "0.00"],
        [Paragraph("<b>SUBTOTAL SIN IMPUESTOS</b>", style_small), f"{subtotal_sin_iva:.2f}"],
        [Paragraph("<b>DESCUENTO</b>", style_small), f"{totals.get('total_discount', 0):.2f}"],
        [Paragraph("<b>ICE</b>", style_small), "0.00"],
        [Paragraph("<b>IVA 15%</b>", style_small), f"{totals.get('total_iva_15', totals.get('total_iva', 0)):.2f}"],
        [Paragraph("<b>IRBPNR</b>", style_small), "0.00"],
        [Paragraph("<b>PROPINA</b>", style_small), "0.00"],
        [Paragraph("<b>VALOR TOTAL</b>", style_bold_small), f"{totals.get('total', 0):.2f}"],
    ]
    
    totals_table = Table(totals_data, colWidths=[5.5*cm, 2.5*cm])
    totals_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    
    # Combinar info + totales
    footer_table = Table([[info_table, totals_table]], colWidths=[10.5*cm, 8.5*cm])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(footer_table)
    elements.append(Spacer(1, 4*mm))
    
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
            "21": "ENDOSO DE TÍTULOS",
        }
        
        payment_header = [
            Paragraph("<b>Forma de Pago</b>", style_small),
            Paragraph("<b>Valor</b>", style_small),
            Paragraph("<b>Plazo</b>", style_small),
            Paragraph("<b>Tiempo</b>", style_small),
        ]
        
        payment_data = [payment_header]
        
        for payment in payments:
            method = payment.get('method', '01')
            payment_data.append([
                Paragraph(payment_names.get(method, method), style_small),
                Paragraph(f"{payment.get('total', 0):.2f}", style_center_small),
                Paragraph(str(payment.get('term', 0)), style_center_small),
                Paragraph(payment.get('time_unit', 'días'), style_center_small),
            ])
        
        payment_table = Table(payment_data, colWidths=[10*cm, 3*cm, 3*cm, 3*cm])
        payment_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(payment_table)
    
    # Construir PDF
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
