"""
Firmador de XML con XAdES-BES específico para SRI Ecuador
Basado en la especificación oficial del SRI
"""
import base64
import hashlib
import random
from datetime import datetime, timezone
from lxml import etree
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization import pkcs12


def sha1_base64(data: bytes) -> str:
    """Calcula SHA1 y devuelve en Base64"""
    digest = hashlib.sha1(data).digest()
    return base64.b64encode(digest).decode()


def canonicalize_c14n(xml_str: str) -> bytes:
    """Canonicaliza XML usando C14N"""
    root = etree.fromstring(xml_str.encode('utf-8') if isinstance(xml_str, str) else xml_str)
    return etree.tostring(root, method="c14n", exclusive=False, with_comments=False)


def format_issuer_name(certificate) -> str:
    """Formatea el issuer del certificado según formato SRI"""
    parts = []
    # Orden específico que usa el SRI
    oid_order = ['CN', 'L', 'ST', 'OU', 'O', 'C']
    oid_map = {
        '2.5.4.3': 'CN',
        '2.5.4.7': 'L', 
        '2.5.4.8': 'ST',
        '2.5.4.11': 'OU',
        '2.5.4.10': 'O',
        '2.5.4.6': 'C',
    }
    
    issuer_dict = {}
    for attr in certificate.issuer:
        oid = attr.oid.dotted_string
        if oid in oid_map:
            issuer_dict[oid_map[oid]] = attr.value
    
    # Construir en orden específico
    for key in oid_order:
        if key in issuer_dict:
            parts.append(f"{key}={issuer_dict[key]}")
    
    return ','.join(parts)


def sign_xml_xades_sri(xml_content: str, p12_data: bytes, password: str) -> str:
    """
    Firma XML con XAdES-BES según especificación SRI Ecuador
    
    Args:
        xml_content: XML del comprobante sin firmar
        p12_data: Contenido del archivo .p12
        password: Contraseña del certificado
    
    Returns:
        XML firmado como string
    """
    # Cargar certificado
    private_key, certificate, _ = pkcs12.load_key_and_certificates(
        p12_data, password.encode(), default_backend()
    )
    
    # Generar números aleatorios para IDs (como hace el SRI)
    rand = random.randint(100000, 999999)
    signature_number = rand
    signed_properties_number = rand + 1
    certificate_number = rand + 2
    signed_info_number = rand + 3
    signed_properties_id_number = rand + 4
    reference_id_number = rand + 5
    object_number = rand + 6
    
    # Obtener datos del certificado
    cert_der = certificate.public_bytes(serialization.Encoding.DER)
    cert_b64 = base64.b64encode(cert_der).decode()
    cert_sha1 = sha1_base64(cert_der)
    
    # Modulus y exponente de la clave pública
    pub_key = certificate.public_key()
    pub_numbers = pub_key.public_numbers()
    modulus_bytes = pub_numbers.n.to_bytes((pub_numbers.n.bit_length() + 7) // 8, byteorder='big')
    exponent_bytes = pub_numbers.e.to_bytes((pub_numbers.e.bit_length() + 7) // 8, byteorder='big')
    modulus_b64 = base64.b64encode(modulus_bytes).decode()
    exponent_b64 = base64.b64encode(exponent_bytes).decode()
    
    # Serial number y issuer
    serial_number = str(certificate.serial_number)
    issuer_name = format_issuer_name(certificate)
    
    # Fecha/hora de firma
    signing_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # 1. Crear SignedProperties
    signed_properties = f'''<etsi:SignedProperties Id="Signature{signature_number}-SignedProperties{signed_properties_number}">
<etsi:SignedSignatureProperties>
<etsi:SigningTime>{signing_time}</etsi:SigningTime>
<etsi:SigningCertificate>
<etsi:Cert>
<etsi:CertDigest>
<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<ds:DigestValue>{cert_sha1}</ds:DigestValue>
</etsi:CertDigest>
<etsi:IssuerSerial>
<ds:X509IssuerName>{issuer_name}</ds:X509IssuerName>
<ds:X509SerialNumber>{serial_number}</ds:X509SerialNumber>
</etsi:IssuerSerial>
</etsi:Cert>
</etsi:SigningCertificate>
</etsi:SignedSignatureProperties>
<etsi:SignedDataObjectProperties>
<etsi:DataObjectFormat ObjectReference="#Reference-ID-{reference_id_number}">
<etsi:Description>contenido comprobante</etsi:Description>
<etsi:MimeType>text/xml</etsi:MimeType>
</etsi:DataObjectFormat>
</etsi:SignedDataObjectProperties>
</etsi:SignedProperties>'''
    
    # Limpiar espacios
    signed_properties = signed_properties.replace('\n', '').replace('  ', '')
    
    # 2. Crear KeyInfo
    key_info = f'''<ds:KeyInfo Id="Certificate{certificate_number}">
<ds:X509Data>
<ds:X509Certificate>{cert_b64}</ds:X509Certificate>
</ds:X509Data>
<ds:KeyValue>
<ds:RSAKeyValue>
<ds:Modulus>{modulus_b64}</ds:Modulus>
<ds:Exponent>{exponent_b64}</ds:Exponent>
</ds:RSAKeyValue>
</ds:KeyValue>
</ds:KeyInfo>'''
    
    key_info = key_info.replace('\n', '')
    
    # 3. Calcular digests
    # Parsear XML para agregar namespaces si no los tiene
    xml_clean = xml_content.replace('<?xml version="1.0" encoding="UTF-8"?>', '').strip()
    xml_clean = xml_content.strip()
    
    # SHA1 del comprobante (sin firma)
    comprobante_c14n = canonicalize_c14n(xml_clean)
    sha1_comprobante = sha1_base64(comprobante_c14n)
    
    # SHA1 de SignedProperties (con namespaces)
    signed_props_with_ns = signed_properties.replace(
        '<etsi:SignedProperties',
        '<etsi:SignedProperties xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#"'
    )
    sha1_signed_properties = sha1_base64(signed_props_with_ns.encode('utf-8'))
    
    # SHA1 de KeyInfo (con namespace)
    key_info_with_ns = key_info.replace(
        '<ds:KeyInfo',
        '<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"'
    )
    sha1_certificado = sha1_base64(key_info_with_ns.encode('utf-8'))
    
    # 4. Crear SignedInfo
    signed_info = f'''<ds:SignedInfo Id="Signature-SignedInfo{signed_info_number}">
<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<ds:Reference Id="SignedPropertiesID{signed_properties_id_number}" Type="http://uri.etsi.org/01903#SignedProperties" URI="#Signature{signature_number}-SignedProperties{signed_properties_number}">
<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<ds:DigestValue>{sha1_signed_properties}</ds:DigestValue>
</ds:Reference>
<ds:Reference URI="#Certificate{certificate_number}">
<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<ds:DigestValue>{sha1_certificado}</ds:DigestValue>
</ds:Reference>
<ds:Reference Id="Reference-ID-{reference_id_number}" URI="#comprobante">
<ds:Transforms>
<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
</ds:Transforms>
<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<ds:DigestValue>{sha1_comprobante}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>'''
    
    signed_info = signed_info.replace('\n', '')
    
    # 5. Firmar SignedInfo
    signed_info_with_ns = signed_info.replace(
        '<ds:SignedInfo',
        '<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"'
    )
    
    signature_bytes = private_key.sign(
        signed_info_with_ns.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA1()
    )
    signature_value = base64.b64encode(signature_bytes).decode()
    
    # 6. Construir firma completa XAdES-BES
    xades_signature = f'''<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Id="Signature{signature_number}">
{signed_info}
<ds:SignatureValue Id="SignatureValue{signature_number}">{signature_value}</ds:SignatureValue>
{key_info}
<ds:Object Id="Signature{signature_number}-Object{object_number}"><etsi:QualifyingProperties Target="#Signature{signature_number}">{signed_properties}</etsi:QualifyingProperties></ds:Object>
</ds:Signature>'''
    
    # 7. Insertar firma en el XML usando lxml para evitar errores
    from lxml import etree
    
    # Remover declaración XML si existe para parsear
    xml_for_parse = xml_clean
    if xml_for_parse.startswith('<?xml'):
        xml_for_parse = xml_for_parse.split('?>', 1)[1].strip()
    
    # Parsear XML original
    root = etree.fromstring(xml_for_parse.encode('utf-8'))
    
    # Parsear la firma
    sig_element = etree.fromstring(xades_signature.encode('utf-8'))
    
    # Agregar firma al final del documento (antes del cierre)
    root.append(sig_element)
    
    # Serializar
    signed_xml = etree.tostring(root, encoding='unicode', pretty_print=False)
    
    # Agregar declaración XML
    signed_xml = '<?xml version="1.0" encoding="UTF-8"?>' + signed_xml
    
    return signed_xml
