"""
Cliente SOAP para comunicación con Web Services del SRI Ecuador
Endpoints: RecepcionComprobantesOffline, AutorizacionComprobantesOffline
"""
import base64
import asyncio
from typing import Optional, Dict, List, Tuple
from datetime import datetime, timezone
from lxml import etree
import httpx

# URLs de Web Services SRI
SRI_ENDPOINTS = {
    "pruebas": {
        "recepcion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
        "autorizacion": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
    },
    "produccion": {
        "recepcion": "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
        "autorizacion": "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
    }
}

# Estados SRI
SRI_STATUS = {
    "RECIBIDA": "RECIBIDA",
    "DEVUELTA": "DEVUELTA", 
    "AUTORIZADO": "AUTORIZADO",
    "NO_AUTORIZADO": "NO_AUTORIZADO",
    "EN_PROCESO": "EN_PROCESO"
}

class SRIClient:
    """
    Cliente para interactuar con Web Services del SRI Ecuador
    """
    
    def __init__(self, ambiente: str = "pruebas"):
        """
        Inicializa el cliente con el ambiente especificado
        
        Args:
            ambiente: "pruebas" o "produccion"
        """
        self.ambiente = ambiente
        self.endpoints = SRI_ENDPOINTS[ambiente]
        self.timeout = 30.0
    
    def _build_soap_envelope(self, body_content: str) -> str:
        """
        Construye el envelope SOAP
        """
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
    <soapenv:Header/>
    <soapenv:Body>
        {body_content}
    </soapenv:Body>
</soapenv:Envelope>'''
    
    def _build_recepcion_body(self, xml_signed_b64: str) -> str:
        """
        Construye el body para el servicio de recepción
        """
        return f'''<ec:validarComprobante>
            <xml>{xml_signed_b64}</xml>
        </ec:validarComprobante>'''
    
    def _build_autorizacion_body(self, access_key: str) -> str:
        """
        Construye el body para el servicio de autorización
        """
        return f'''<ec:autorizacionComprobante xmlns:ec="http://ec.gob.sri.ws.autorizacion">
            <claveAccesoComprobante>{access_key}</claveAccesoComprobante>
        </ec:autorizacionComprobante>'''
    
    def _parse_recepcion_response(self, xml_response: str) -> Dict:
        """
        Parsea la respuesta del servicio de recepción
        """
        try:
            print(f"[SRI Client] Parseando respuesta recepción...")
            root = etree.fromstring(xml_response.encode('utf-8'))
            
            # Buscar estado - intentar diferentes namespaces
            estado = root.find('.//{http://ec.gob.sri.ws.recepcion}estado')
            if estado is None:
                # Probar sin namespace
                import re
                estado_match = re.search(r'<estado>([^<]+)</estado>', xml_response)
                if estado_match:
                    estado_text = estado_match.group(1)
                    print(f"[SRI Client] Estado encontrado con regex: {estado_text}")
                else:
                    estado_text = "ERROR"
                    print(f"[SRI Client] Estado no encontrado, raw: {xml_response[:500]}")
            else:
                estado_text = estado.text if estado is not None else "ERROR"
                print(f"[SRI Client] Estado encontrado con namespace: {estado_text}")
            
            # Buscar mensajes
            mensajes = []
            comprobantes = root.findall('.//{http://ec.gob.sri.ws.recepcion}comprobante')
            
            for comp in comprobantes:
                mensajes_elem = comp.findall('.//{http://ec.gob.sri.ws.recepcion}mensaje')
                for msg in mensajes_elem:
                    identificador = msg.find('{http://ec.gob.sri.ws.recepcion}identificador')
                    mensaje = msg.find('{http://ec.gob.sri.ws.recepcion}mensaje')
                    info_adicional = msg.find('{http://ec.gob.sri.ws.recepcion}informacionAdicional')
                    tipo = msg.find('{http://ec.gob.sri.ws.recepcion}tipo')
                    
                    mensajes.append({
                        "identificador": identificador.text if identificador is not None else "",
                        "mensaje": mensaje.text if mensaje is not None else "",
                        "informacion_adicional": info_adicional.text if info_adicional is not None else "",
                        "tipo": tipo.text if tipo is not None else ""
                    })
            
            return {
                "estado": estado_text,
                "mensajes": mensajes,
                "raw_response": xml_response
            }
            
        except Exception as e:
            return {
                "estado": "ERROR",
                "mensajes": [{"mensaje": f"Error parsing response: {str(e)}"}],
                "raw_response": xml_response
            }
    
    def _parse_autorizacion_response(self, xml_response: str) -> Dict:
        """
        Parsea la respuesta del servicio de autorización
        """
        try:
            root = etree.fromstring(xml_response.encode('utf-8'))
            
            # Buscar autorización
            autorizaciones = root.findall('.//{http://ec.gob.sri.ws.autorizacion}autorizacion')
            
            if not autorizaciones:
                return {
                    "estado": "EN_PROCESO",
                    "numero_autorizacion": None,
                    "fecha_autorizacion": None,
                    "mensajes": [],
                    "raw_response": xml_response
                }
            
            autorizacion = autorizaciones[0]
            
            estado = autorizacion.find('{http://ec.gob.sri.ws.autorizacion}estado')
            estado_text = estado.text if estado is not None else "ERROR"
            
            num_auth = autorizacion.find('{http://ec.gob.sri.ws.autorizacion}numeroAutorizacion')
            fecha_auth = autorizacion.find('{http://ec.gob.sri.ws.autorizacion}fechaAutorizacion')
            
            # Parsear mensajes
            mensajes = []
            mensajes_elem = autorizacion.findall('.//{http://ec.gob.sri.ws.autorizacion}mensaje')
            
            for msg in mensajes_elem:
                identificador = msg.find('{http://ec.gob.sri.ws.autorizacion}identificador')
                mensaje = msg.find('{http://ec.gob.sri.ws.autorizacion}mensaje')
                info_adicional = msg.find('{http://ec.gob.sri.ws.autorizacion}informacionAdicional')
                tipo = msg.find('{http://ec.gob.sri.ws.autorizacion}tipo')
                
                mensajes.append({
                    "identificador": identificador.text if identificador is not None else "",
                    "mensaje": mensaje.text if mensaje is not None else "",
                    "informacion_adicional": info_adicional.text if info_adicional is not None else "",
                    "tipo": tipo.text if tipo is not None else ""
                })
            
            fecha_auth_parsed = None
            if fecha_auth is not None and fecha_auth.text:
                try:
                    fecha_auth_parsed = datetime.fromisoformat(fecha_auth.text.replace('Z', '+00:00'))
                except:
                    pass
            
            return {
                "estado": estado_text,
                "numero_autorizacion": num_auth.text if num_auth is not None else None,
                "fecha_autorizacion": fecha_auth_parsed,
                "mensajes": mensajes,
                "raw_response": xml_response
            }
            
        except Exception as e:
            return {
                "estado": "ERROR",
                "numero_autorizacion": None,
                "fecha_autorizacion": None,
                "mensajes": [{"mensaje": f"Error parsing response: {str(e)}"}],
                "raw_response": xml_response
            }
    
    async def enviar_comprobante(self, xml_signed: str) -> Dict:
        """
        Envía un comprobante firmado al SRI para recepción
        
        Args:
            xml_signed: XML firmado como string
            
        Returns:
            Dict con estado y mensajes del SRI
        """
        # Codificar XML en Base64
        xml_b64 = base64.b64encode(xml_signed.encode('utf-8')).decode('utf-8')
        
        # Construir SOAP request
        body = self._build_recepcion_body(xml_b64)
        soap_request = self._build_soap_envelope(body)
        
        # URL del servicio (sin ?wsdl)
        url = self.endpoints["recepcion"].replace("?wsdl", "")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.post(
                    url,
                    content=soap_request,
                    headers={
                        "Content-Type": "text/xml; charset=utf-8",
                        "SOAPAction": ""
                    }
                )
                
                return self._parse_recepcion_response(response.text)
                
        except httpx.TimeoutException:
            return {
                "estado": "ERROR",
                "mensajes": [{"mensaje": "Timeout al conectar con SRI"}]
            }
        except Exception as e:
            return {
                "estado": "ERROR", 
                "mensajes": [{"mensaje": f"Error de conexión: {str(e)}"}]
            }
    
    async def consultar_autorizacion(self, access_key: str) -> Dict:
        """
        Consulta el estado de autorización de un comprobante
        
        Args:
            access_key: Clave de acceso de 49 dígitos
            
        Returns:
            Dict con estado de autorización
        """
        # Construir SOAP request
        body = self._build_autorizacion_body(access_key)
        soap_request = self._build_soap_envelope(body)
        
        # URL del servicio (sin ?wsdl)
        url = self.endpoints["autorizacion"].replace("?wsdl", "")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.post(
                    url,
                    content=soap_request,
                    headers={
                        "Content-Type": "text/xml; charset=utf-8",
                        "SOAPAction": ""
                    }
                )
                
                return self._parse_autorizacion_response(response.text)
                
        except httpx.TimeoutException:
            return {
                "estado": "ERROR",
                "numero_autorizacion": None,
                "fecha_autorizacion": None,
                "mensajes": [{"mensaje": "Timeout al conectar con SRI"}]
            }
        except Exception as e:
            return {
                "estado": "ERROR",
                "numero_autorizacion": None,
                "fecha_autorizacion": None,
                "mensajes": [{"mensaje": f"Error de conexión: {str(e)}"}]
            }
    
    async def emitir_y_autorizar(
        self, 
        xml_signed: str, 
        access_key: str,
        max_retries: int = 3,
        retry_delay: float = 2.0
    ) -> Tuple[str, Optional[str], Optional[datetime], List[Dict]]:
        """
        Proceso completo: enviar comprobante y esperar autorización
        
        Args:
            xml_signed: XML firmado
            access_key: Clave de acceso
            max_retries: Número máximo de intentos de autorización
            retry_delay: Segundos entre intentos
            
        Returns:
            Tuple (estado, numero_autorizacion, fecha_autorizacion, mensajes)
        """
        # 1. Enviar comprobante
        print(f"[SRI Client] Enviando comprobante...")
        recepcion = await self.enviar_comprobante(xml_signed)
        print(f"[SRI Client] Recepción estado: {recepcion['estado']}")
        
        if recepcion["estado"] == "DEVUELTA":
            print(f"[SRI Client] Comprobante devuelto: {recepcion['mensajes']}")
            return ("RECHAZADO", None, None, recepcion["mensajes"])
        
        if recepcion["estado"] == "ERROR":
            print(f"[SRI Client] Error en recepción: {recepcion['mensajes']}")
            return ("ERROR", None, None, recepcion["mensajes"])
        
        # 2. Esperar un momento antes de consultar
        print(f"[SRI Client] Comprobante recibido, consultando autorización...")
        await asyncio.sleep(1.0)
        
        # 3. Consultar autorización con reintentos
        for attempt in range(max_retries):
            print(f"[SRI Client] Intento {attempt + 1} de consulta autorización...")
            autorizacion = await self.consultar_autorizacion(access_key)
            print(f"[SRI Client] Autorización estado: {autorizacion['estado']}")
            
            if autorizacion["estado"] == "AUTORIZADO":
                print(f"[SRI Client] ¡AUTORIZADO! Núm: {autorizacion['numero_autorizacion']}")
                return (
                    "AUTORIZADO",
                    autorizacion["numero_autorizacion"],
                    autorizacion["fecha_autorizacion"],
                    autorizacion["mensajes"]
                )
            
            if autorizacion["estado"] == "NO_AUTORIZADO":
                return ("NO_AUTORIZADO", None, None, autorizacion["mensajes"])
            
            if autorizacion["estado"] == "ERROR":
                return ("ERROR", None, None, autorizacion["mensajes"])
            
            # Si está en proceso, esperar y reintentar
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
        
        # Si después de todos los intentos sigue en proceso
        return ("EN_PROCESO", None, None, [{"mensaje": "Documento en proceso de autorización"}])
