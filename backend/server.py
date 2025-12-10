from fastapi import FastAPI, HTTPException, Depends, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import httpx
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

security = HTTPBearer()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

class TicketConfig(BaseModel):
    cabecera: Optional[str] = None
    nombre_negocio: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    rfc: Optional[str] = None
    email: Optional[str] = None
    sitio_web: Optional[str] = None
    mensaje_pie: Optional[str] = "¡Gracias por su compra!"
    mostrar_info_cliente: bool = False
    mostrar_comentarios: bool = False
    logo_email: Optional[str] = None
    logo_impreso: Optional[str] = None

class ClienteCreate(BaseModel):
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais: Optional[str] = None
    cedula_ruc: Optional[str] = None
    nota: Optional[str] = None

class ClienteResponse(BaseModel):
    id: str
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais: Optional[str] = None
    cedula_ruc: Optional[str] = None
    nota: Optional[str] = None
    organizacion_id: str
    creado: str

class UserCreate(BaseModel):
    nombre: str
    username: str
    password: str
    rol: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    nombre: str
    username: str
    rol: str
    organizacion_id: str
    creado_por: Optional[str] = None
    creado: str

class UserRegister(BaseModel):
    nombre: str
    nombre_tienda: str
    email: EmailStr
    password: str
    confirm_password: Optional[str] = None

class OrganizacionResponse(BaseModel):
    id: str
    nombre: str
    propietario_id: str
    propietario_nombre: str
    propietario_email: Optional[str] = None
    fecha_creacion: str
    ultima_actividad: Optional[str] = None
    total_usuarios: int
    total_productos: int
    total_ventas: int

class ProductCreate(BaseModel):
    nombre: str
    precio: float
    codigo_barras: Optional[str] = None
    descripcion: Optional[str] = None
    stock: Optional[int] = 0

class ProductResponse(BaseModel):
    id: str
    nombre: str
    precio: float
    codigo_barras: Optional[str] = None
    descripcion: Optional[str] = None
    stock: int = 0
    organizacion_id: str
    creado: str

class InvoiceItem(BaseModel):
    producto_id: str
    nombre: str
    precio: float
    cantidad: int
    subtotal: float

class InvoiceCreate(BaseModel):
    items: List[InvoiceItem]
    total: float
    cliente_id: Optional[str] = None
    comentarios: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    numero: str
    items: List[InvoiceItem]
    total: float
    vendedor: str
    vendedor_nombre: str
    organizacion_id: str
    caja_id: Optional[str] = None
    cliente_id: Optional[str] = None
    cliente_nombre: Optional[str] = None
    comentarios: Optional[str] = None
    fecha: str

class CajaApertura(BaseModel):
    monto_inicial: float

class CajaCierre(BaseModel):
    efectivo_contado: float

class CajaResponse(BaseModel):
    id: str
    numero: str
    usuario_id: str
    usuario_nombre: str
    monto_inicial: float
    monto_ventas: float
    monto_final: float
    efectivo_contado: Optional[float] = None
    diferencia: Optional[float] = None
    total_ventas: int
    fecha_apertura: str
    fecha_cierre: Optional[str] = None
    estado: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    session_token = request.cookies.get("session_token")
    
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if expires_at > datetime.now(timezone.utc):
                user = await db.usuarios.find_one({"user_id": session["user_id"]})
                if user:
                    await db.organizaciones.update_one(
                        {"_id": user["organizacion_id"]},
                        {"$set": {"ultima_actividad": datetime.now(timezone.utc).isoformat()}}
                    )
                    return user
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.usuarios.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
    return user

async def get_propietario_or_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar productos")
    return current_user

async def get_propietario_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "propietario":
        raise HTTPException(status_code=403, detail="Solo el propietario puede gestionar usuarios")
    return current_user

@app.on_event("startup")
async def startup_db():
    admin_exists = await db.usuarios.find_one({"username": "admin"})
    if not admin_exists:
        org_id = str(uuid.uuid4())
        admin_user = {
            "_id": "admin",
            "user_id": "admin",
            "nombre": "Administrador Principal",
            "username": "admin",
            "email": "admin@system.com",
            "password": get_password_hash("admin*88"),
            "rol": "propietario",
            "organizacion_id": org_id,
            "creado_por": None,
            "creado": datetime.now(timezone.utc).isoformat()
        }
        await db.usuarios.insert_one(admin_user)
        
        admin_org = {
            "_id": org_id,
            "nombre": "Administración Principal",
            "propietario_id": "admin",
            "fecha_creacion": datetime.now(timezone.utc).isoformat(),
            "ultima_actividad": datetime.now(timezone.utc).isoformat()
        }
        await db.organizaciones.insert_one(admin_org)
        
        config_negocio = {
            "_id": org_id,
            "cabecera": "",
            "nombre_negocio": "Mi Negocio",
            "direccion": "",
            "telefono": "",
            "rfc": "",
            "email": "",
            "sitio_web": "",
            "mensaje_pie": "¡Gracias por su compra!",
            "mostrar_info_cliente": False,
            "mostrar_comentarios": False,
            "logo_email": None,
            "logo_impreso": None
        }
        await db.configuraciones.insert_one(config_negocio)

@app.post("/api/login")
async def login(user_login: UserLogin, response: Response):
    user = await db.usuarios.find_one({"username": user_login.username})
    if not user or not verify_password(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    user_id = user.get("user_id") or user["_id"]
    
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    await db.organizaciones.update_one(
        {"_id": user["organizacion_id"]},
        {"$set": {"ultima_actividad": datetime.now(timezone.utc).isoformat()}}
    )
    
    access_token = create_access_token(data={"sub": user["_id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "nombre": user["nombre"],
            "username": user["username"],
            "rol": user["rol"],
            "organizacion_id": user["organizacion_id"]
        }
    }

@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("_id") or current_user.get("user_id")
    return {
        "id": user_id,
        "nombre": current_user["nombre"],
        "username": current_user.get("username"),
        "email": current_user.get("email"),
        "rol": current_user["rol"],
        "organizacion_id": current_user["organizacion_id"]
    }

class GoogleSessionRequest(BaseModel):
    nombre_tienda: Optional[str] = None

@app.post("/api/auth/session")
async def create_session(request: Request, response: Response, body: GoogleSessionRequest = None):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID requerido")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al obtener datos de sesión: {str(e)}")
    
    email = data.get("email")
    nombre = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    
    if not email or not session_token:
        raise HTTPException(status_code=400, detail="Datos de sesión inválidos")
    
    user = await db.usuarios.find_one({"email": email}, {"_id": 0})
    
    if not user:
        if not body or not body.nombre_tienda:
            raise HTTPException(status_code=400, detail="Se requiere el nombre de la tienda")
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        org_id = str(uuid.uuid4())
        nombre_tienda = body.nombre_tienda
        temp_password = f"{nombre.split()[0].lower()}{str(uuid.uuid4().hex[:6])}"
        
        new_user = {
            "_id": user_id,
            "user_id": user_id,
            "nombre": nombre,
            "email": email,
            "username": email.split("@")[0],
            "password": get_password_hash(temp_password),
            "password_temp": temp_password,
            "picture": picture,
            "rol": "propietario",
            "organizacion_id": org_id,
            "creado_por": None,
            "creado": datetime.now(timezone.utc).isoformat()
        }
        await db.usuarios.insert_one(new_user)
        
        nueva_org = {
            "_id": org_id,
            "nombre": nombre_tienda,
            "propietario_id": user_id,
            "fecha_creacion": datetime.now(timezone.utc).isoformat(),
            "ultima_actividad": datetime.now(timezone.utc).isoformat()
        }
        await db.organizaciones.insert_one(nueva_org)
        
        config_negocio = {
            "_id": org_id,
            "cabecera": "",
            "nombre_negocio": nombre_tienda,
            "direccion": "",
            "telefono": "",
            "rfc": "",
            "email": email,
            "sitio_web": "",
            "mensaje_pie": "¡Gracias por su compra!",
            "mostrar_info_cliente": False,
            "mostrar_comentarios": False,
            "logo_email": None,
            "logo_impreso": None
        }
        await db.configuraciones.insert_one(config_negocio)
        
        user = new_user
    else:
        user_id = user["user_id"]
        await db.usuarios.update_one(
            {"user_id": user_id},
            {"$set": {
                "nombre": nombre,
                "picture": picture
            }}
        )
        await db.organizaciones.update_one(
            {"_id": user["organizacion_id"]},
            {"$set": {"ultima_actividad": datetime.now(timezone.utc).isoformat()}}
        )
    
    existing_session = await db.user_sessions.find_one({"user_id": user_id})
    if existing_session:
        await db.user_sessions.delete_one({"user_id": user_id})
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    response_data = {
        "user": {
            "id": user_id,
            "nombre": user["nombre"],
            "email": user["email"],
            "username": user.get("username"),
            "rol": user["rol"],
            "organizacion_id": user["organizacion_id"]
        }
    }
    
    if "password_temp" in user:
        response_data["temp_password"] = user["password_temp"]
        await db.usuarios.update_one(
            {"user_id": user_id},
            {"$unset": {"password_temp": ""}}
        )
    
    return response_data

@app.post("/api/auth/register")
async def register_user(user_data: UserRegister, response: Response):
    existing = await db.usuarios.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    org_id = str(uuid.uuid4())
    
    new_user = {
        "_id": user_id,
        "user_id": user_id,
        "nombre": user_data.nombre,
        "email": user_data.email,
        "username": user_data.email.split("@")[0],
        "password": get_password_hash(user_data.password),
        "picture": None,
        "rol": "propietario",
        "organizacion_id": org_id,
        "creado_por": None,
        "creado": datetime.now(timezone.utc).isoformat()
    }
    await db.usuarios.insert_one(new_user)
    
    nueva_org = {
        "_id": org_id,
        "nombre": user_data.nombre_tienda,
        "propietario_id": user_id,
        "fecha_creacion": datetime.now(timezone.utc).isoformat(),
        "ultima_actividad": datetime.now(timezone.utc).isoformat()
    }
    await db.organizaciones.insert_one(nueva_org)
    
    config_negocio = {
        "_id": org_id,
        "cabecera": "",
        "nombre_negocio": user_data.nombre_tienda,
        "direccion": "",
        "telefono": "",
        "rfc": "",
        "email": user_data.email,
        "sitio_web": "",
        "mensaje_pie": "¡Gracias por su compra!",
        "mostrar_info_cliente": False,
        "mostrar_comentarios": False,
        "logo_email": None,
        "logo_impreso": None
    }
    await db.configuraciones.insert_one(config_negocio)
    
    session_token = f"session_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return {
        "user": {
            "id": user_id,
            "nombre": new_user["nombre"],
            "email": new_user["email"],
            "username": new_user["username"],
            "rol": new_user["rol"],
            "organizacion_id": new_user["organizacion_id"]
        }
    }

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"message": "Sesión cerrada correctamente"}

@app.get("/api/config")
async def get_config(current_user: dict = Depends(get_current_user)):
    config = await db.configuraciones.find_one({"_id": current_user["organizacion_id"]})
    if not config:
        return {
            "cabecera": "",
            "nombre_negocio": "Mi Negocio",
            "direccion": "",
            "telefono": "",
            "rfc": "",
            "email": "",
            "sitio_web": "",
            "mensaje_pie": "¡Gracias por su compra!",
            "mostrar_info_cliente": False,
            "mostrar_comentarios": False,
            "logo_email": None,
            "logo_impreso": None
        }
    return {
        "cabecera": config.get("cabecera", ""),
        "nombre_negocio": config.get("nombre_negocio", "Mi Negocio"),
        "direccion": config.get("direccion", ""),
        "telefono": config.get("telefono", ""),
        "rfc": config.get("rfc", ""),
        "email": config.get("email", ""),
        "sitio_web": config.get("sitio_web", ""),
        "mensaje_pie": config.get("mensaje_pie", "¡Gracias por su compra!"),
        "mostrar_info_cliente": config.get("mostrar_info_cliente", False),
        "mostrar_comentarios": config.get("mostrar_comentarios", False),
        "logo_email": config.get("logo_email"),
        "logo_impreso": config.get("logo_impreso")
    }

@app.put("/api/config")
async def update_config(config: TicketConfig, current_user: dict = Depends(get_propietario_user)):
    await db.configuraciones.update_one(
        {"_id": current_user["organizacion_id"]},
        {"$set": config.model_dump()},
        upsert=True
    )
    return {"message": "Configuración actualizada"}

@app.get("/api/usuarios", response_model=List[UserResponse])
async def get_usuarios(current_user: dict = Depends(get_propietario_user)):
    usuarios = await db.usuarios.find(
        {"organizacion_id": current_user["organizacion_id"]},
        {"password": 0}
    ).to_list(1000)
    return [
        UserResponse(
            id=u["_id"],
            nombre=u["nombre"],
            username=u["username"],
            rol=u["rol"],
            organizacion_id=u["organizacion_id"],
            creado_por=u.get("creado_por"),
            creado=u["creado"]
        )
        for u in usuarios
    ]

@app.post("/api/usuarios", response_model=UserResponse)
async def create_usuario(user: UserCreate, current_user: dict = Depends(get_propietario_user)):
    existing = await db.usuarios.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="El username ya existe")
    
    if user.rol not in ["administrador", "cajero"]:
        raise HTTPException(status_code=400, detail="Solo puedes crear usuarios con rol administrador o cajero")
    
    import uuid
    user_id = str(uuid.uuid4())
    new_user = {
        "_id": user_id,
        "nombre": user.nombre,
        "username": user.username,
        "password": get_password_hash(user.password),
        "rol": user.rol,
        "organizacion_id": current_user["organizacion_id"],
        "creado_por": current_user["_id"],
        "creado": datetime.now(timezone.utc).isoformat()
    }
    await db.usuarios.insert_one(new_user)
    
    return UserResponse(
        id=user_id,
        nombre=user.nombre,
        username=user.username,
        rol=user.rol,
        organizacion_id=current_user["organizacion_id"],
        creado_por=current_user["_id"],
        creado=new_user["creado"]
    )

@app.delete("/api/usuarios/{user_id}")
async def delete_usuario(user_id: str, current_user: dict = Depends(get_propietario_user)):
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    user_to_delete = await db.usuarios.find_one({"_id": user_id})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user_to_delete["organizacion_id"] != current_user["organizacion_id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este usuario")
    
    result = await db.usuarios.delete_one({"_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario eliminado correctamente"}

@app.get("/api/organizaciones", response_model=List[OrganizacionResponse])
async def get_organizaciones(current_user: dict = Depends(get_current_user)):
    if current_user["_id"] != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador principal puede ver organizaciones")
    
    organizaciones = await db.organizaciones.find({}, {"_id": 1, "nombre": 1, "propietario_id": 1, "fecha_creacion": 1, "ultima_actividad": 1}).to_list(1000)
    
    result = []
    for org in organizaciones:
        propietario = await db.usuarios.find_one(
            {"$or": [{"user_id": org["propietario_id"]}, {"_id": org["propietario_id"]}]},
            {"_id": 0, "nombre": 1, "email": 1}
        )
        
        total_usuarios = await db.usuarios.count_documents({"organizacion_id": org["_id"]})
        total_productos = await db.productos.count_documents({"organizacion_id": org["_id"]})
        total_ventas = await db.facturas.count_documents({"organizacion_id": org["_id"]})
        
        result.append(OrganizacionResponse(
            id=org["_id"],
            nombre=org.get("nombre", "Sin nombre"),
            propietario_id=org["propietario_id"],
            propietario_nombre=propietario["nombre"] if propietario else "Desconocido",
            propietario_email=propietario.get("email") if propietario else None,
            fecha_creacion=org.get("fecha_creacion", ""),
            ultima_actividad=org.get("ultima_actividad"),
            total_usuarios=total_usuarios,
            total_productos=total_productos,
            total_ventas=total_ventas
        ))
    
    return result

@app.delete("/api/organizaciones/{org_id}")
async def delete_organizacion(org_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["_id"] != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador principal puede eliminar organizaciones")
    
    if org_id == current_user["organizacion_id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia organización")
    
    org = await db.organizaciones.find_one({"_id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    
    await db.usuarios.delete_many({"organizacion_id": org_id})
    await db.productos.delete_many({"organizacion_id": org_id})
    await db.facturas.delete_many({"organizacion_id": org_id})
    await db.clientes.delete_many({"organizacion_id": org_id})
    await db.cajas.delete_many({"organizacion_id": org_id})
    await db.configuraciones.delete_one({"_id": org_id})
    await db.organizaciones.delete_one({"_id": org_id})
    
    return {"message": "Organización eliminada correctamente"}

@app.get("/api/productos", response_model=List[ProductResponse])
async def get_productos(current_user: dict = Depends(get_current_user)):
    productos = await db.productos.find({"organizacion_id": current_user["organizacion_id"]}).to_list(1000)
    return [
        ProductResponse(
            id=p["_id"],
            nombre=p["nombre"],
            precio=p["precio"],
            codigo_barras=p.get("codigo_barras"),
            descripcion=p.get("descripcion"),
            stock=p.get("stock", 0),
            organizacion_id=p["organizacion_id"],
            creado=p["creado"]
        )
        for p in productos
    ]

@app.get("/api/productos/barcode/{codigo}")
async def get_producto_by_barcode(codigo: str, current_user: dict = Depends(get_current_user)):
    producto = await db.productos.find_one({
        "codigo_barras": codigo,
        "organizacion_id": current_user["organizacion_id"]
    })
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return ProductResponse(
        id=producto["_id"],
        nombre=producto["nombre"],
        precio=producto["precio"],
        codigo_barras=producto.get("codigo_barras"),
        descripcion=producto.get("descripcion"),
        stock=producto.get("stock", 0),
        organizacion_id=producto["organizacion_id"],
        creado=producto["creado"]
    )

@app.post("/api/productos", response_model=ProductResponse)
async def create_producto(product: ProductCreate, current_user: dict = Depends(get_propietario_or_admin)):
    import uuid
    product_id = str(uuid.uuid4())
    
    new_product = {
        "_id": product_id,
        "nombre": product.nombre,
        "precio": product.precio,
        "codigo_barras": product.codigo_barras,
        "descripcion": product.descripcion,
        "stock": product.stock or 0,
        "organizacion_id": current_user["organizacion_id"],
        "creado": datetime.now(timezone.utc).isoformat()
    }
    await db.productos.insert_one(new_product)
    
    return ProductResponse(
        id=product_id,
        nombre=product.nombre,
        precio=product.precio,
        codigo_barras=product.codigo_barras,
        descripcion=product.descripcion,
        stock=product.stock or 0,
        organizacion_id=current_user["organizacion_id"],
        creado=new_product["creado"]
    )

@app.put("/api/productos/{product_id}", response_model=ProductResponse)
async def update_producto(product_id: str, product: ProductCreate, current_user: dict = Depends(get_propietario_or_admin)):
    existing = await db.productos.find_one({
        "_id": product_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    updated_product = {
        "nombre": product.nombre,
        "precio": product.precio,
        "codigo_barras": product.codigo_barras,
        "descripcion": product.descripcion,
        "stock": product.stock or 0
    }
    
    await db.productos.update_one({"_id": product_id}, {"$set": updated_product})
    
    return ProductResponse(
        id=product_id,
        nombre=product.nombre,
        precio=product.precio,
        codigo_barras=product.codigo_barras,
        descripcion=product.descripcion,
        stock=product.stock or 0,
        organizacion_id=current_user["organizacion_id"],
        creado=existing["creado"]
    )

@app.delete("/api/productos/{product_id}")
async def delete_producto(product_id: str, current_user: dict = Depends(get_propietario_or_admin)):
    result = await db.productos.delete_one({
        "_id": product_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {"message": "Producto eliminado correctamente"}

@app.get("/api/clientes/buscar/{cedula}")
async def buscar_cliente_por_cedula(cedula: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({
        "cedula_ruc": cedula,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return ClienteResponse(
        id=cliente["_id"],
        nombre=cliente["nombre"],
        email=cliente.get("email"),
        telefono=cliente.get("telefono"),
        direccion=cliente.get("direccion"),
        ciudad=cliente.get("ciudad"),
        region=cliente.get("region"),
        codigo_postal=cliente.get("codigo_postal"),
        pais=cliente.get("pais"),
        cedula_ruc=cliente.get("cedula_ruc"),
        nota=cliente.get("nota"),
        organizacion_id=cliente["organizacion_id"],
        creado=cliente["creado"]
    )

@app.get("/api/clientes", response_model=List[ClienteResponse])
async def get_clientes(current_user: dict = Depends(get_current_user)):
    clientes = await db.clientes.find({"organizacion_id": current_user["organizacion_id"]}).to_list(1000)
    return [
        ClienteResponse(
            id=c["_id"],
            nombre=c["nombre"],
            email=c.get("email"),
            telefono=c.get("telefono"),
            direccion=c.get("direccion"),
            ciudad=c.get("ciudad"),
            region=c.get("region"),
            codigo_postal=c.get("codigo_postal"),
            pais=c.get("pais"),
            cedula_ruc=c.get("cedula_ruc"),
            nota=c.get("nota"),
            organizacion_id=c["organizacion_id"],
            creado=c["creado"]
        )
        for c in clientes
    ]

@app.post("/api/clientes", response_model=ClienteResponse)
async def create_cliente(cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    import uuid
    cliente_id = str(uuid.uuid4())
    
    nuevo_cliente = {
        "_id": cliente_id,
        "nombre": cliente.nombre,
        "email": cliente.email,
        "telefono": cliente.telefono,
        "direccion": cliente.direccion,
        "ciudad": cliente.ciudad,
        "region": cliente.region,
        "codigo_postal": cliente.codigo_postal,
        "pais": cliente.pais,
        "cedula_ruc": cliente.cedula_ruc,
        "nota": cliente.nota,
        "organizacion_id": current_user["organizacion_id"],
        "creado": datetime.now(timezone.utc).isoformat()
    }
    await db.clientes.insert_one(nuevo_cliente)
    
    return ClienteResponse(
        id=cliente_id,
        nombre=cliente.nombre,
        email=cliente.email,
        telefono=cliente.telefono,
        direccion=cliente.direccion,
        ciudad=cliente.ciudad,
        region=cliente.region,
        codigo_postal=cliente.codigo_postal,
        pais=cliente.pais,
        cedula_ruc=cliente.cedula_ruc,
        nota=cliente.nota,
        organizacion_id=current_user["organizacion_id"],
        creado=nuevo_cliente["creado"]
    )

@app.put("/api/clientes/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(cliente_id: str, cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.clientes.find_one({
        "_id": cliente_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    updated_cliente = {
        "nombre": cliente.nombre,
        "email": cliente.email,
        "telefono": cliente.telefono,
        "direccion": cliente.direccion,
        "ciudad": cliente.ciudad,
        "region": cliente.region,
        "codigo_postal": cliente.codigo_postal,
        "pais": cliente.pais,
        "cedula_ruc": cliente.cedula_ruc,
        "nota": cliente.nota
    }
    
    await db.clientes.update_one({"_id": cliente_id}, {"$set": updated_cliente})
    
    return ClienteResponse(
        id=cliente_id,
        nombre=cliente.nombre,
        email=cliente.email,
        telefono=cliente.telefono,
        direccion=cliente.direccion,
        ciudad=cliente.ciudad,
        region=cliente.region,
        codigo_postal=cliente.codigo_postal,
        pais=cliente.pais,
        cedula_ruc=cliente.cedula_ruc,
        nota=cliente.nota,
        organizacion_id=current_user["organizacion_id"],
        creado=existing["creado"]
    )

@app.delete("/api/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clientes.delete_one({
        "_id": cliente_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {"message": "Cliente eliminado correctamente"}

@app.get("/api/caja/activa")
async def get_caja_activa(current_user: dict = Depends(get_current_user)):
    caja = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja:
        return None
    
    return CajaResponse(
        id=caja["_id"],
        numero=caja["numero"],
        usuario_id=caja["usuario_id"],
        usuario_nombre=caja["usuario_nombre"],
        monto_inicial=caja["monto_inicial"],
        monto_ventas=caja["monto_ventas"],
        monto_final=caja["monto_inicial"] + caja["monto_ventas"],
        total_ventas=caja["total_ventas"],
        fecha_apertura=caja["fecha_apertura"],
        fecha_cierre=caja.get("fecha_cierre"),
        estado=caja["estado"]
    )

@app.post("/api/caja/abrir")
async def abrir_caja(apertura: CajaApertura, current_user: dict = Depends(get_current_user)):
    caja_abierta = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if caja_abierta:
        raise HTTPException(status_code=400, detail="Ya tienes una caja abierta")
    
    import uuid
    caja_id = str(uuid.uuid4())
    
    counter = await db.contadores.find_one({"_id": f"caja_{current_user['organizacion_id']}"})
    if not counter:
        numero = 1
        await db.contadores.insert_one({"_id": f"caja_{current_user['organizacion_id']}", "seq": 1})
    else:
        numero = counter["seq"] + 1
        await db.contadores.update_one(
            {"_id": f"caja_{current_user['organizacion_id']}"},
            {"$set": {"seq": numero}}
        )
    
    numero_caja = f"CAJA-{numero:06d}"
    
    nueva_caja = {
        "_id": caja_id,
        "numero": numero_caja,
        "usuario_id": current_user["_id"],
        "usuario_nombre": current_user["nombre"],
        "organizacion_id": current_user["organizacion_id"],
        "monto_inicial": apertura.monto_inicial,
        "monto_ventas": 0.0,
        "total_ventas": 0,
        "fecha_apertura": datetime.now(timezone.utc).isoformat(),
        "fecha_cierre": None,
        "estado": "abierta"
    }
    
    await db.cajas.insert_one(nueva_caja)
    
    return CajaResponse(
        id=caja_id,
        numero=numero_caja,
        usuario_id=current_user["_id"],
        usuario_nombre=current_user["nombre"],
        monto_inicial=apertura.monto_inicial,
        monto_ventas=0.0,
        monto_final=apertura.monto_inicial,
        total_ventas=0,
        fecha_apertura=nueva_caja["fecha_apertura"],
        fecha_cierre=None,
        estado="abierta"
    )

@app.post("/api/caja/cerrar")
async def cerrar_caja(cierre: CajaCierre, current_user: dict = Depends(get_current_user)):
    caja = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja:
        raise HTTPException(status_code=404, detail="No tienes una caja abierta")
    
    monto_esperado = caja["monto_inicial"] + caja["monto_ventas"]
    diferencia = cierre.efectivo_contado - monto_esperado
    
    await db.cajas.update_one(
        {"_id": caja["_id"]},
        {
            "$set": {
                "estado": "cerrada",
                "fecha_cierre": datetime.now(timezone.utc).isoformat(),
                "efectivo_contado": cierre.efectivo_contado,
                "diferencia": diferencia
            }
        }
    )
    
    caja["estado"] = "cerrada"
    caja["fecha_cierre"] = datetime.now(timezone.utc).isoformat()
    caja["efectivo_contado"] = cierre.efectivo_contado
    caja["diferencia"] = diferencia
    
    return CajaResponse(
        id=caja["_id"],
        numero=caja["numero"],
        usuario_id=caja["usuario_id"],
        usuario_nombre=caja["usuario_nombre"],
        monto_inicial=caja["monto_inicial"],
        monto_ventas=caja["monto_ventas"],
        monto_final=monto_esperado,
        efectivo_contado=cierre.efectivo_contado,
        diferencia=diferencia,
        total_ventas=caja["total_ventas"],
        fecha_apertura=caja["fecha_apertura"],
        fecha_cierre=caja["fecha_cierre"],
        estado="cerrada"
    )

@app.get("/api/caja/historial", response_model=List[CajaResponse])
async def get_historial_cajas(current_user: dict = Depends(get_current_user)):
    query = {"organizacion_id": current_user["organizacion_id"]}
    
    if current_user["rol"] == "cajero":
        query["usuario_id"] = current_user["_id"]
    
    cajas = await db.cajas.find(query).sort("fecha_apertura", -1).to_list(100)
    
    return [
        CajaResponse(
            id=c["_id"],
            numero=c["numero"],
            usuario_id=c["usuario_id"],
            usuario_nombre=c["usuario_nombre"],
            monto_inicial=c["monto_inicial"],
            monto_ventas=c["monto_ventas"],
            monto_final=c["monto_inicial"] + c["monto_ventas"],
            efectivo_contado=c.get("efectivo_contado"),
            diferencia=c.get("diferencia"),
            total_ventas=c["total_ventas"],
            fecha_apertura=c["fecha_apertura"],
            fecha_cierre=c.get("fecha_cierre"),
            estado=c["estado"]
        )
        for c in cajas
    ]

@app.post("/api/facturas", response_model=InvoiceResponse)
async def create_factura(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    caja_activa = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja_activa:
        raise HTTPException(status_code=400, detail="Debes abrir una caja antes de realizar ventas")
    
    import uuid
    invoice_id = str(uuid.uuid4())
    
    counter = await db.contadores.find_one({"_id": f"factura_{current_user['organizacion_id']}"})
    if not counter:
        numero = 1
        await db.contadores.insert_one({"_id": f"factura_{current_user['organizacion_id']}", "seq": 1})
    else:
        numero = counter["seq"] + 1
        await db.contadores.update_one(
            {"_id": f"factura_{current_user['organizacion_id']}"},
            {"$set": {"seq": numero}}
        )
    
    numero_factura = f"FAC-{numero:06d}"
    
    cliente_nombre = None
    if invoice.cliente_id:
        cliente = await db.clientes.find_one({"_id": invoice.cliente_id})
        if cliente:
            cliente_nombre = cliente["nombre"]
    
    new_invoice = {
        "_id": invoice_id,
        "numero": numero_factura,
        "items": [item.model_dump() for item in invoice.items],
        "total": invoice.total,
        "vendedor": current_user["_id"],
        "vendedor_nombre": current_user["nombre"],
        "organizacion_id": current_user["organizacion_id"],
        "caja_id": caja_activa["_id"],
        "cliente_id": invoice.cliente_id,
        "cliente_nombre": cliente_nombre,
        "comentarios": invoice.comentarios,
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    await db.facturas.insert_one(new_invoice)
    
    await db.cajas.update_one(
        {"_id": caja_activa["_id"]},
        {
            "$inc": {
                "monto_ventas": invoice.total,
                "total_ventas": 1
            }
        }
    )
    
    return InvoiceResponse(
        id=invoice_id,
        numero=numero_factura,
        items=invoice.items,
        total=invoice.total,
        vendedor=current_user["_id"],
        vendedor_nombre=current_user["nombre"],
        organizacion_id=current_user["organizacion_id"],
        caja_id=caja_activa["_id"],
        cliente_id=invoice.cliente_id,
        cliente_nombre=cliente_nombre,
        comentarios=invoice.comentarios,
        fecha=new_invoice["fecha"]
    )

@app.get("/api/facturas", response_model=List[InvoiceResponse])
async def get_facturas(current_user: dict = Depends(get_current_user)):
    query = {"organizacion_id": current_user["organizacion_id"]}
    
    if current_user["rol"] == "cajero":
        query["vendedor"] = current_user["_id"]
    
    facturas = await db.facturas.find(query).sort("fecha", -1).to_list(1000)
    return [
        InvoiceResponse(
            id=f["_id"],
            numero=f["numero"],
            items=[InvoiceItem(**item) for item in f["items"]],
            total=f["total"],
            vendedor=f["vendedor"],
            vendedor_nombre=f["vendedor_nombre"],
            organizacion_id=f["organizacion_id"],
            caja_id=f.get("caja_id"),
            cliente_id=f.get("cliente_id"),
            cliente_nombre=f.get("cliente_nombre"),
            comentarios=f.get("comentarios"),
            fecha=f["fecha"]
        )
        for f in facturas
    ]

@app.get("/api/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    total_productos = await db.productos.count_documents({"organizacion_id": current_user["organizacion_id"]})
    
    facturas_query = {"organizacion_id": current_user["organizacion_id"]}
    if current_user["rol"] == "cajero":
        facturas_query["vendedor"] = current_user["_id"]
    
    facturas = await db.facturas.find(facturas_query).to_list(1000)
    total_ventas = len(facturas)
    total_ingresos = sum(f["total"] for f in facturas)
    
    total_empleados = 0
    if current_user["rol"] == "propietario":
        total_empleados = await db.usuarios.count_documents({"organizacion_id": current_user["organizacion_id"]}) - 1
    
    caja_activa = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    return {
        "total_productos": total_productos,
        "total_ventas": total_ventas,
        "total_ingresos": total_ingresos,
        "total_empleados": total_empleados,
        "caja_activa": caja_activa is not None,
        "facturas_recientes": [
            {
                "id": f["_id"],
                "numero": f["numero"],
                "total": f["total"],
                "vendedor_nombre": f["vendedor_nombre"],
                "fecha": f["fecha"]
            }
            for f in facturas[:5]
        ]
    }

@app.get("/api/")
async def root():
    return {"message": "Sistema de Facturación API"}
