"""
Modelos Pydantic para Documentos Electrónicos (Facturas, Notas de Crédito)
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class DocType(str, Enum):
    FACTURA = "01"
    NOTA_CREDITO = "04"
    NOTA_DEBITO = "05"
    GUIA_REMISION = "06"
    RETENCION = "07"

class SRIStatus(str, Enum):
    PENDIENTE = "PENDIENTE"
    ENVIADO = "ENVIADO"
    AUTORIZADO = "AUTORIZADO"
    RECHAZADO = "RECHAZADO"
    NO_AUTORIZADO = "NO_AUTORIZADO"
    ERROR = "ERROR"

class IdentificationType(str, Enum):
    RUC = "04"
    CEDULA = "05"
    PASAPORTE = "06"
    CONSUMIDOR_FINAL = "07"

class PaymentMethod(str, Enum):
    SIN_UTILIZACION = "01"
    COMPENSACION = "15"
    TARJETA_DEBITO = "16"
    DINERO_ELECTRONICO = "17"
    TARJETA_PREPAGO = "18"
    TARJETA_CREDITO = "19"
    OTROS = "20"
    ENDOSO_TITULOS = "21"

class CustomerModel(BaseModel):
    identification_type: str = Field(..., description="04=RUC, 05=Cédula, 06=Pasaporte, 07=Consumidor final")
    identification: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=300)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ItemModel(BaseModel):
    sequence: Optional[int] = None
    code: str = Field(..., min_length=1, max_length=25)
    auxiliary_code: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=300)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    discount: float = Field(default=0, ge=0)
    iva_rate: float = Field(default=15, description="0, 12, 15")

class PaymentModel(BaseModel):
    method: str = Field(default="01", description="Código forma de pago SRI")
    total: float = Field(..., ge=0)
    term: int = Field(default=0, ge=0, description="Días plazo")
    time_unit: str = Field(default="dias")

class InvoiceCreate(BaseModel):
    store_code: str = Field(default="001", min_length=3, max_length=3)
    emission_point: str = Field(default="001", min_length=3, max_length=3)
    issue_date: Optional[datetime] = None
    customer: CustomerModel
    items: List[ItemModel] = Field(..., min_length=1)
    payments: List[PaymentModel] = Field(default=[])

class CreditNoteCreate(BaseModel):
    invoice_id: str = Field(..., description="ID de la factura original")
    reason: str = Field(..., min_length=1, max_length=300)
    items: List[ItemModel] = Field(..., min_length=1)

class InvoiceReferenceModel(BaseModel):
    invoice_id: str
    doc_number: str
    issue_date: datetime
    reason: str

class StoreInfoModel(BaseModel):
    code: str
    emission_point: str
    name: Optional[str] = None

class TotalsModel(BaseModel):
    subtotal_0: float = 0.0
    subtotal_12: float = 0.0
    subtotal_15: float = 0.0
    subtotal_not_subject: float = 0.0
    subtotal_exempt: float = 0.0
    total_discount: float = 0.0
    total_iva_0: float = 0.0
    total_iva_12: float = 0.0
    total_iva_15: float = 0.0
    total_iva: float = 0.0
    propina: float = 0.0
    total: float = 0.0

class DocumentResponse(BaseModel):
    document_id: str
    tenant_id: str
    doc_type: str
    doc_number: str
    access_key: str
    store: dict
    issue_date: datetime
    customer: dict
    items: List[dict]
    totals: dict
    payments: List[dict]
    sri_status: str
    sri_authorization_number: Optional[str] = None
    sri_authorization_date: Optional[datetime] = None
    sri_messages: List[dict] = []
    created_at: datetime
    is_voided: bool = False
    has_credit_note: bool = False
    invoice_reference: Optional[dict] = None

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    pages: int

class DocumentCreateResponse(BaseModel):
    document_id: str
    doc_number: str
    access_key: str
    sri_status: str
    sri_authorization_number: Optional[str] = None
    sri_messages: List[dict] = []
