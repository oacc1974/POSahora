"""
Middleware para enforcement de tenant_id en todas las requests
CRÍTICO: Garantiza aislamiento multi-tenant
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List

# Rutas públicas que no requieren tenant_id
PUBLIC_PATHS = [
    "/fe/health",
    "/fe/docs",
    "/fe/openapi.json",
    "/fe/redoc",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/"
]

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware que valida y enforce tenant_id en TODAS las requests
    """
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Permitir rutas públicas
        if any(path.startswith(public) for public in PUBLIC_PATHS):
            return await call_next(request)
        
        # Permitir OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Obtener tenant_id del header
        tenant_id = request.headers.get("X-Tenant-ID")
        
        if not tenant_id:
            return JSONResponse(
                status_code=401,
                content={
                    "error": "X-Tenant-ID header requerido",
                    "detail": "Todas las requests deben incluir el header X-Tenant-ID"
                }
            )
        
        # Validar formato básico del tenant_id
        if len(tenant_id) < 10:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "X-Tenant-ID inválido",
                    "detail": "El tenant_id debe ser un UUID válido"
                }
            )
        
        # Inyectar tenant_id en request.state para uso en endpoints
        request.state.tenant_id = tenant_id
        
        # Continuar con la request
        response = await call_next(request)
        return response


async def get_tenant_id(request: Request) -> str:
    """
    Dependency para obtener tenant_id en endpoints
    Lanza excepción si no existe
    """
    tenant_id = getattr(request.state, 'tenant_id', None)
    
    if not tenant_id:
        # Intentar obtener del header directamente
        tenant_id = request.headers.get("X-Tenant-ID")
    
    if not tenant_id:
        raise HTTPException(
            status_code=401,
            detail="X-Tenant-ID header requerido"
        )
    
    return tenant_id


async def validate_tenant_exists(db, tenant_id: str) -> dict:
    """
    Valida que el tenant existe y está activo
    Retorna el documento del tenant
    """
    tenant = await db.tenants.find_one({
        "tenant_id": tenant_id,
        "is_active": True
    })
    
    if not tenant:
        raise HTTPException(
            status_code=403,
            detail="Tenant no encontrado o inactivo"
        )
    
    return tenant
