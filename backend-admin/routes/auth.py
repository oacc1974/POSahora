"""
Rutas de Autenticación
- Login
- Refresh token
- Me (usuario actual)
- Logout
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime, timezone
import uuid

from models.user import UserLogin, TokenResponse, TokenRefresh, UserResponse, ChangePassword
from utils.security import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, decode_token, get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, credentials: UserLogin):
    """
    Autenticación de usuario
    Retorna access_token y refresh_token
    """
    db = request.app.state.admin_db
    
    # Buscar usuario por email
    user = await db.users.find_one({"email": credentials.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not user.get("is_active", False):
        raise HTTPException(status_code=401, detail="Usuario inactivo")
    
    # Verificar contraseña
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Obtener rol y permisos
    role = await db.roles.find_one({"name": user["role"]})
    permissions = role.get("permissions", []) if role else []
    
    # Obtener empresas asignadas
    empresas_cursor = db.user_empresas.find({"user_id": str(user["_id"])})
    empresas = [ue["tenant_id"] async for ue in empresas_cursor]
    
    # Crear tokens
    token_data = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "permissions": permissions,
        "empresas": empresas
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": str(user["_id"])})
    
    # Actualizar último login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"],
            last_login=datetime.now(timezone.utc),
            empresas=empresas
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, token_data: TokenRefresh):
    """
    Renueva el access_token usando el refresh_token
    """
    db = request.app.state.admin_db
    
    # Decodificar refresh token
    try:
        payload = decode_token(token_data.refresh_token)
    except:
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    
    user_id = payload.get("sub")
    
    # Buscar usuario
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")
    
    # Obtener rol y permisos
    role = await db.roles.find_one({"name": user["role"]})
    permissions = role.get("permissions", []) if role else []
    
    # Obtener empresas
    empresas_cursor = db.user_empresas.find({"user_id": str(user["_id"])})
    empresas = [ue["tenant_id"] async for ue in empresas_cursor]
    
    # Crear nuevos tokens
    token_data = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "permissions": permissions,
        "empresas": empresas
    }
    
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token({"sub": str(user["_id"])})
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"],
            last_login=user.get("last_login"),
            empresas=empresas
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Obtiene información del usuario actual
    """
    db = request.app.state.admin_db
    
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Obtener empresas
    empresas_cursor = db.user_empresas.find({"user_id": str(user["_id"])})
    empresas = [ue["tenant_id"] async for ue in empresas_cursor]
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        is_active=user["is_active"],
        created_at=user["created_at"],
        last_login=user.get("last_login"),
        empresas=empresas
    )


@router.post("/change-password")
async def change_password(
    request: Request, 
    passwords: ChangePassword,
    current_user: dict = Depends(get_current_user)
):
    """
    Cambiar contraseña del usuario actual
    """
    db = request.app.state.admin_db
    
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar contraseña actual
    if not verify_password(passwords.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    # Actualizar contraseña
    new_hash = get_password_hash(passwords.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"success": True, "message": "Contraseña actualizada correctamente"}
