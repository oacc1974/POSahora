"""
Generador de XML para Documentos Electrónicos SRI Ecuador
Soporta: Facturas (01), Notas de Crédito (04)
Versión XML: 2.1.0
"""
from lxml import etree
from datetime import datetime
from typing import List, Dict, Optional
import re

# Mapeo de tarifas IVA a códigos SRI
IVA_CODES = {
    0: "0",      # 0%
    12: "2",     # 12%
    14: "3",     # 14%
    15: "4",     # 15% (vigente desde 2024)
}

# Códigos de impuestos
CODIGO_IVA = "2"
CODIGO_ICE = "3"
CODIGO_IRBPNR = "5"

def clean_xml_string(text: str) -> str:
    """Limpia caracteres no permitidos en XML"""
    if not text:
        return ""
    # Remover caracteres de control excepto tab, newline, carriage return
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', str(text))
    # Escapar caracteres especiales XML
    cleaned = cleaned.replace('&', '&amp;')
    cleaned = cleaned.replace('<', '&lt;')
    cleaned = cleaned.replace('>', '&gt;')
    cleaned = cleaned.replace('"', '&quot;')
    cleaned = cleaned.replace("'", '&apos;')
    return cleaned[:300]  # Limitar longitud

def format_decimal(value: float, decimals: int = 2) -> str:
    """Formatea número decimal según SRI (punto como separador)"""
    return f"{value:.{decimals}f}"

def get_iva_code(rate: float) -> str:
    """Obtiene código SRI para tasa de IVA"""
    rate_int = int(rate)
    return IVA_CODES.get(rate_int, "4")  # Default 15%

def generate_invoice_xml(
    access_key: str,
    emitter: dict,
    customer: dict,
    items: List[dict],
    totals: dict,
    payments: List[dict],
    issue_date: datetime,
    store_code: str,
    emission_point: str,
    sequential: int,
    ambiente: str = "pruebas"
) -> str:
    """
    Genera XML de Factura según formato SRI Ecuador v2.1.0
    """
    # Crear elemento raíz
    factura = etree.Element("factura", id="comprobante", version="2.1.0")
    
    # === INFO TRIBUTARIA ===
    info_tributaria = etree.SubElement(factura, "infoTributaria")
    
    # Ambiente: 1=Pruebas, 2=Producción (según documentación SRI)
    etree.SubElement(info_tributaria, "ambiente").text = "1" if ambiente == "pruebas" else "2"
    etree.SubElement(info_tributaria, "tipoEmision").text = "1"  # Normal
    etree.SubElement(info_tributaria, "razonSocial").text = clean_xml_string(emitter["razon_social"])
    
    if emitter.get("nombre_comercial"):
        etree.SubElement(info_tributaria, "nombreComercial").text = clean_xml_string(emitter["nombre_comercial"])
    
    etree.SubElement(info_tributaria, "ruc").text = emitter["ruc"]
    etree.SubElement(info_tributaria, "claveAcceso").text = access_key
    etree.SubElement(info_tributaria, "codDoc").text = "01"  # Factura
    etree.SubElement(info_tributaria, "estab").text = store_code.zfill(3)
    etree.SubElement(info_tributaria, "ptoEmi").text = emission_point.zfill(3)
    etree.SubElement(info_tributaria, "secuencial").text = str(sequential).zfill(9)
    etree.SubElement(info_tributaria, "dirMatriz").text = clean_xml_string(emitter["direccion"])
    
    # === INFO FACTURA ===
    info_factura = etree.SubElement(factura, "infoFactura")
    
    # La fecha de emisión viene ya ajustada según el ambiente desde la ruta
    etree.SubElement(info_factura, "fechaEmision").text = issue_date.strftime("%d/%m/%Y")
    
    if emitter.get("direccion"):
        etree.SubElement(info_factura, "dirEstablecimiento").text = clean_xml_string(emitter["direccion"])
    
    if emitter.get("contribuyente_especial"):
        etree.SubElement(info_factura, "contribuyenteEspecial").text = emitter["contribuyente_especial"]
    
    etree.SubElement(info_factura, "obligadoContabilidad").text = emitter.get("obligado_contabilidad", "NO")
    etree.SubElement(info_factura, "tipoIdentificacionComprador").text = customer["identification_type"]
    
    if customer.get("guia_remision"):
        etree.SubElement(info_factura, "guiaRemision").text = customer["guia_remision"]
    
    etree.SubElement(info_factura, "razonSocialComprador").text = clean_xml_string(customer["name"])
    etree.SubElement(info_factura, "identificacionComprador").text = customer["identification"]
    
    if customer.get("address"):
        etree.SubElement(info_factura, "direccionComprador").text = clean_xml_string(customer["address"])
    
    # Calcular total de IVA
    total_iva = totals.get("total_iva", 0) or (
        totals.get("total_iva_0", 0) + 
        totals.get("total_iva_12", 0) + 
        totals.get("total_iva_15", 0)
    )
    
    # Totales
    etree.SubElement(info_factura, "totalSinImpuestos").text = format_decimal(totals["total"] - total_iva)
    etree.SubElement(info_factura, "totalDescuento").text = format_decimal(totals.get("total_discount", 0))
    
    # Total con impuestos
    total_con_impuestos = etree.SubElement(info_factura, "totalConImpuestos")
    
    # IVA 0%
    if totals.get("subtotal_0", 0) > 0:
        total_impuesto = etree.SubElement(total_con_impuestos, "totalImpuesto")
        etree.SubElement(total_impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(total_impuesto, "codigoPorcentaje").text = "0"
        etree.SubElement(total_impuesto, "baseImponible").text = format_decimal(totals["subtotal_0"])
        etree.SubElement(total_impuesto, "valor").text = format_decimal(0)
    
    # IVA 12%
    if totals.get("subtotal_12", 0) > 0:
        total_impuesto = etree.SubElement(total_con_impuestos, "totalImpuesto")
        etree.SubElement(total_impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(total_impuesto, "codigoPorcentaje").text = "2"
        etree.SubElement(total_impuesto, "baseImponible").text = format_decimal(totals["subtotal_12"])
        etree.SubElement(total_impuesto, "valor").text = format_decimal(totals["total_iva_12"])
    
    # IVA 15%
    if totals.get("subtotal_15", 0) > 0:
        total_impuesto = etree.SubElement(total_con_impuestos, "totalImpuesto")
        etree.SubElement(total_impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(total_impuesto, "codigoPorcentaje").text = "4"
        etree.SubElement(total_impuesto, "baseImponible").text = format_decimal(totals["subtotal_15"])
        etree.SubElement(total_impuesto, "valor").text = format_decimal(totals["total_iva_15"])
    
    etree.SubElement(info_factura, "propina").text = format_decimal(totals.get("propina", 0))
    etree.SubElement(info_factura, "importeTotal").text = format_decimal(totals["total"])
    etree.SubElement(info_factura, "moneda").text = "DOLAR"
    
    # Pagos
    pagos = etree.SubElement(info_factura, "pagos")
    for payment in payments:
        pago = etree.SubElement(pagos, "pago")
        etree.SubElement(pago, "formaPago").text = payment.get("method", "01")
        etree.SubElement(pago, "total").text = format_decimal(payment["total"])
        if payment.get("term", 0) > 0:
            etree.SubElement(pago, "plazo").text = str(payment["term"])
            etree.SubElement(pago, "unidadTiempo").text = payment.get("time_unit", "dias")
    
    # === DETALLES ===
    detalles = etree.SubElement(factura, "detalles")
    
    for i, item in enumerate(items):
        detalle = etree.SubElement(detalles, "detalle")
        
        etree.SubElement(detalle, "codigoPrincipal").text = item["code"][:25]
        
        if item.get("auxiliary_code"):
            etree.SubElement(detalle, "codigoAuxiliar").text = item["auxiliary_code"][:25]
        
        etree.SubElement(detalle, "descripcion").text = clean_xml_string(item["description"])
        etree.SubElement(detalle, "cantidad").text = format_decimal(item["quantity"], 6)
        etree.SubElement(detalle, "precioUnitario").text = format_decimal(item["unit_price"], 6)
        etree.SubElement(detalle, "descuento").text = format_decimal(item.get("discount", 0))
        
        # Precio total sin impuesto
        subtotal = item["quantity"] * item["unit_price"] - item.get("discount", 0)
        etree.SubElement(detalle, "precioTotalSinImpuesto").text = format_decimal(subtotal)
        
        # Impuestos del detalle
        impuestos = etree.SubElement(detalle, "impuestos")
        impuesto = etree.SubElement(impuestos, "impuesto")
        
        etree.SubElement(impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(impuesto, "codigoPorcentaje").text = get_iva_code(item.get("iva_rate", 15))
        etree.SubElement(impuesto, "tarifa").text = format_decimal(item.get("iva_rate", 15))
        etree.SubElement(impuesto, "baseImponible").text = format_decimal(subtotal)
        
        iva_amount = subtotal * item.get("iva_rate", 15) / 100
        etree.SubElement(impuesto, "valor").text = format_decimal(iva_amount)
    
    # Generar XML string
    return etree.tostring(factura, pretty_print=True, xml_declaration=True, encoding="UTF-8").decode("UTF-8")


def generate_credit_note_xml(
    access_key: str,
    emitter: dict,
    customer: dict,
    items: List[dict],
    totals: dict,
    invoice_reference: dict,
    issue_date: datetime,
    store_code: str,
    emission_point: str,
    sequential: int,
    ambiente: str = "pruebas"
) -> str:
    """
    Genera XML de Nota de Crédito según formato SRI Ecuador v1.1.0
    """
    # Crear elemento raíz
    nota_credito = etree.Element("notaCredito", id="comprobante", version="1.1.0")
    
    # === INFO TRIBUTARIA ===
    info_tributaria = etree.SubElement(nota_credito, "infoTributaria")
    
    etree.SubElement(info_tributaria, "ambiente").text = "1" if ambiente == "pruebas" else "2"
    etree.SubElement(info_tributaria, "tipoEmision").text = "1"
    etree.SubElement(info_tributaria, "razonSocial").text = clean_xml_string(emitter["razon_social"])
    
    if emitter.get("nombre_comercial"):
        etree.SubElement(info_tributaria, "nombreComercial").text = clean_xml_string(emitter["nombre_comercial"])
    
    etree.SubElement(info_tributaria, "ruc").text = emitter["ruc"]
    etree.SubElement(info_tributaria, "claveAcceso").text = access_key
    etree.SubElement(info_tributaria, "codDoc").text = "04"  # Nota de crédito
    etree.SubElement(info_tributaria, "estab").text = store_code.zfill(3)
    etree.SubElement(info_tributaria, "ptoEmi").text = emission_point.zfill(3)
    etree.SubElement(info_tributaria, "secuencial").text = str(sequential).zfill(9)
    etree.SubElement(info_tributaria, "dirMatriz").text = clean_xml_string(emitter["direccion"])
    
    # === INFO NOTA CREDITO ===
    info_nc = etree.SubElement(nota_credito, "infoNotaCredito")
    
    etree.SubElement(info_nc, "fechaEmision").text = issue_date.strftime("%d/%m/%Y")
    
    if emitter.get("direccion"):
        etree.SubElement(info_nc, "dirEstablecimiento").text = clean_xml_string(emitter["direccion"])
    
    etree.SubElement(info_nc, "tipoIdentificacionComprador").text = customer["identification_type"]
    etree.SubElement(info_nc, "razonSocialComprador").text = clean_xml_string(customer["name"])
    etree.SubElement(info_nc, "identificacionComprador").text = customer["identification"]
    
    if emitter.get("contribuyente_especial"):
        etree.SubElement(info_nc, "contribuyenteEspecial").text = emitter["contribuyente_especial"]
    
    etree.SubElement(info_nc, "obligadoContabilidad").text = emitter.get("obligado_contabilidad", "NO")
    
    # Documento modificado
    etree.SubElement(info_nc, "codDocModificado").text = "01"  # Factura
    etree.SubElement(info_nc, "numDocModificado").text = invoice_reference["doc_number"]
    etree.SubElement(info_nc, "fechaEmisionDocSustento").text = invoice_reference["issue_date"].strftime("%d/%m/%Y")
    
    etree.SubElement(info_nc, "totalSinImpuestos").text = format_decimal(totals["total"] - totals["total_iva"])
    
    # Impuestos
    total_con_impuestos = etree.SubElement(info_nc, "totalConImpuestos")
    
    if totals.get("subtotal_0", 0) > 0:
        total_impuesto = etree.SubElement(total_con_impuestos, "totalImpuesto")
        etree.SubElement(total_impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(total_impuesto, "codigoPorcentaje").text = "0"
        etree.SubElement(total_impuesto, "baseImponible").text = format_decimal(totals["subtotal_0"])
        etree.SubElement(total_impuesto, "valor").text = format_decimal(0)
    
    if totals.get("subtotal_12", 0) > 0:
        total_impuesto = etree.SubElement(total_con_impuestos, "totalImpuesto")
        etree.SubElement(total_impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(total_impuesto, "codigoPorcentaje").text = "2"
        etree.SubElement(total_impuesto, "baseImponible").text = format_decimal(totals["subtotal_12"])
        etree.SubElement(total_impuesto, "valor").text = format_decimal(totals["total_iva_12"])
    
    if totals.get("subtotal_15", 0) > 0:
        total_impuesto = etree.SubElement(total_con_impuestos, "totalImpuesto")
        etree.SubElement(total_impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(total_impuesto, "codigoPorcentaje").text = "4"
        etree.SubElement(total_impuesto, "baseImponible").text = format_decimal(totals["subtotal_15"])
        etree.SubElement(total_impuesto, "valor").text = format_decimal(totals["total_iva_15"])
    
    etree.SubElement(info_nc, "valorModificacion").text = format_decimal(totals["total"])
    etree.SubElement(info_nc, "moneda").text = "DOLAR"
    
    # Motivo de la nota de crédito (va al final de infoNotaCredito)
    etree.SubElement(info_nc, "motivo").text = clean_xml_string(invoice_reference["reason"])
    
    # === DETALLES ===
    detalles = etree.SubElement(nota_credito, "detalles")
    
    for i, item in enumerate(items):
        detalle = etree.SubElement(detalles, "detalle")
        
        etree.SubElement(detalle, "codigoInterno").text = item["code"][:25]
        
        if item.get("auxiliary_code"):
            etree.SubElement(detalle, "codigoAdicional").text = item["auxiliary_code"][:25]
        
        etree.SubElement(detalle, "descripcion").text = clean_xml_string(item["description"])
        etree.SubElement(detalle, "cantidad").text = format_decimal(item["quantity"], 6)
        etree.SubElement(detalle, "precioUnitario").text = format_decimal(item["unit_price"], 6)
        etree.SubElement(detalle, "descuento").text = format_decimal(item.get("discount", 0))
        
        subtotal = item["quantity"] * item["unit_price"] - item.get("discount", 0)
        etree.SubElement(detalle, "precioTotalSinImpuesto").text = format_decimal(subtotal)
        
        impuestos = etree.SubElement(detalle, "impuestos")
        impuesto = etree.SubElement(impuestos, "impuesto")
        
        etree.SubElement(impuesto, "codigo").text = CODIGO_IVA
        etree.SubElement(impuesto, "codigoPorcentaje").text = get_iva_code(item.get("iva_rate", 15))
        etree.SubElement(impuesto, "tarifa").text = format_decimal(item.get("iva_rate", 15))
        etree.SubElement(impuesto, "baseImponible").text = format_decimal(subtotal)
        
        iva_amount = subtotal * item.get("iva_rate", 15) / 100
        etree.SubElement(impuesto, "valor").text = format_decimal(iva_amount)
    
    return etree.tostring(nota_credito, pretty_print=True, xml_declaration=True, encoding="UTF-8").decode("UTF-8")
