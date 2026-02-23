"""
Utilidades de seguridad - JWT y hashing de contraseñas
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Configuración JWT
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "admin-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña contra hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera hash de contraseña"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea token de acceso JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Crea token de refresh JWT"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decodifica y valida token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency para obtener usuario actual desde token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )
    
    return {
        "user_id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role"),
        "permissions": payload.get("permissions", [])
    }


def require_permission(permission: str):
    """Decorator para requerir un permiso específico"""
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        user_permissions = current_user.get("permissions", [])
        
        # Admin tiene todos los permisos
        if "*" in user_permissions:
            return current_user
        
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso requerido: {permission}"
            )
        
        return current_user
    
    return permission_checker
