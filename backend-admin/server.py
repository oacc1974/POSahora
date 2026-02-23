"""
Backend Admin - Microservicio de Administración
Puerto: 8003
Gestiona: Usuarios, Roles, Empresas, Integraciones
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Importar rutas
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.empresas import router as empresas_router
from routes.integrations import router as integrations_router
from routes.dashboard import router as dashboard_router

# Configuración
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
ADMIN_DB_NAME = os.environ.get("ADMIN_DB_NAME", "admin_db")
FE_DB_NAME = os.environ.get("FE_DB_NAME", "fe_db")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Maneja el ciclo de vida de la aplicación
    """
    # Startup
    print(f"🚀 Iniciando Backend Admin...")
    print(f"📦 Conectando a MongoDB: {MONGO_URL}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    
    # Base de datos de admin (usuarios, roles, integraciones)
    admin_db = client[ADMIN_DB_NAME]
    # Base de datos de FE (empresas, documentos) - solo lectura/escritura controlada
    fe_db = client[FE_DB_NAME]
    
    # Guardar en app.state
    app.state.mongo_client = client
    app.state.admin_db = admin_db
    app.state.fe_db = fe_db
    
    # Crear índices en admin_db
    print("📊 Creando índices...")
    try:
        # Users
        await admin_db.users.create_index("email", unique=True)
        await admin_db.users.create_index("username", unique=True)
        await admin_db.users.create_index("is_active")
        
        # Roles
        await admin_db.roles.create_index("name", unique=True)
        
        # User-Empresas (relación)
        await admin_db.user_empresas.create_index([("user_id", 1), ("tenant_id", 1)], unique=True)
        await admin_db.user_empresas.create_index("user_id")
        await admin_db.user_empresas.create_index("tenant_id")
        
        # Integrations
        await admin_db.integrations.create_index([("tenant_id", 1), ("type", 1)], unique=True)
        await admin_db.integrations.create_index("tenant_id")
        
        # Sync logs
        await admin_db.sync_logs.create_index([("tenant_id", 1), ("created_at", -1)])
        await admin_db.sync_logs.create_index("integration_id")
        
        print("✅ Índices creados correctamente")
    except Exception as e:
        print(f"⚠️ Error creando índices: {e}")
    
    # Crear roles por defecto si no existen
    await create_default_roles(admin_db)
    
    print("✅ Backend Admin iniciado en puerto 8003")
    
    yield
    
    # Shutdown
    print("🛑 Cerrando conexiones...")
    client.close()
    print("✅ Backend Admin cerrado")


async def create_default_roles(db):
    """Crea roles por defecto si no existen"""
    default_roles = [
        {
            "name": "admin",
            "display_name": "Administrador",
            "description": "Acceso total al sistema",
            "permissions": ["*"]
        },
        {
            "name": "operador",
            "display_name": "Operador",
            "description": "Gestión de empresas y documentos",
            "permissions": [
                "empresas:read", "empresas:write",
                "documents:read", "documents:write",
                "integrations:read", "integrations:write"
            ]
        },
        {
            "name": "reporteria",
            "display_name": "Solo Reportería",
            "description": "Solo lectura de reportes y documentos",
            "permissions": [
                "empresas:read",
                "documents:read",
                "dashboard:read"
            ]
        }
    ]
    
    for role in default_roles:
        existing = await db.roles.find_one({"name": role["name"]})
        if not existing:
            await db.roles.insert_one(role)
            print(f"  ✓ Rol '{role['name']}' creado")


# Crear aplicación
app = FastAPI(
    title="Backend Admin - Facturación Electrónica",
    description="API de administración para gestión de usuarios, empresas e integraciones",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/admin/docs",
    redoc_url="/admin/redoc",
    openapi_url="/admin/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(empresas_router)
app.include_router(integrations_router)
app.include_router(dashboard_router)

# Ruta raíz
@app.get("/")
async def root():
    return {
        "service": "Backend Admin - Facturación Electrónica",
        "version": "1.0.0",
        "docs": "/admin/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "backend-admin"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
