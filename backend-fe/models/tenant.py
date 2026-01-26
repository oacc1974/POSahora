"""
Modelos Pydantic para Tenants (Empresas/Clientes)
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class AddressModel(BaseModel):
    provincia: str = ""
    canton: str = ""
    direccion: str = ""

class TenantCreate(BaseModel):
    ruc: str = Field(..., min_length=13, max_length=13)
    razon_social: str = Field(..., min_length=1, max_length=300)
    nombre_comercial: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: AddressModel = AddressModel()

class TenantResponse(BaseModel):
    tenant_id: str
    ruc: str
    razon_social: str
    nombre_comercial: Optional[str]
    email: str
    phone: Optional[str]
    address: dict
    is_active: bool
    created_at: datetime

class TenantInDB(BaseModel):
    tenant_id: str
    ruc: str
    razon_social: str
    nombre_comercial: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: dict = {}
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
