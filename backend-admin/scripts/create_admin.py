"""
Script para crear usuario administrador inicial
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
ADMIN_DB_NAME = os.environ.get("ADMIN_DB_NAME", "admin_db")


async def create_admin():
    print("🔧 Creando usuario administrador...")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[ADMIN_DB_NAME]
    
    # Verificar si ya existe
    existing = await db.users.find_one({"email": "admin@admin.com"})
    if existing:
        print("⚠️  Usuario admin@admin.com ya existe")
        client.close()
        return
    
    # Crear rol admin si no existe
    admin_role = await db.roles.find_one({"name": "admin"})
    if not admin_role:
        await db.roles.insert_one({
            "name": "admin",
            "display_name": "Administrador",
            "description": "Acceso total al sistema",
            "permissions": ["*"]
        })
        print("  ✓ Rol admin creado")
    
    # Crear usuario
    now = datetime.now(timezone.utc)
    admin_user = {
        "email": "admin@admin.com",
        "username": "admin",
        "password_hash": pwd_context.hash("admin123"),
        "full_name": "Administrador",
        "role": "admin",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login": None
    }
    
    await db.users.insert_one(admin_user)
    
    print("✅ Usuario administrador creado:")
    print("   Email: admin@admin.com")
    print("   Password: admin123")
    print("")
    print("⚠️  IMPORTANTE: Cambie la contraseña después del primer login")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_admin())
