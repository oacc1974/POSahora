"""
Backend de Facturación Electrónica SRI Ecuador
Servidor FastAPI Multi-Tenant
Puerto: 8002
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
from routes.config import router as config_router
from routes.documents import router as documents_router
from routes.health import router as health_router

# Importar middleware
from middleware.tenant import TenantMiddleware

# Configuración
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "fe_db")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Maneja el ciclo de vida de la aplicación
    - Conecta a MongoDB al iniciar
    - Crea índices
    - Desconecta al cerrar
    """
    # Startup
    print(f"🚀 Iniciando Backend FE...")
    print(f"📦 Conectando a MongoDB: {MONGO_URL}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Guardar en app.state
    app.state.mongo_client = client
    app.state.db = db
    
    # Crear índices
    print("📊 Creando índices...")
    try:
        # Tenants
        await db.tenants.create_index("tenant_id", unique=True)
        await db.tenants.create_index("ruc", unique=True)
        await db.tenants.create_index("is_active")
        
        # Stores
        await db.stores.create_index([("tenant_id", 1), ("store_code", 1), ("emission_point", 1)], unique=True)
        
        # Configs
        await db.configs_fiscal.create_index("tenant_id", unique=True)
        
        # Certificates
        await db.certificates.create_index([("tenant_id", 1), ("is_active", 1)])
        
        # Counters (CRÍTICO)
        await db.counters.create_index(
            [("tenant_id", 1), ("store_code", 1), ("emission_point", 1), ("doc_type", 1)],
            unique=True
        )
        
        # Documents
        await db.documents.create_index([("tenant_id", 1), ("doc_number", 1)], unique=True)
        await db.documents.create_index([("tenant_id", 1), ("access_key", 1)], unique=True)
        await db.documents.create_index([("tenant_id", 1), ("issue_date", -1)])
        await db.documents.create_index([("tenant_id", 1), ("sri_status", 1), ("issue_date", -1)])
        await db.documents.create_index([("tenant_id", 1), ("customer.identification", 1)])
        await db.documents.create_index("invoice_reference.invoice_id")
        
        # Document XML
        await db.document_xml.create_index("document_id", unique=True)
        await db.document_xml.create_index("tenant_id")
        
        # Document Events
        await db.document_events.create_index([("document_id", 1), ("created_at", -1)])
        await db.document_events.create_index([("tenant_id", 1), ("event_type", 1), ("created_at", -1)])
        
        print("✅ Índices creados correctamente")
    except Exception as e:
        print(f"⚠️ Error creando índices: {e}")
    
    print("✅ Backend FE iniciado en puerto 8002")
    
    yield
    
    # Shutdown
    print("🛑 Cerrando conexiones...")
    client.close()
    print("✅ Backend FE cerrado")


# Crear aplicación
app = FastAPI(
    title="Backend Facturación Electrónica SRI",
    description="API para emisión de documentos electrónicos según normativa SRI Ecuador",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/fe/docs",
    redoc_url="/fe/redoc",
    openapi_url="/fe/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de Tenant
app.add_middleware(TenantMiddleware)

# Registrar rutas
app.include_router(health_router)
app.include_router(config_router)
app.include_router(documents_router)

# Ruta raíz
@app.get("/")
async def root():
    return {
        "service": "Backend Facturación Electrónica",
        "version": "1.0.0",
        "docs": "/fe/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
