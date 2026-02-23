"""
Modelos Pydantic para Usuarios y Autenticación
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "admin"
    OPERADOR = "operador"
    REPORTERIA = "reporteria"


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: RoleEnum = RoleEnum.OPERADOR
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    empresas: List[str] = []


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class RoleResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: str
    permissions: List[str]
