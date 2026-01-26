"""
Modelos Pydantic para Configuración Fiscal
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class Ambiente(str, Enum):
    PRUEBAS = "pruebas"
    PRODUCCION = "produccion"

class ObligadoContabilidad(str, Enum):
    SI = "SI"
    NO = "NO"

class EmitterConfig(BaseModel):
    ruc: str = Field(..., min_length=13, max_length=13)
    razon_social: str = Field(..., min_length=1, max_length=300)
    nombre_comercial: Optional[str] = None
    direccion: str = Field(..., min_length=1, max_length=300)
    telefono: Optional[str] = None
    email: EmailStr
    establecimiento: str = Field(default="001", min_length=3, max_length=3)
    punto_emision: str = Field(default="001", min_length=3, max_length=3)
    ambiente: Ambiente = Ambiente.PRUEBAS
    obligado_contabilidad: ObligadoContabilidad = ObligadoContabilidad.NO
    tipo_contribuyente: Optional[str] = None
    agente_retencion: Optional[str] = None

class FiscalConfigModel(BaseModel):
    iva_default: float = Field(default=15, ge=0)
    moneda: str = Field(default="DOLAR")
    decimales: int = Field(default=2, ge=0, le=6)
    incluir_iva_precio: bool = False

class SRIEndpointsModel(BaseModel):
    recepcion: str = "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl"
    autorizacion: str = "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"

class ConfigFiscalResponse(BaseModel):
    tenant_id: str
    ambiente: str
    obligado_contabilidad: str
    tipo_contribuyente: Optional[str]
    agente_retencion: Optional[str]
    config: dict
    sri_endpoints: dict
    is_configured: bool
    updated_at: datetime

class FullConfigResponse(BaseModel):
    emitter: Optional[dict] = None
    fiscal: Optional[dict] = None
    certificate: Optional[dict] = None
    is_configured: bool = False
    missing_config: list = []
