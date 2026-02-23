"""
Modelos Pydantic para Empresas (Tenants)
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class EmpresaCreate(BaseModel):
    ruc: str = Field(..., min_length=13, max_length=13)
    razon_social: str = Field(..., min_length=3, max_length=300)
    nombre_comercial: Optional[str] = None
    direccion: str = Field(..., min_length=5, max_length=300)
    telefono: Optional[str] = None
    email: EmailStr
    establecimiento: str = Field(default="001", min_length=3, max_length=3)
    punto_emision: str = Field(default="001", min_length=3, max_length=3)
    ambiente: str = Field(default="pruebas", pattern="^(pruebas|produccion)$")
    obligado_contabilidad: str = Field(default="NO", pattern="^(SI|NO)$")
    tipo_contribuyente: Optional[str] = None
    agente_retencion: Optional[str] = None


class EmpresaUpdate(BaseModel):
    razon_social: Optional[str] = None
    nombre_comercial: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    ambiente: Optional[str] = None
    obligado_contabilidad: Optional[str] = None
    tipo_contribuyente: Optional[str] = None
    agente_retencion: Optional[str] = None


class EmpresaResponse(BaseModel):
    tenant_id: str
    ruc: str
    razon_social: str
    nombre_comercial: Optional[str] = None
    direccion: str
    telefono: Optional[str] = None
    email: str
    ambiente: str
    obligado_contabilidad: str
    is_active: bool
    has_certificate: bool = False
    certificate_expires: Optional[datetime] = None
    created_at: datetime


class EmpresaListResponse(BaseModel):
    empresas: List[EmpresaResponse]
    total: int
    page: int
    pages: int


class CertificateUpload(BaseModel):
    password: str = Field(..., min_length=1)


class UserEmpresaAssign(BaseModel):
    user_id: str
    tenant_ids: List[str]
