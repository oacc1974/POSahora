"""
Modelos Pydantic para Integraciones
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class IntegrationType(str, Enum):
    LOYVERSE = "loyverse"
    # Futuras integraciones
    # SQUARE = "square"
    # SHOPIFY = "shopify"


class IntegrationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"


class LoyverseConfig(BaseModel):
    api_key: str = Field(..., min_length=10)
    store_id: Optional[str] = None
    sync_interval_minutes: int = Field(default=15, ge=5, le=1440)
    auto_sync: bool = True
    sync_from_date: Optional[datetime] = None


class IntegrationCreate(BaseModel):
    tenant_id: str
    type: IntegrationType
    config: Dict[str, Any]
    is_active: bool = True


class IntegrationUpdate(BaseModel):
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class IntegrationResponse(BaseModel):
    id: str
    tenant_id: str
    type: str
    status: str
    is_active: bool
    last_sync: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SyncLogResponse(BaseModel):
    id: str
    integration_id: str
    tenant_id: str
    status: str
    records_processed: int
    records_success: int
    records_failed: int
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class SyncRequest(BaseModel):
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None


class LoyverseSaleItem(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    price: float
    total_money: float
    tax_amount: float


class LoyverseSale(BaseModel):
    receipt_number: str
    receipt_date: datetime
    total_money: float
    total_tax: float
    items: List[LoyverseSaleItem]
    customer_name: Optional[str] = None
    customer_id: Optional[str] = None
