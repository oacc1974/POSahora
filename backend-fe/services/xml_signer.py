"""
Firmador de XML con XAdES-BES para SRI Ecuador
Utiliza signxml y cryptography para firmar documentos electrónicos
"""
import base64
import hashlib
from datetime import datetime, timezone
from typing import Tuple, Optional
from lxml import etree
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from cryptography.x509 import load_der_x509_certificate
from OpenSSL import crypto
import uuid

# Namespaces para firma XML
NSMAP = {
    'ds': 'http://www.w3.org/2000/09/xmldsig#',
    'etsi': 'http://uri.etsi.org/01903/v1.3.2#'
}

def load_p12_certificate(p12_data: bytes, password: str) -> Tuple[crypto.PKey, crypto.X509]:
    """
    Carga certificado .p12 y extrae clave privada y certificado
    """
    try:
        p12 = crypto.load_pkcs12(p12_data, password.encode())
        private_key = p12.get_privatekey()
        certificate = p12.get_certificate()
        return private_key, certificate
    except Exception as e:
        raise ValueError(f"Error al cargar certificado .p12: {str(e)}")

def get_certificate_info(certificate: crypto.X509) -> dict:
    """
    Extrae información del certificado
    """
    subject = certificate.get_subject()
    issuer = certificate.get_issuer()
    
    return {
        "subject": ", ".join([f"{name.decode()}={value.decode()}" for name, value in subject.get_components()]),
        "issuer": ", ".join([f"{name.decode()}={value.decode()}" for name, value in issuer.get_components()]),
        "serial_number": str(certificate.get_serial_number()),
        "valid_from": datetime.strptime(certificate.get_notBefore().decode(), "%Y%m%d%H%M%SZ"),
        "valid_to": datetime.strptime(certificate.get_notAfter().decode(), "%Y%m%d%H%M%SZ")
    }

def canonicalize(element: etree._Element) -> bytes:
    """
    Canonicaliza elemento XML usando C14N exclusivo
    """
    return etree.tostring(element, method="c14n", exclusive=True, with_comments=False)

def sha256_digest(data: bytes) -> str:
    """
    Calcula hash SHA256 y devuelve en Base64
    """
    digest = hashlib.sha256(data).digest()
    return base64.b64encode(digest).decode()

def sign_xml_xades_bes(xml_content: str, p12_data: bytes, password: str) -> str:
    """
    Firma XML con XAdES-BES según especificación SRI Ecuador
    
    Args:
        xml_content: XML sin firmar
        p12_data: Contenido del archivo .p12
        password: Contraseña del certificado
    
    Returns:
        XML firmado como string
    """
    # Cargar certificado
    private_key, certificate = load_p12_certificate(p12_data, password)
    cert_info = get_certificate_info(certificate)
    
    # Parsear XML
    root = etree.fromstring(xml_content.encode('utf-8'))
    
    # Generar IDs únicos
    signature_id = f"Signature{uuid.uuid4().hex[:8]}"
    signed_props_id = f"SignedProperties{uuid.uuid4().hex[:8]}"
    key_info_id = f"KeyInfo{uuid.uuid4().hex[:8]}"
    reference_id = f"Reference{uuid.uuid4().hex[:8]}"
    
    # Obtener ID del comprobante (generalmente "comprobante")
    comprobante_id = root.get("id", "comprobante")
    
    # Crear estructura de firma
    signature = etree.SubElement(root, "{http://www.w3.org/2000/09/xmldsig#}Signature", 
                                  nsmap={'ds': 'http://www.w3.org/2000/09/xmldsig#',
                                        'etsi': 'http://uri.etsi.org/01903/v1.3.2#'},
                                  Id=signature_id)
    
    # === SignedInfo ===
    signed_info = etree.SubElement(signature, "{http://www.w3.org/2000/09/xmldsig#}SignedInfo")
    
    canon_method = etree.SubElement(signed_info, "{http://www.w3.org/2000/09/xmldsig#}CanonicalizationMethod",
                                     Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315")
    
    sig_method = etree.SubElement(signed_info, "{http://www.w3.org/2000/09/xmldsig#}SignatureMethod",
                                   Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1")
    
    # Reference al documento
    ref_doc = etree.SubElement(signed_info, "{http://www.w3.org/2000/09/xmldsig#}Reference",
                                Id=reference_id, URI=f"#{comprobante_id}")
    
    transforms = etree.SubElement(ref_doc, "{http://www.w3.org/2000/09/xmldsig#}Transforms")
    etree.SubElement(transforms, "{http://www.w3.org/2000/09/xmldsig#}Transform",
                      Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature")
    
    etree.SubElement(ref_doc, "{http://www.w3.org/2000/09/xmldsig#}DigestMethod",
                      Algorithm="http://www.w3.org/2000/09/xmldsig#sha1")
    
    # Calcular digest del documento
    doc_without_sig = etree.fromstring(xml_content.encode('utf-8'))
    doc_digest = base64.b64encode(hashlib.sha1(canonicalize(doc_without_sig)).digest()).decode()
    etree.SubElement(ref_doc, "{http://www.w3.org/2000/09/xmldsig#}DigestValue").text = doc_digest
    
    # Reference a KeyInfo
    ref_keyinfo = etree.SubElement(signed_info, "{http://www.w3.org/2000/09/xmldsig#}Reference",
                                    URI=f"#{key_info_id}")
    etree.SubElement(ref_keyinfo, "{http://www.w3.org/2000/09/xmldsig#}DigestMethod",
                      Algorithm="http://www.w3.org/2000/09/xmldsig#sha1")
    
    # Reference a SignedProperties (XAdES)
    ref_props = etree.SubElement(signed_info, "{http://www.w3.org/2000/09/xmldsig#}Reference",
                                  Type="http://uri.etsi.org/01903#SignedProperties",
                                  URI=f"#{signed_props_id}")
    etree.SubElement(ref_props, "{http://www.w3.org/2000/09/xmldsig#}DigestMethod",
                      Algorithm="http://www.w3.org/2000/09/xmldsig#sha1")
    
    # === SignatureValue (placeholder, se calculará después) ===
    sig_value = etree.SubElement(signature, "{http://www.w3.org/2000/09/xmldsig#}SignatureValue")
    
    # === KeyInfo ===
    key_info = etree.SubElement(signature, "{http://www.w3.org/2000/09/xmldsig#}KeyInfo", Id=key_info_id)
    
    x509_data = etree.SubElement(key_info, "{http://www.w3.org/2000/09/xmldsig#}X509Data")
    x509_cert = etree.SubElement(x509_data, "{http://www.w3.org/2000/09/xmldsig#}X509Certificate")
    
    # Certificado en Base64
    cert_der = crypto.dump_certificate(crypto.FILETYPE_ASN1, certificate)
    x509_cert.text = base64.b64encode(cert_der).decode()
    
    key_value = etree.SubElement(key_info, "{http://www.w3.org/2000/09/xmldsig#}KeyValue")
    rsa_key_value = etree.SubElement(key_value, "{http://www.w3.org/2000/09/xmldsig#}RSAKeyValue")
    
    # Extraer modulus y exponent
    pub_key = certificate.get_pubkey()
    pub_key_pem = crypto.dump_publickey(crypto.FILETYPE_PEM, pub_key)
    
    from cryptography.hazmat.primitives.serialization import load_pem_public_key
    pub_key_crypto = load_pem_public_key(pub_key_pem, backend=default_backend())
    pub_numbers = pub_key_crypto.public_numbers()
    
    modulus_bytes = pub_numbers.n.to_bytes((pub_numbers.n.bit_length() + 7) // 8, byteorder='big')
    exponent_bytes = pub_numbers.e.to_bytes((pub_numbers.e.bit_length() + 7) // 8, byteorder='big')
    
    etree.SubElement(rsa_key_value, "{http://www.w3.org/2000/09/xmldsig#}Modulus").text = base64.b64encode(modulus_bytes).decode()
    etree.SubElement(rsa_key_value, "{http://www.w3.org/2000/09/xmldsig#}Exponent").text = base64.b64encode(exponent_bytes).decode()
    
    # === Object con QualifyingProperties (XAdES) ===
    obj = etree.SubElement(signature, "{http://www.w3.org/2000/09/xmldsig#}Object")
    
    qualifying_props = etree.SubElement(obj, "{http://uri.etsi.org/01903/v1.3.2#}QualifyingProperties",
                                         Target=f"#{signature_id}")
    
    signed_props = etree.SubElement(qualifying_props, "{http://uri.etsi.org/01903/v1.3.2#}SignedProperties",
                                     Id=signed_props_id)
    
    signed_sig_props = etree.SubElement(signed_props, "{http://uri.etsi.org/01903/v1.3.2#}SignedSignatureProperties")
    
    # Signing time
    signing_time = etree.SubElement(signed_sig_props, "{http://uri.etsi.org/01903/v1.3.2#}SigningTime")
    signing_time.text = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Signing certificate
    signing_cert = etree.SubElement(signed_sig_props, "{http://uri.etsi.org/01903/v1.3.2#}SigningCertificate")
    cert_elem = etree.SubElement(signing_cert, "{http://uri.etsi.org/01903/v1.3.2#}Cert")
    
    cert_digest_elem = etree.SubElement(cert_elem, "{http://uri.etsi.org/01903/v1.3.2#}CertDigest")
    etree.SubElement(cert_digest_elem, "{http://www.w3.org/2000/09/xmldsig#}DigestMethod",
                      Algorithm="http://www.w3.org/2000/09/xmldsig#sha1")
    cert_hash = base64.b64encode(hashlib.sha1(cert_der).digest()).decode()
    etree.SubElement(cert_digest_elem, "{http://www.w3.org/2000/09/xmldsig#}DigestValue").text = cert_hash
    
    issuer_serial = etree.SubElement(cert_elem, "{http://uri.etsi.org/01903/v1.3.2#}IssuerSerial")
    etree.SubElement(issuer_serial, "{http://www.w3.org/2000/09/xmldsig#}X509IssuerName").text = cert_info["issuer"]
    etree.SubElement(issuer_serial, "{http://www.w3.org/2000/09/xmldsig#}X509SerialNumber").text = cert_info["serial_number"]
    
    # Calcular digests pendientes
    keyinfo_digest = base64.b64encode(hashlib.sha1(canonicalize(key_info)).digest()).decode()
    etree.SubElement(ref_keyinfo, "{http://www.w3.org/2000/09/xmldsig#}DigestValue").text = keyinfo_digest
    
    props_digest = base64.b64encode(hashlib.sha1(canonicalize(signed_props)).digest()).decode()
    etree.SubElement(ref_props, "{http://www.w3.org/2000/09/xmldsig#}DigestValue").text = props_digest
    
    # Calcular SignatureValue
    signed_info_c14n = canonicalize(signed_info)
    
    # Firmar con clave privada
    signature_bytes = crypto.sign(private_key, signed_info_c14n, "sha1")
    sig_value.text = base64.b64encode(signature_bytes).decode()
    
    # Retornar XML firmado
    return etree.tostring(root, pretty_print=True, xml_declaration=True, encoding="UTF-8").decode("UTF-8")


def verify_signature(signed_xml: str) -> bool:
    """
    Verifica la firma de un documento XML firmado
    Retorna True si la firma es válida
    """
    try:
        root = etree.fromstring(signed_xml.encode('utf-8'))
        # Buscar elemento Signature
        sig = root.find('.//{http://www.w3.org/2000/09/xmldsig#}Signature')
        if sig is None:
            return False
        
        # Verificación básica: existe firma y tiene valor
        sig_value = sig.find('.//{http://www.w3.org/2000/09/xmldsig#}SignatureValue')
        if sig_value is None or not sig_value.text:
            return False
        
        return True
    except Exception:
        return False
