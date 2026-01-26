"""
Modelos Pydantic para Certificados Digitales
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CertificateInfo(BaseModel):
    subject: str
    issuer: str
    serial_number: str
    valid_from: datetime
    valid_to: datetime

class CertificateUpload(BaseModel):
    password: str = Field(..., min_length=1)

class CertificateResponse(BaseModel):
    tenant_id: str
    certificate_info: CertificateInfo
    is_active: bool
    uploaded_at: datetime
    days_until_expiry: int

class CertificateInDB(BaseModel):
    tenant_id: str
    file_data: bytes
    password_encrypted: str
    certificate_info: dict
    is_active: bool
    uploaded_at: datetime
    uploaded_by: Optional[str] = None
