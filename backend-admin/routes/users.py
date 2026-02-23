"""
Rutas de Gestión de Usuarios
- CRUD usuarios
- Asignación de empresas
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId

from models.user import UserCreate, UserUpdate, UserResponse, RoleResponse
from models.empresa import UserEmpresaAssign
from utils.security import get_current_user, require_permission, get_password_hash

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(require_permission("users:read"))
):
    """
    Lista todos los usuarios con filtros opcionales
    """
    db = request.app.state.admin_db
    
    query = {}
    if role:
        query["role"] = role
    if is_active is not None:
        query["is_active"] = is_active
    
    skip = (page - 1) * limit
    cursor = db.users.find(query).skip(skip).limit(limit).sort("created_at", -1)
    
    users = []
    async for user in cursor:
        # Obtener empresas asignadas
        empresas_cursor = db.user_empresas.find({"user_id": str(user["_id"])})
        empresas = [ue["tenant_id"] async for ue in empresas_cursor]
        
        users.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"],
            last_login=user.get("last_login"),
            empresas=empresas
        ))
    
    return users


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Lista todos los roles disponibles
    """
    db = request.app.state.admin_db
    
    roles = []
    cursor = db.roles.find()
    async for role in cursor:
        roles.append(RoleResponse(
            id=str(role["_id"]),
            name=role["name"],
            display_name=role["display_name"],
            description=role["description"],
            permissions=role["permissions"]
        ))
    
    return roles


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    request: Request,
    user_id: str,
    current_user: dict = Depends(require_permission("users:read"))
):
    """
    Obtiene un usuario por ID
    """
    db = request.app.state.admin_db
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    
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


@router.post("", response_model=UserResponse)
async def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: dict = Depends(require_permission("users:write"))
):
    """
    Crea un nuevo usuario
    """
    db = request.app.state.admin_db
    
    # Verificar email único
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    # Verificar username único
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username ya registrado")
    
    # Verificar rol válido
    role = await db.roles.find_one({"name": user_data.role})
    if not role:
        raise HTTPException(status_code=400, detail="Rol no válido")
    
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "email": user_data.email,
        "username": user_data.username,
        "password_hash": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role,
        "is_active": user_data.is_active,
        "created_at": now,
        "updated_at": now,
        "last_login": None
    }
    
    result = await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=user_data.is_active,
        created_at=now,
        last_login=None,
        empresas=[]
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(require_permission("users:write"))
):
    """
    Actualiza un usuario existente
    """
    db = request.app.state.admin_db
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if user_data.email is not None:
        # Verificar email único
        existing = await db.users.find_one({"email": user_data.email, "_id": {"$ne": ObjectId(user_id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Email ya registrado")
        update_data["email"] = user_data.email
    
    if user_data.full_name is not None:
        update_data["full_name"] = user_data.full_name
    
    if user_data.role is not None:
        role = await db.roles.find_one({"name": user_data.role})
        if not role:
            raise HTTPException(status_code=400, detail="Rol no válido")
        update_data["role"] = user_data.role
    
    if user_data.is_active is not None:
        update_data["is_active"] = user_data.is_active
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    # Obtener usuario actualizado
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # Obtener empresas
    empresas_cursor = db.user_empresas.find({"user_id": user_id})
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


@router.delete("/{user_id}")
async def delete_user(
    request: Request,
    user_id: str,
    current_user: dict = Depends(require_permission("users:write"))
):
    """
    Elimina un usuario (soft delete - desactiva)
    """
    db = request.app.state.admin_db
    
    # No permitir auto-eliminación
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
    except:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"success": True, "message": "Usuario desactivado"}


@router.post("/{user_id}/empresas")
async def assign_empresas(
    request: Request,
    user_id: str,
    assignment: UserEmpresaAssign,
    current_user: dict = Depends(require_permission("users:write"))
):
    """
    Asigna empresas a un usuario
    Reemplaza las asignaciones existentes
    """
    db = request.app.state.admin_db
    fe_db = request.app.state.fe_db
    
    # Verificar usuario existe
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar que todas las empresas existen en fe_db
    for tenant_id in assignment.tenant_ids:
        tenant = await fe_db.tenants.find_one({"tenant_id": tenant_id})
        if not tenant:
            raise HTTPException(status_code=400, detail=f"Empresa {tenant_id} no encontrada")
    
    # Eliminar asignaciones anteriores
    await db.user_empresas.delete_many({"user_id": user_id})
    
    # Crear nuevas asignaciones
    now = datetime.now(timezone.utc)
    for tenant_id in assignment.tenant_ids:
        await db.user_empresas.insert_one({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "assigned_at": now,
            "assigned_by": current_user["user_id"]
        })
    
    return {
        "success": True,
        "message": f"{len(assignment.tenant_ids)} empresa(s) asignada(s)",
        "empresas": assignment.tenant_ids
    }
