"""
Cliente para el servicio de firma XAdES Java
"""
import httpx
import base64
from typing import Optional

JAVA_SIGNER_URL = "http://localhost:8003/sign"


async def sign_xml_with_java(xml_content: str, p12_data: bytes, password: str) -> str:
    """
    Firma XML usando el servicio Java XAdES
    
    Args:
        xml_content: XML sin firmar
        p12_data: Contenido del archivo .p12 como bytes
        password: Contraseña del certificado
    
    Returns:
        XML firmado
    
    Raises:
        Exception si hay error en la firma
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            JAVA_SIGNER_URL,
            json={
                "xml": base64.b64encode(xml_content.encode('utf-8')).decode(),
                "p12": base64.b64encode(p12_data).decode(),
                "password": password
            }
        )
        
        result = response.json()
        
        if not result.get("success"):
            raise Exception(f"Error al firmar XML: {result.get('error', 'Error desconocido')}")
        
        signed_xml = base64.b64decode(result["signed_xml"]).decode('utf-8')
        return signed_xml


def sign_xml_with_java_sync(xml_content: str, p12_data: bytes, password: str) -> str:
    """
    Versión síncrona del firmador (para compatibilidad)
    """
    import asyncio
    return asyncio.run(sign_xml_with_java(xml_content, p12_data, password))
