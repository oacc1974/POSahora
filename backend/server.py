from fastapi import FastAPI, HTTPException, Depends, status, Request, Response, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import httpx
import shutil
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads" / "productos"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
LOGOS_DIR = ROOT_DIR / "uploads" / "logos"
LOGOS_DIR.mkdir(parents=True, exist_ok=True)

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

# Montar carpeta de uploads como estática
app.mount("/api/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

class TicketConfig(BaseModel):
    cabecera: Optional[str] = None
    nombre_negocio: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    rfc: Optional[str] = None
    email: Optional[str] = None
    sitio_web: Optional[str] = None
    mensaje_pie: Optional[str] = "¡Gracias por su compra!"
    imprimir_ticket: bool = False
    mostrar_info_cliente: bool = False
    mostrar_comentarios: bool = False
    logo_email: Optional[str] = None
    logo_impreso: Optional[str] = None
    logo_url: Optional[str] = None  # URL del logo subido

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

class POSLogin(BaseModel):
    codigo_tienda: str
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

class ImpuestoCreate(BaseModel):
    nombre: str
    tasa: float
    tipo: str
    activo: bool = True

class ImpuestoResponse(BaseModel):
    id: str
    nombre: str
    tasa: float
    tipo: str
    activo: bool
    organizacion_id: str

class MetodoPagoCreate(BaseModel):
    nombre: str
    activo: bool = True

class MetodoPagoResponse(BaseModel):
    id: str
    nombre: str
    activo: bool
    organizacion_id: str

class FuncionesConfig(BaseModel):
    cierres_caja: bool = True
    tickets_abiertos: bool = False
    tipo_pedido: bool = False
    venta_con_stock: bool = True
    funcion_reloj: bool = False
    impresoras_cocina: bool = False
    pantalla_clientes: bool = False

class TicketPredefinidoCreate(BaseModel):
    nombre: str

class TicketPredefinidoResponse(BaseModel):
    id: str
    nombre: str
    organizacion_id: str

class TipoPedidoCreate(BaseModel):
    nombre: str
    activo: bool = True

class TipoPedidoResponse(BaseModel):
    id: str
    nombre: str
    activo: bool
    organizacion_id: str

# Modelos para Tiendas (Sucursales)
class TiendaCreate(BaseModel):
    nombre: str
    codigo_establecimiento: str  # Ej: "001" para facturación SRI
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    activa: bool = True

class TiendaResponse(BaseModel):
    id: str
    nombre: str
    codigo_establecimiento: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    activa: bool
    organizacion_id: str
    codigo_tienda: Optional[str] = None  # Código para login POS (de la organización)
    fecha_creacion: str

# Modelos para TPV (Dispositivos de Punto de Venta)
class TPVCreate(BaseModel):
    nombre: str
    punto_emision: str  # Ej: "001", "002" para facturación
    tienda_id: str
    activo: bool = True

class TPVResponse(BaseModel):
    id: str
    nombre: str
    punto_emision: str
    tienda_id: str
    tienda_nombre: Optional[str] = None
    activo: bool
    ocupado: bool = False
    ocupado_por: Optional[str] = None
    ocupado_por_nombre: Optional[str] = None
    organizacion_id: str
    fecha_creacion: str

class ProductCreate(BaseModel):
    nombre: str
    precio: float
    codigo_barras: Optional[str] = None
    descripcion: Optional[str] = None
    stock: Optional[int] = 0
    categoria: Optional[str] = None
    modificadores_activos: Optional[List[str]] = []
    imagen: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    nombre: str
    precio: float
    codigo_barras: Optional[str] = None
    descripcion: Optional[str] = None
    stock: int = 0
    categoria: Optional[str] = None
    modificadores_activos: Optional[List[str]] = []
    imagen: Optional[str] = None
    organizacion_id: str
    creado: str

class InvoiceItem(BaseModel):
    producto_id: str
    nombre: str
    precio: float
    cantidad: int
    subtotal: float

class DescuentoDetalle(BaseModel):
    tipo: str  # 'porcentaje' o 'monto'
    valor: float
    motivo: str
    monto: float

class InvoiceCreate(BaseModel):
    items: List[InvoiceItem]
    subtotal: Optional[float] = None
    descuento: Optional[float] = 0
    descuentos_detalle: Optional[List[DescuentoDetalle]] = []
    impuesto: Optional[float] = 0
    desglose_impuestos: Optional[List[dict]] = []
    total: float
    cliente_id: Optional[str] = None
    comentarios: Optional[str] = None
    metodo_pago_id: Optional[str] = None
    tipo_pedido_id: Optional[str] = None

class ImpuestoDesglose(BaseModel):
    nombre: str
    tasa: float
    tipo: str
    monto: float

class InvoiceResponse(BaseModel):
    id: str
    numero: str
    items: List[InvoiceItem]
    subtotal: float
    total_impuestos: float
    desglose_impuestos: List[ImpuestoDesglose]
    total: float
    vendedor: str
    vendedor_nombre: str
    organizacion_id: str
    caja_id: Optional[str] = None
    cliente_id: Optional[str] = None
    cliente_nombre: Optional[str] = None
    comentarios: Optional[str] = None
    metodo_pago_id: Optional[str] = None
    metodo_pago_nombre: Optional[str] = None
    tipo_pedido_id: Optional[str] = None
    tipo_pedido_nombre: Optional[str] = None
    estado: Optional[str] = "completado"
    fecha: str

class TicketAbiertoCreate(BaseModel):
    nombre: str
    items: List[InvoiceItem]
    subtotal: float
    cliente_id: Optional[str] = None
    cliente_nombre: Optional[str] = None
    comentarios: Optional[str] = None

class TicketAbiertoResponse(BaseModel):
    id: str
    nombre: str
    items: List[InvoiceItem]
    subtotal: float
    vendedor_id: str
    vendedor_nombre: str
    organizacion_id: str
    caja_id: str
    cliente_id: Optional[str] = None
    cliente_nombre: Optional[str] = None
    comentarios: Optional[str] = None
    fecha_creacion: str

class CajaApertura(BaseModel):
    monto_inicial: Optional[float] = 0.0
    tpv_id: Optional[str] = None  # ID del TPV seleccionado

class CajaCierre(BaseModel):
    efectivo_contado: float

class VentasPorMetodo(BaseModel):
    metodo_id: Optional[str] = None
    metodo_nombre: str
    total: float
    cantidad: int

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
    tpv_id: Optional[str] = None
    tpv_nombre: Optional[str] = None
    tienda_id: Optional[str] = None
    tienda_nombre: Optional[str] = None
    codigo_establecimiento: Optional[str] = None
    punto_emision: Optional[str] = None
    ventas_por_metodo: Optional[List[VentasPorMetodo]] = None

# ============ MODELOS PARA ARTÍCULOS ============
class CategoriaCreate(BaseModel):
    nombre: str
    color: Optional[str] = "#3B82F6"

class CategoriaResponse(BaseModel):
    id: str
    nombre: str
    color: str
    organizacion_id: str
    creado: str

class ModificadorOpcion(BaseModel):
    id: Optional[str] = None
    nombre: str
    precio: float = 0

class ModificadorCreate(BaseModel):
    nombre: str
    opciones: List[ModificadorOpcion] = []
    obligatorio: bool = False

class ModificadorResponse(BaseModel):
    id: str
    nombre: str
    opciones: List[dict] = []
    obligatorio: bool
    organizacion_id: str
    creado: str

class DescuentoCreate(BaseModel):
    nombre: str
    porcentaje: float
    activo: bool = True

class DescuentoResponse(BaseModel):
    id: str
    nombre: str
    porcentaje: float
    activo: bool
    organizacion_id: str
    creado: str

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
            "imprimir_ticket": False,
            "mostrar_info_cliente": False,
            "mostrar_comentarios": False,
            "logo_email": None,
            "logo_impreso": None
        }
        await db.configuraciones.insert_one(config_negocio)
        
        # Crear métodos de pago por defecto para admin
        metodos_default = [
            {
                "id": str(uuid.uuid4()),
                "nombre": "Efectivo",
                "activo": True,
                "organizacion_id": org_id
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Tarjeta",
                "activo": True,
                "organizacion_id": org_id
            }
        ]
        await db.metodos_pago.insert_many(metodos_default)

def generar_codigo_tienda(nombre_tienda: str) -> str:
    palabras = nombre_tienda.upper().replace('-', ' ').replace('_', ' ').split()
    letras = ''
    
    for palabra in palabras:
        if len(letras) >= 4:
            break
        palabra_limpia = ''.join(c for c in palabra if c.isalnum())
        if palabra_limpia:
            letras += palabra_limpia[0]
    
    if len(letras) < 4:
        nombre_limpio = ''.join(c for c in nombre_tienda.upper() if c.isalnum())
        letras = nombre_limpio[:4]
    
    letras = letras[:4].ljust(4, 'X')
    digitos = str(uuid.uuid4().hex[:4]).upper()
    
    return f"{letras}-{digitos}"

@app.post("/api/auth/login-pos")
async def login_pos(pos_login: POSLogin, response: Response):
    org = await db.organizaciones.find_one({"codigo_tienda": pos_login.codigo_tienda.upper()})
    if not org:
        raise HTTPException(status_code=401, detail="Código de tienda inválido")
    
    user = await db.usuarios.find_one({
        "username": pos_login.username,
        "organizacion_id": org["_id"]
    })
    
    if not user or not verify_password(pos_login.password, user["password"]):
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
    
    org = await db.organizaciones.find_one({"_id": current_user["organizacion_id"]})
    codigo_tienda = org.get("codigo_tienda") if org else None
    
    return {
        "id": user_id,
        "nombre": current_user["nombre"],
        "username": current_user.get("username"),
        "email": current_user.get("email"),
        "rol": current_user["rol"],
        "organizacion_id": current_user["organizacion_id"],
        "codigo_tienda": codigo_tienda
    }

class GoogleSessionRequest(BaseModel):
    nombre_tienda: Optional[str] = None
    password: Optional[str] = None

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
        
        if not body.password:
            raise HTTPException(status_code=400, detail="Se requiere una contraseña")
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        org_id = str(uuid.uuid4())
        nombre_tienda = body.nombre_tienda
        
        new_user = {
            "_id": user_id,
            "user_id": user_id,
            "nombre": nombre,
            "email": email,
            "username": email,
            "password": get_password_hash(body.password),
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
            "codigo_tienda": generar_codigo_tienda(nombre_tienda),
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
            "imprimir_ticket": False,
            "mostrar_info_cliente": False,
            "mostrar_comentarios": False,
            "logo_email": None,
            "logo_impreso": None
        }
        await db.configuraciones.insert_one(config_negocio)
        
        # Crear tienda por defecto para Google Auth
        tienda_default = {
            "id": str(uuid.uuid4()),
            "nombre": nombre_tienda,
            "direccion": None,
            "telefono": None,
            "email": email,
            "activa": True,
            "organizacion_id": org_id,
            "fecha_creacion": datetime.now(timezone.utc).isoformat()
        }
        await db.tiendas.insert_one(tienda_default)
        
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
    
    return {
        "user": {
            "id": user_id,
            "nombre": user["nombre"],
            "email": user["email"],
            "username": user.get("username"),
            "rol": user["rol"],
            "organizacion_id": user["organizacion_id"]
        }
    }

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
        "username": user_data.email,
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
        "codigo_tienda": generar_codigo_tienda(user_data.nombre_tienda),
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
    
    # Crear métodos de pago por defecto
    metodos_default = [
        {
            "id": str(uuid.uuid4()),
            "nombre": "Efectivo",
            "activo": True,
            "organizacion_id": org_id
        },
        {
            "id": str(uuid.uuid4()),
            "nombre": "Tarjeta",
            "activo": True,
            "organizacion_id": org_id
        }
    ]
    await db.metodos_pago.insert_many(metodos_default)
    
    # Crear tipos de pedido por defecto
    tipos_pedido_default = [
        {
            "id": str(uuid.uuid4()),
            "nombre": "Para llevar",
            "activo": True,
            "organizacion_id": org_id
        },
        {
            "id": str(uuid.uuid4()),
            "nombre": "Comer aquí",
            "activo": True,
            "organizacion_id": org_id
        },
        {
            "id": str(uuid.uuid4()),
            "nombre": "A domicilio",
            "activo": True,
            "organizacion_id": org_id
        }
    ]
    await db.tipos_pedido.insert_many(tipos_pedido_default)
    
    # Crear tickets predefinidos por defecto
    tickets_default = [
        {
            "id": str(uuid.uuid4()),
            "nombre": "Mesa 1",
            "organizacion_id": org_id
        },
        {
            "id": str(uuid.uuid4()),
            "nombre": "Mesa 2",
            "organizacion_id": org_id
        }
    ]
    await db.tickets_predefinidos.insert_many(tickets_default)
    
    # Crear tienda por defecto
    tienda_default = {
        "id": str(uuid.uuid4()),
        "nombre": user_data.nombre_tienda,
        "direccion": None,
        "telefono": None,
        "email": user_data.email,
        "activa": True,
        "organizacion_id": org_id,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.tiendas.insert_one(tienda_default)
    
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
            "imprimir_ticket": False,
            "mostrar_info_cliente": False,
            "mostrar_comentarios": False,
            "logo_email": None,
            "logo_impreso": None,
            "logo_url": None
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
        "imprimir_ticket": config.get("imprimir_ticket", False),
        "mostrar_info_cliente": config.get("mostrar_info_cliente", False),
        "mostrar_comentarios": config.get("mostrar_comentarios", False),
        "logo_email": config.get("logo_email"),
        "logo_impreso": config.get("logo_impreso"),
        "logo_url": config.get("logo_url")
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
    # Verificar que el username sea único DENTRO de la organización
    existing = await db.usuarios.find_one({
        "username": user.username,
        "organizacion_id": current_user["organizacion_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="El username ya existe en esta organización")
    
    if user.rol not in ["administrador", "cajero", "mesero"]:
        raise HTTPException(status_code=400, detail="Solo puedes crear usuarios con rol administrador, cajero o mesero")
    
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

@app.get("/api/impuestos", response_model=List[ImpuestoResponse])
async def get_impuestos(current_user: dict = Depends(get_current_user)):
    impuestos = await db.impuestos.find(
        {"organizacion_id": current_user["organizacion_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    return [
        ImpuestoResponse(
            id=imp["id"],
            nombre=imp["nombre"],
            tasa=imp["tasa"],
            tipo=imp["tipo"],
            activo=imp.get("activo", True),
            organizacion_id=imp["organizacion_id"]
        )
        for imp in impuestos
    ]

@app.post("/api/impuestos")
async def create_impuesto(impuesto: ImpuestoCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    impuesto_id = str(uuid.uuid4())
    nuevo_impuesto = {
        "id": impuesto_id,
        "nombre": impuesto.nombre,
        "tasa": impuesto.tasa,
        "tipo": impuesto.tipo,
        "activo": impuesto.activo,
        "organizacion_id": current_user["organizacion_id"],
        "creado": datetime.now(timezone.utc).isoformat()
    }
    
    await db.impuestos.insert_one(nuevo_impuesto)
    
    return ImpuestoResponse(
        id=impuesto_id,
        nombre=impuesto.nombre,
        tasa=impuesto.tasa,
        tipo=impuesto.tipo,
        activo=impuesto.activo,
        organizacion_id=current_user["organizacion_id"]
    )

@app.put("/api/impuestos/{impuesto_id}")
async def update_impuesto(
    impuesto_id: str,
    impuesto: ImpuestoCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.impuestos.update_one(
        {
            "id": impuesto_id,
            "organizacion_id": current_user["organizacion_id"]
        },
        {
            "$set": {
                "nombre": impuesto.nombre,
                "tasa": impuesto.tasa,
                "tipo": impuesto.tipo,
                "activo": impuesto.activo,
                "actualizado": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Impuesto no encontrado")
    
    return {"message": "Impuesto actualizado correctamente"}

@app.delete("/api/impuestos/{impuesto_id}")
async def delete_impuesto(impuesto_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.impuestos.delete_one({
        "id": impuesto_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Impuesto no encontrado")
    
    return {"message": "Impuesto eliminado correctamente"}

@app.get("/api/metodos-pago", response_model=List[MetodoPagoResponse])
async def get_metodos_pago(current_user: dict = Depends(get_current_user)):
    metodos = await db.metodos_pago.find({
        "organizacion_id": current_user["organizacion_id"]
    }, {"_id": 0}).to_list(1000)
    
    return [
        MetodoPagoResponse(
            id=m["id"],
            nombre=m["nombre"],
            activo=m["activo"],
            organizacion_id=m["organizacion_id"]
        )
        for m in metodos
    ]

@app.post("/api/metodos-pago")
async def create_metodo_pago(metodo: MetodoPagoCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    metodo_id = str(uuid.uuid4())
    
    new_metodo = {
        "id": metodo_id,
        "nombre": metodo.nombre,
        "activo": metodo.activo,
        "organizacion_id": current_user["organizacion_id"]
    }
    
    await db.metodos_pago.insert_one(new_metodo)
    
    return MetodoPagoResponse(
        id=metodo_id,
        nombre=metodo.nombre,
        activo=metodo.activo,
        organizacion_id=current_user["organizacion_id"]
    )

@app.put("/api/metodos-pago/{metodo_id}")
async def update_metodo_pago(metodo_id: str, metodo: MetodoPagoCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.metodos_pago.update_one(
        {
            "id": metodo_id,
            "organizacion_id": current_user["organizacion_id"]
        },
        {
            "$set": {
                "nombre": metodo.nombre,
                "activo": metodo.activo
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")
    
    return MetodoPagoResponse(
        id=metodo_id,
        nombre=metodo.nombre,
        activo=metodo.activo,
        organizacion_id=current_user["organizacion_id"]
    )

@app.delete("/api/metodos-pago/{metodo_id}")
async def delete_metodo_pago(metodo_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.metodos_pago.delete_one({
        "id": metodo_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")
    
    return {"message": "Método de pago eliminado correctamente"}

# Configuración de funciones
@app.get("/api/funciones")
async def get_funciones(current_user: dict = Depends(get_current_user)):
    config = await db.funciones_config.find_one({"organizacion_id": current_user["organizacion_id"]}, {"_id": 0})
    
    # Contar tickets abiertos
    tickets_count = await db.tickets_abiertos.count_documents({
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not config:
        return {
            "cierres_caja": True,
            "tickets_abiertos": False,
            "tipo_pedido": False,
            "venta_con_stock": True,
            "funcion_reloj": False,
            "impresoras_cocina": False,
            "pantalla_clientes": False,
            "tickets_abiertos_count": tickets_count
        }
    return {
        "cierres_caja": config.get("cierres_caja", True),
        "tickets_abiertos": config.get("tickets_abiertos", False),
        "tipo_pedido": config.get("tipo_pedido", False),
        "venta_con_stock": config.get("venta_con_stock", True),
        "funcion_reloj": config.get("funcion_reloj", False),
        "impresoras_cocina": config.get("impresoras_cocina", False),
        "pantalla_clientes": config.get("pantalla_clientes", False),
        "tickets_abiertos_count": tickets_count
    }

@app.put("/api/funciones")
async def update_funciones(funciones: FuncionesConfig, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    # Verificar si se está intentando desactivar tickets_abiertos
    if not funciones.tickets_abiertos:
        # Contar tickets abiertos de la organización
        tickets_count = await db.tickets_abiertos.count_documents({
            "organizacion_id": current_user["organizacion_id"]
        })
        if tickets_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"No puedes desactivar 'Tickets abiertos' porque tienes {tickets_count} ticket(s) guardado(s). Elimínalos primero."
            )
    
    await db.funciones_config.update_one(
        {"organizacion_id": current_user["organizacion_id"]},
        {"$set": {
            "organizacion_id": current_user["organizacion_id"],
            "cierres_caja": funciones.cierres_caja,
            "tickets_abiertos": funciones.tickets_abiertos,
            "tipo_pedido": funciones.tipo_pedido,
            "venta_con_stock": funciones.venta_con_stock,
            "funcion_reloj": funciones.funcion_reloj,
            "impresoras_cocina": funciones.impresoras_cocina,
            "pantalla_clientes": funciones.pantalla_clientes
        }},
        upsert=True
    )
    
    return {"message": "Configuración de funciones actualizada"}

# Tickets predefinidos (Mesas)
@app.get("/api/tickets-predefinidos", response_model=List[TicketPredefinidoResponse])
async def get_tickets_predefinidos(current_user: dict = Depends(get_current_user)):
    tickets = await db.tickets_predefinidos.find({
        "organizacion_id": current_user["organizacion_id"]
    }, {"_id": 0}).to_list(1000)
    
    return [
        TicketPredefinidoResponse(
            id=t["id"],
            nombre=t["nombre"],
            organizacion_id=t["organizacion_id"]
        )
        for t in tickets
    ]

@app.post("/api/tickets-predefinidos")
async def create_ticket_predefinido(ticket: TicketPredefinidoCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    ticket_id = str(uuid.uuid4())
    
    new_ticket = {
        "id": ticket_id,
        "nombre": ticket.nombre,
        "organizacion_id": current_user["organizacion_id"]
    }
    
    await db.tickets_predefinidos.insert_one(new_ticket)
    
    return TicketPredefinidoResponse(
        id=ticket_id,
        nombre=ticket.nombre,
        organizacion_id=current_user["organizacion_id"]
    )

@app.delete("/api/tickets-predefinidos/{ticket_id}")
async def delete_ticket_predefinido(ticket_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.tickets_predefinidos.delete_one({
        "id": ticket_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket predefinido no encontrado")
    
    return {"message": "Ticket predefinido eliminado correctamente"}

# Tipos de pedido
@app.get("/api/tipos-pedido", response_model=List[TipoPedidoResponse])
async def get_tipos_pedido(current_user: dict = Depends(get_current_user)):
    tipos = await db.tipos_pedido.find({
        "organizacion_id": current_user["organizacion_id"]
    }, {"_id": 0}).to_list(1000)
    
    return [
        TipoPedidoResponse(
            id=t["id"],
            nombre=t["nombre"],
            activo=t["activo"],
            organizacion_id=t["organizacion_id"]
        )
        for t in tipos
    ]

@app.post("/api/tipos-pedido")
async def create_tipo_pedido(tipo: TipoPedidoCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    tipo_id = str(uuid.uuid4())
    
    new_tipo = {
        "id": tipo_id,
        "nombre": tipo.nombre,
        "activo": tipo.activo,
        "organizacion_id": current_user["organizacion_id"]
    }
    
    await db.tipos_pedido.insert_one(new_tipo)
    
    return TipoPedidoResponse(
        id=tipo_id,
        nombre=tipo.nombre,
        activo=tipo.activo,
        organizacion_id=current_user["organizacion_id"]
    )

@app.put("/api/tipos-pedido/{tipo_id}")
async def update_tipo_pedido(tipo_id: str, tipo: TipoPedidoCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.tipos_pedido.update_one(
        {
            "id": tipo_id,
            "organizacion_id": current_user["organizacion_id"]
        },
        {
            "$set": {
                "nombre": tipo.nombre,
                "activo": tipo.activo
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de pedido no encontrado")
    
    return TipoPedidoResponse(
        id=tipo_id,
        nombre=tipo.nombre,
        activo=tipo.activo,
        organizacion_id=current_user["organizacion_id"]
    )

@app.delete("/api/tipos-pedido/{tipo_id}")
async def delete_tipo_pedido(tipo_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.tipos_pedido.delete_one({
        "id": tipo_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de pedido no encontrado")
    
    return {"message": "Tipo de pedido eliminado correctamente"}

# Tiendas (Sucursales)
@app.get("/api/tiendas", response_model=List[TiendaResponse])
async def get_tiendas(current_user: dict = Depends(get_current_user)):
    tiendas = await db.tiendas.find({
        "organizacion_id": current_user["organizacion_id"]
    }, {"_id": 0}).to_list(1000)
    
    # Obtener el código de tienda de la organización
    org = await db.organizaciones.find_one({"_id": current_user["organizacion_id"]})
    codigo_tienda_org = org.get("codigo_tienda") if org else None
    
    return [
        TiendaResponse(
            id=t["id"],
            nombre=t["nombre"],
            codigo_establecimiento=t.get("codigo_establecimiento", "001"),
            direccion=t.get("direccion"),
            telefono=t.get("telefono"),
            email=t.get("email"),
            activa=t.get("activa", True),
            organizacion_id=t["organizacion_id"],
            codigo_tienda=codigo_tienda_org,
            fecha_creacion=t.get("fecha_creacion", "")
        )
        for t in tiendas
    ]

@app.post("/api/tiendas")
async def create_tienda(tienda: TiendaCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    # Validar código de establecimiento único en la organización
    existing = await db.tiendas.find_one({
        "codigo_establecimiento": tienda.codigo_establecimiento,
        "organizacion_id": current_user["organizacion_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="El código de establecimiento ya existe")
    
    tienda_id = str(uuid.uuid4())
    
    # Obtener el código de tienda de la organización
    org = await db.organizaciones.find_one({"_id": current_user["organizacion_id"]})
    codigo_tienda_org = org.get("codigo_tienda") if org else None
    
    nueva_tienda = {
        "id": tienda_id,
        "nombre": tienda.nombre,
        "codigo_establecimiento": tienda.codigo_establecimiento,
        "direccion": tienda.direccion,
        "telefono": tienda.telefono,
        "email": tienda.email,
        "activa": tienda.activa,
        "organizacion_id": current_user["organizacion_id"],
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tiendas.insert_one(nueva_tienda)
    
    return TiendaResponse(
        id=tienda_id,
        nombre=tienda.nombre,
        codigo_establecimiento=tienda.codigo_establecimiento,
        direccion=tienda.direccion,
        telefono=tienda.telefono,
        email=tienda.email,
        activa=tienda.activa,
        organizacion_id=current_user["organizacion_id"],
        codigo_tienda=codigo_tienda_org,
        fecha_creacion=nueva_tienda["fecha_creacion"]
    )

@app.put("/api/tiendas/{tienda_id}")
async def update_tienda(tienda_id: str, tienda: TiendaCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    # Validar código de establecimiento único (excluyendo la tienda actual)
    existing = await db.tiendas.find_one({
        "codigo_establecimiento": tienda.codigo_establecimiento,
        "organizacion_id": current_user["organizacion_id"],
        "id": {"$ne": tienda_id}
    })
    if existing:
        raise HTTPException(status_code=400, detail="El código de establecimiento ya existe")
    
    result = await db.tiendas.update_one(
        {
            "id": tienda_id,
            "organizacion_id": current_user["organizacion_id"]
        },
        {
            "$set": {
                "nombre": tienda.nombre,
                "codigo_establecimiento": tienda.codigo_establecimiento,
                "direccion": tienda.direccion,
                "telefono": tienda.telefono,
                "email": tienda.email,
                "activa": tienda.activa
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Obtener la tienda actualizada y el código de tienda
    tienda_actualizada = await db.tiendas.find_one({"id": tienda_id}, {"_id": 0})
    org = await db.organizaciones.find_one({"_id": current_user["organizacion_id"]})
    codigo_tienda_org = org.get("codigo_tienda") if org else None
    
    return TiendaResponse(
        id=tienda_id,
        nombre=tienda.nombre,
        codigo_establecimiento=tienda.codigo_establecimiento,
        direccion=tienda.direccion,
        telefono=tienda.telefono,
        email=tienda.email,
        activa=tienda.activa,
        organizacion_id=current_user["organizacion_id"],
        codigo_tienda=codigo_tienda_org,
        fecha_creacion=tienda_actualizada.get("fecha_creacion", "")
    )

@app.delete("/api/tiendas/{tienda_id}")
async def delete_tienda(tienda_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    result = await db.tiendas.delete_one({
        "id": tienda_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    return {"message": "Tienda eliminada correctamente"}

# TPV (Dispositivos de Punto de Venta)
@app.get("/api/tpv", response_model=List[TPVResponse])
async def get_tpvs(current_user: dict = Depends(get_current_user)):
    tpvs = await db.tpv.find({
        "organizacion_id": current_user["organizacion_id"]
    }, {"_id": 0}).to_list(1000)
    
    result = []
    for t in tpvs:
        # Obtener nombre de la tienda
        tienda = await db.tiendas.find_one({"id": t["tienda_id"]}, {"_id": 0, "nombre": 1})
        tienda_nombre = tienda["nombre"] if tienda else "Sin tienda"
        
        result.append(TPVResponse(
            id=t["id"],
            nombre=t["nombre"],
            punto_emision=t["punto_emision"],
            tienda_id=t["tienda_id"],
            tienda_nombre=tienda_nombre,
            activo=t.get("activo", True),
            ocupado=t.get("ocupado", False),
            ocupado_por=t.get("ocupado_por"),
            ocupado_por_nombre=t.get("ocupado_por_nombre"),
            organizacion_id=t["organizacion_id"],
            fecha_creacion=t.get("fecha_creacion", "")
        ))
    
    return result

@app.get("/api/tpv/disponibles", response_model=List[TPVResponse])
async def get_tpvs_disponibles(current_user: dict = Depends(get_current_user)):
    """Obtiene solo los TPV activos y no ocupados para selección al abrir caja"""
    # Buscar TPVs de la organización que estén activos (o sin el campo activo) y no ocupados
    tpvs = await db.tpv.find({
        "organizacion_id": current_user["organizacion_id"],
        "$or": [
            {"activo": True},
            {"activo": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Filtrar los que no están ocupados
    result = []
    for t in tpvs:
        # Considerar disponible si ocupado es False, None, o no existe
        ocupado = t.get("ocupado")
        if ocupado is True:
            continue  # Este está ocupado, saltar
            
        tienda = await db.tiendas.find_one({"id": t["tienda_id"]}, {"_id": 0, "nombre": 1})
        tienda_nombre = tienda["nombre"] if tienda else "Sin tienda"
        
        result.append(TPVResponse(
            id=t["id"],
            nombre=t["nombre"],
            punto_emision=t["punto_emision"],
            tienda_id=t["tienda_id"],
            tienda_nombre=tienda_nombre,
            activo=t.get("activo", True),
            ocupado=False,
            ocupado_por=None,
            ocupado_por_nombre=None,
            organizacion_id=t["organizacion_id"],
            fecha_creacion=t.get("fecha_creacion", "")
        ))
    
    return result

@app.post("/api/tpv/crear-automatico")
async def crear_tpv_automatico(current_user: dict = Depends(get_current_user)):
    """Crea automáticamente una tienda y TPV por defecto si no existen disponibles"""
    org_id = current_user["organizacion_id"]
    
    # Verificar si ya hay TPVs disponibles (activos y no ocupados)
    tpv_disponible = await db.tpv.find_one({
        "organizacion_id": org_id,
        "$and": [
            {"$or": [{"activo": True}, {"activo": {"$exists": False}}]},
            {"$or": [{"ocupado": False}, {"ocupado": {"$exists": False}}, {"ocupado": None}]}
        ]
    })
    
    if tpv_disponible:
        # Ya hay un TPV disponible
        tienda = await db.tiendas.find_one({"id": tpv_disponible["tienda_id"]}, {"_id": 0})
        return {
            "mensaje": "Ya existe un TPV disponible",
            "tpv_id": tpv_disponible["id"],
            "tpv_nombre": tpv_disponible["nombre"],
            "tienda_nombre": tienda["nombre"] if tienda else "Sin tienda",
            "creado": False
        }
    
    # Buscar o crear tienda por defecto
    tienda = await db.tiendas.find_one({"organizacion_id": org_id}, {"_id": 0})
    
    if not tienda:
        # Crear tienda por defecto
        tienda_id = str(uuid.uuid4())
        tienda = {
            "id": tienda_id,
            "nombre": "Tienda Principal",
            "codigo_establecimiento": "001",
            "direccion": "",
            "telefono": "",
            "organizacion_id": org_id,
            "activo": True,
            "fecha_creacion": datetime.now(timezone.utc).isoformat()
        }
        await db.tiendas.insert_one(tienda)
    else:
        tienda_id = tienda["id"]
    
    # Contar TPVs existentes para determinar el siguiente número
    tpvs_count = await db.tpv.count_documents({
        "organizacion_id": org_id,
        "tienda_id": tienda_id
    })
    siguiente_numero = tpvs_count + 1
    
    # Crear TPV con secuencia correcta
    tpv_id = str(uuid.uuid4())
    nuevo_tpv = {
        "id": tpv_id,
        "nombre": f"Caja {siguiente_numero}",
        "punto_emision": f"{siguiente_numero:03d}",
        "tienda_id": tienda_id,
        "activo": True,
        "ocupado": False,
        "ocupado_por": None,
        "ocupado_por_nombre": None,
        "organizacion_id": org_id,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.tpv.insert_one(nuevo_tpv)
    
    return {
        "mensaje": "TPV creado automáticamente",
        "tpv_id": tpv_id,
        "tpv_nombre": "Caja 1",
        "tienda_nombre": tienda["nombre"],
        "creado": True
    }

@app.post("/api/tpv")
async def create_tpv(tpv: TPVCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    # Validar que la tienda existe
    tienda = await db.tiendas.find_one({
        "id": tpv.tienda_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Validar punto de emisión único dentro de la tienda
    existing = await db.tpv.find_one({
        "punto_emision": tpv.punto_emision,
        "tienda_id": tpv.tienda_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="El punto de emisión ya existe en esta tienda")
    
    tpv_id = str(uuid.uuid4())
    
    nuevo_tpv = {
        "id": tpv_id,
        "nombre": tpv.nombre,
        "punto_emision": tpv.punto_emision,
        "tienda_id": tpv.tienda_id,
        "activo": tpv.activo,
        "ocupado": False,
        "ocupado_por": None,
        "ocupado_por_nombre": None,
        "organizacion_id": current_user["organizacion_id"],
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tpv.insert_one(nuevo_tpv)
    
    return TPVResponse(
        id=tpv_id,
        nombre=tpv.nombre,
        punto_emision=tpv.punto_emision,
        tienda_id=tpv.tienda_id,
        tienda_nombre=tienda["nombre"],
        activo=tpv.activo,
        ocupado=False,
        ocupado_por=None,
        ocupado_por_nombre=None,
        organizacion_id=current_user["organizacion_id"],
        fecha_creacion=nuevo_tpv["fecha_creacion"]
    )

@app.put("/api/tpv/{tpv_id}")
async def update_tpv(tpv_id: str, tpv: TPVCreate, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    # Validar que el TPV no esté ocupado
    tpv_actual = await db.tpv.find_one({"id": tpv_id, "organizacion_id": current_user["organizacion_id"]})
    if not tpv_actual:
        raise HTTPException(status_code=404, detail="TPV no encontrado")
    
    if tpv_actual.get("ocupado"):
        raise HTTPException(status_code=400, detail="No se puede modificar un TPV ocupado")
    
    # Validar que la tienda existe
    tienda = await db.tiendas.find_one({
        "id": tpv.tienda_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Validar punto de emisión único (excluyendo el TPV actual)
    existing = await db.tpv.find_one({
        "punto_emision": tpv.punto_emision,
        "tienda_id": tpv.tienda_id,
        "organizacion_id": current_user["organizacion_id"],
        "id": {"$ne": tpv_id}
    })
    if existing:
        raise HTTPException(status_code=400, detail="El punto de emisión ya existe en esta tienda")
    
    await db.tpv.update_one(
        {"id": tpv_id, "organizacion_id": current_user["organizacion_id"]},
        {
            "$set": {
                "nombre": tpv.nombre,
                "punto_emision": tpv.punto_emision,
                "tienda_id": tpv.tienda_id,
                "activo": tpv.activo
            }
        }
    )
    
    tpv_actualizado = await db.tpv.find_one({"id": tpv_id}, {"_id": 0})
    
    return TPVResponse(
        id=tpv_id,
        nombre=tpv.nombre,
        punto_emision=tpv.punto_emision,
        tienda_id=tpv.tienda_id,
        tienda_nombre=tienda["nombre"],
        activo=tpv.activo,
        ocupado=tpv_actualizado.get("ocupado", False),
        ocupado_por=tpv_actualizado.get("ocupado_por"),
        ocupado_por_nombre=tpv_actualizado.get("ocupado_por_nombre"),
        organizacion_id=current_user["organizacion_id"],
        fecha_creacion=tpv_actualizado.get("fecha_creacion", "")
    )

@app.delete("/api/tpv/{tpv_id}")
async def delete_tpv(tpv_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    # Validar que el TPV no esté ocupado
    tpv = await db.tpv.find_one({"id": tpv_id, "organizacion_id": current_user["organizacion_id"]})
    if not tpv:
        raise HTTPException(status_code=404, detail="TPV no encontrado")
    
    if tpv.get("ocupado"):
        raise HTTPException(status_code=400, detail="No se puede eliminar un TPV ocupado")
    
    await db.tpv.delete_one({"id": tpv_id, "organizacion_id": current_user["organizacion_id"]})
    
    return {"message": "TPV eliminado correctamente"}

# Tickets Abiertos
@app.get("/api/tickets-abiertos-pos", response_model=List[TicketAbiertoResponse])
async def get_tickets_abiertos_pos(current_user: dict = Depends(get_current_user)):
    # Obtener caja activa del usuario
    caja_activa = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja_activa:
        return []
    
    tickets = await db.tickets_abiertos.find({
        "caja_id": caja_activa["_id"],
        "organizacion_id": current_user["organizacion_id"]
    }, {"_id": 0}).sort("fecha_creacion", -1).to_list(1000)
    
    return [
        TicketAbiertoResponse(
            id=t["id"],
            nombre=t["nombre"],
            items=[InvoiceItem(**item) for item in t["items"]],
            subtotal=t["subtotal"],
            vendedor_id=t["vendedor_id"],
            vendedor_nombre=t["vendedor_nombre"],
            organizacion_id=t["organizacion_id"],
            caja_id=t["caja_id"],
            cliente_id=t.get("cliente_id"),
            cliente_nombre=t.get("cliente_nombre"),
            comentarios=t.get("comentarios"),
            fecha_creacion=t["fecha_creacion"]
        )
        for t in tickets
    ]

@app.post("/api/tickets-abiertos-pos")
async def create_ticket_abierto(ticket: TicketAbiertoCreate, current_user: dict = Depends(get_current_user)):
    # Verificar caja activa
    caja_activa = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja_activa:
        raise HTTPException(status_code=400, detail="Debes abrir una caja antes de guardar tickets")
    
    ticket_id = str(uuid.uuid4())
    
    new_ticket = {
        "id": ticket_id,
        "nombre": ticket.nombre,
        "items": [item.model_dump() for item in ticket.items],
        "subtotal": ticket.subtotal,
        "vendedor_id": current_user["_id"],
        "vendedor_nombre": current_user["nombre"],
        "organizacion_id": current_user["organizacion_id"],
        "caja_id": caja_activa["_id"],
        "cliente_id": ticket.cliente_id,
        "cliente_nombre": ticket.cliente_nombre,
        "comentarios": ticket.comentarios,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tickets_abiertos.insert_one(new_ticket)
    
    return TicketAbiertoResponse(
        id=ticket_id,
        nombre=ticket.nombre,
        items=ticket.items,
        subtotal=ticket.subtotal,
        vendedor_id=current_user["_id"],
        vendedor_nombre=current_user["nombre"],
        organizacion_id=current_user["organizacion_id"],
        caja_id=caja_activa["_id"],
        cliente_id=ticket.cliente_id,
        cliente_nombre=ticket.cliente_nombre,
        comentarios=ticket.comentarios,
        fecha_creacion=new_ticket["fecha_creacion"]
    )

@app.put("/api/tickets-abiertos-pos/{ticket_id}")
async def update_ticket_abierto(ticket_id: str, ticket: TicketAbiertoCreate, current_user: dict = Depends(get_current_user)):
    result = await db.tickets_abiertos.update_one(
        {
            "id": ticket_id,
            "vendedor_id": current_user["_id"],
            "organizacion_id": current_user["organizacion_id"]
        },
        {
            "$set": {
                "nombre": ticket.nombre,
                "items": [item.model_dump() for item in ticket.items],
                "subtotal": ticket.subtotal,
                "cliente_id": ticket.cliente_id,
                "cliente_nombre": ticket.cliente_nombre,
                "comentarios": ticket.comentarios
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    return {"message": "Ticket actualizado correctamente"}

@app.delete("/api/tickets-abiertos-pos/{ticket_id}")
async def delete_ticket_abierto(ticket_id: str, current_user: dict = Depends(get_current_user)):
    # Propietarios y administradores pueden eliminar cualquier ticket de su organización
    if current_user["rol"] in ["propietario", "administrador"]:
        result = await db.tickets_abiertos.delete_one({
            "id": ticket_id,
            "organizacion_id": current_user["organizacion_id"]
        })
    else:
        # Cajeros y meseros solo pueden eliminar sus propios tickets
        result = await db.tickets_abiertos.delete_one({
            "id": ticket_id,
            "vendedor_id": current_user["_id"],
            "organizacion_id": current_user["organizacion_id"]
        })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket no encontrado o sin permisos")
    
    return {"message": "Ticket eliminado correctamente"}

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
            categoria=p.get("categoria"),
            modificadores_activos=p.get("modificadores_activos", []),
            imagen=p.get("imagen"),
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
        categoria=producto.get("categoria"),
        modificadores_activos=producto.get("modificadores_activos", []),
        imagen=producto.get("imagen"),
        organizacion_id=producto["organizacion_id"],
        creado=producto["creado"]
    )

@app.post("/api/productos/upload-imagen")
async def upload_producto_imagen(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_propietario_or_admin)
):
    """Sube una imagen para un producto y devuelve la URL"""
    # Validar tipo de archivo
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP")
    
    # Generar nombre único
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Guardar archivo
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Devolver URL relativa
    imagen_url = f"/api/uploads/productos/{filename}"
    return {"url": imagen_url, "filename": filename}

@app.post("/api/config/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_propietario_or_admin)
):
    """Sube un logo para el negocio y devuelve la URL"""
    # Validar tipo de archivo
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP")
    
    # Generar nombre único
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"logo_{current_user['organizacion_id']}_{uuid.uuid4()}.{ext}"
    filepath = LOGOS_DIR / filename
    
    # Guardar archivo
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Devolver URL relativa
    logo_url = f"/api/uploads/logos/{filename}"
    return {"url": logo_url, "filename": filename}

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
        "categoria": product.categoria,
        "modificadores_activos": product.modificadores_activos or [],
        "imagen": product.imagen,
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
        categoria=product.categoria,
        modificadores_activos=product.modificadores_activos or [],
        imagen=product.imagen,
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
        "stock": product.stock or 0,
        "categoria": product.categoria,
        "modificadores_activos": product.modificadores_activos or [],
        "imagen": product.imagen
    }
    
    await db.productos.update_one({"_id": product_id}, {"$set": updated_product})
    
    return ProductResponse(
        id=product_id,
        nombre=product.nombre,
        precio=product.precio,
        codigo_barras=product.codigo_barras,
        descripcion=product.descripcion,
        stock=product.stock or 0,
        categoria=product.categoria,
        modificadores_activos=product.modificadores_activos or [],
        imagen=product.imagen,
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

# ============ ENDPOINTS CATEGORÍAS ============
@app.get("/api/categorias", response_model=List[CategoriaResponse])
async def get_categorias(current_user: dict = Depends(get_current_user)):
    categorias = await db.categorias.find({"organizacion_id": current_user["organizacion_id"]}).to_list(1000)
    return [
        CategoriaResponse(
            id=cat["_id"],
            nombre=cat["nombre"],
            color=cat.get("color", "#3B82F6"),
            organizacion_id=cat["organizacion_id"],
            creado=cat["creado"]
        )
        for cat in categorias
    ]

@app.post("/api/categorias", response_model=CategoriaResponse)
async def create_categoria(categoria: CategoriaCreate, current_user: dict = Depends(get_propietario_or_admin)):
    categoria_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    categoria_doc = {
        "_id": categoria_id,
        "nombre": categoria.nombre,
        "color": categoria.color,
        "organizacion_id": current_user["organizacion_id"],
        "creado": now
    }
    
    await db.categorias.insert_one(categoria_doc)
    
    return CategoriaResponse(
        id=categoria_id,
        nombre=categoria.nombre,
        color=categoria.color,
        organizacion_id=current_user["organizacion_id"],
        creado=now
    )

@app.put("/api/categorias/{categoria_id}", response_model=CategoriaResponse)
async def update_categoria(categoria_id: str, categoria: CategoriaCreate, current_user: dict = Depends(get_propietario_or_admin)):
    result = await db.categorias.update_one(
        {"_id": categoria_id, "organizacion_id": current_user["organizacion_id"]},
        {"$set": {"nombre": categoria.nombre, "color": categoria.color}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    updated = await db.categorias.find_one({"_id": categoria_id})
    return CategoriaResponse(
        id=updated["_id"],
        nombre=updated["nombre"],
        color=updated.get("color", "#3B82F6"),
        organizacion_id=updated["organizacion_id"],
        creado=updated["creado"]
    )

@app.delete("/api/categorias/{categoria_id}")
async def delete_categoria(categoria_id: str, current_user: dict = Depends(get_propietario_or_admin)):
    result = await db.categorias.delete_one({"_id": categoria_id, "organizacion_id": current_user["organizacion_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"message": "Categoría eliminada"}

# ============ ENDPOINTS MODIFICADORES ============
@app.get("/api/modificadores", response_model=List[ModificadorResponse])
async def get_modificadores(current_user: dict = Depends(get_current_user)):
    modificadores = await db.modificadores.find({"organizacion_id": current_user["organizacion_id"]}).to_list(1000)
    return [
        ModificadorResponse(
            id=mod["_id"],
            nombre=mod["nombre"],
            opciones=mod.get("opciones", []),
            obligatorio=mod.get("obligatorio", False),
            organizacion_id=mod["organizacion_id"],
            creado=mod["creado"]
        )
        for mod in modificadores
    ]

@app.post("/api/modificadores", response_model=ModificadorResponse)
async def create_modificador(modificador: ModificadorCreate, current_user: dict = Depends(get_propietario_or_admin)):
    modificador_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Añadir IDs a las opciones
    opciones_con_id = []
    for opcion in modificador.opciones:
        opciones_con_id.append({
            "id": opcion.id or str(uuid.uuid4()),
            "nombre": opcion.nombre,
            "precio": opcion.precio
        })
    
    modificador_doc = {
        "_id": modificador_id,
        "nombre": modificador.nombre,
        "opciones": opciones_con_id,
        "obligatorio": modificador.obligatorio,
        "organizacion_id": current_user["organizacion_id"],
        "creado": now
    }
    
    await db.modificadores.insert_one(modificador_doc)
    
    return ModificadorResponse(
        id=modificador_id,
        nombre=modificador.nombre,
        opciones=opciones_con_id,
        obligatorio=modificador.obligatorio,
        organizacion_id=current_user["organizacion_id"],
        creado=now
    )

@app.put("/api/modificadores/{modificador_id}", response_model=ModificadorResponse)
async def update_modificador(modificador_id: str, modificador: ModificadorCreate, current_user: dict = Depends(get_propietario_or_admin)):
    # Añadir IDs a las opciones
    opciones_con_id = []
    for opcion in modificador.opciones:
        opciones_con_id.append({
            "id": opcion.id or str(uuid.uuid4()),
            "nombre": opcion.nombre,
            "precio": opcion.precio
        })
    
    result = await db.modificadores.update_one(
        {"_id": modificador_id, "organizacion_id": current_user["organizacion_id"]},
        {"$set": {"nombre": modificador.nombre, "opciones": opciones_con_id, "obligatorio": modificador.obligatorio}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Modificador no encontrado")
    
    updated = await db.modificadores.find_one({"_id": modificador_id})
    return ModificadorResponse(
        id=updated["_id"],
        nombre=updated["nombre"],
        opciones=updated.get("opciones", []),
        obligatorio=updated.get("obligatorio", False),
        organizacion_id=updated["organizacion_id"],
        creado=updated["creado"]
    )

@app.delete("/api/modificadores/{modificador_id}")
async def delete_modificador(modificador_id: str, current_user: dict = Depends(get_propietario_or_admin)):
    result = await db.modificadores.delete_one({"_id": modificador_id, "organizacion_id": current_user["organizacion_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modificador no encontrado")
    return {"message": "Modificador eliminado"}

# ============ ENDPOINTS DESCUENTOS ============
@app.get("/api/descuentos", response_model=List[DescuentoResponse])
async def get_descuentos(current_user: dict = Depends(get_current_user)):
    descuentos = await db.descuentos.find({"organizacion_id": current_user["organizacion_id"]}).to_list(1000)
    return [
        DescuentoResponse(
            id=desc["_id"],
            nombre=desc["nombre"],
            porcentaje=desc["porcentaje"],
            activo=desc.get("activo", True),
            organizacion_id=desc["organizacion_id"],
            creado=desc["creado"]
        )
        for desc in descuentos
    ]

@app.post("/api/descuentos", response_model=DescuentoResponse)
async def create_descuento(descuento: DescuentoCreate, current_user: dict = Depends(get_propietario_or_admin)):
    descuento_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    descuento_doc = {
        "_id": descuento_id,
        "nombre": descuento.nombre,
        "porcentaje": descuento.porcentaje,
        "activo": descuento.activo,
        "organizacion_id": current_user["organizacion_id"],
        "creado": now
    }
    
    await db.descuentos.insert_one(descuento_doc)
    
    return DescuentoResponse(
        id=descuento_id,
        nombre=descuento.nombre,
        porcentaje=descuento.porcentaje,
        activo=descuento.activo,
        organizacion_id=current_user["organizacion_id"],
        creado=now
    )

@app.put("/api/descuentos/{descuento_id}", response_model=DescuentoResponse)
async def update_descuento(descuento_id: str, descuento: DescuentoCreate, current_user: dict = Depends(get_propietario_or_admin)):
    result = await db.descuentos.update_one(
        {"_id": descuento_id, "organizacion_id": current_user["organizacion_id"]},
        {"$set": {"nombre": descuento.nombre, "porcentaje": descuento.porcentaje, "activo": descuento.activo}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Descuento no encontrado")
    
    updated = await db.descuentos.find_one({"_id": descuento_id})
    return DescuentoResponse(
        id=updated["_id"],
        nombre=updated["nombre"],
        porcentaje=updated["porcentaje"],
        activo=updated.get("activo", True),
        organizacion_id=updated["organizacion_id"],
        creado=updated["creado"]
    )

@app.delete("/api/descuentos/{descuento_id}")
async def delete_descuento(descuento_id: str, current_user: dict = Depends(get_propietario_or_admin)):
    result = await db.descuentos.delete_one({"_id": descuento_id, "organizacion_id": current_user["organizacion_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Descuento no encontrado")
    return {"message": "Descuento eliminado"}

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
    cliente_id = str(uuid.uuid4())
    
    # Validar cédula/RUC única si se proporciona
    if cliente.cedula_ruc:
        existing = await db.clientes.find_one({
            "cedula_ruc": cliente.cedula_ruc,
            "organizacion_id": current_user["organizacion_id"]
        })
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un cliente con esta cédula/RUC")
    
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
    
    # Validar cédula/RUC única si se proporciona (excluyendo el cliente actual)
    if cliente.cedula_ruc:
        duplicate = await db.clientes.find_one({
            "cedula_ruc": cliente.cedula_ruc,
            "organizacion_id": current_user["organizacion_id"],
            "_id": {"$ne": cliente_id}
        })
        if duplicate:
            raise HTTPException(status_code=400, detail="Ya existe un cliente con esta cédula/RUC")
    
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
        estado=caja["estado"],
        tpv_id=caja.get("tpv_id"),
        tpv_nombre=caja.get("tpv_nombre"),
        tienda_id=caja.get("tienda_id"),
        tienda_nombre=caja.get("tienda_nombre"),
        codigo_establecimiento=caja.get("codigo_establecimiento"),
        punto_emision=caja.get("punto_emision")
    )

@app.post("/api/caja/abrir")
async def abrir_caja(apertura: CajaApertura, current_user: dict = Depends(get_current_user)):
    caja_abierta = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if caja_abierta:
        raise HTTPException(status_code=400, detail="Ya tienes una caja abierta")
    
    # Verificar configuración de cierres de caja
    funciones_config = await db.funciones_config.find_one({"organizacion_id": current_user["organizacion_id"]}, {"_id": 0})
    cierres_caja_activo = funciones_config.get("cierres_caja", True) if funciones_config else True
    
    # Los meseros no manejan dinero - siempre monto_inicial = 0 y no requieren cierre
    es_mesero = current_user.get("rol") == "mesero"
    
    # Si cierres de caja está desactivado o es mesero, usar monto_inicial = 0
    if es_mesero or not cierres_caja_activo:
        monto_inicial = 0.0
        requiere_cierre = False
    else:
        monto_inicial = apertura.monto_inicial or 0.0
        requiere_cierre = True
    
    # Variables para TPV
    tpv_id = None
    tpv_nombre = None
    tienda_id = None
    tienda_nombre = None
    codigo_establecimiento = None
    punto_emision = None
    numero_caja = None
    
    # Si se proporciona un TPV, validarlo y ocuparlo
    if apertura.tpv_id:
        tpv = await db.tpv.find_one({
            "id": apertura.tpv_id,
            "organizacion_id": current_user["organizacion_id"],
            "activo": True
        })
        
        if not tpv:
            raise HTTPException(status_code=404, detail="TPV no encontrado o no está activo")
        
        if tpv.get("ocupado"):
            raise HTTPException(status_code=400, detail="El TPV ya está ocupado por otro usuario")
        
        # Obtener datos de la tienda
        tienda = await db.tiendas.find_one({"id": tpv["tienda_id"]}, {"_id": 0})
        if not tienda:
            raise HTTPException(status_code=404, detail="Tienda del TPV no encontrada")
        
        tpv_id = tpv["id"]
        tpv_nombre = tpv["nombre"]
        tienda_id = tienda["id"]
        tienda_nombre = tienda["nombre"]
        codigo_establecimiento = tienda.get("codigo_establecimiento", "001")
        punto_emision = tpv["punto_emision"]
        
        # Marcar el TPV como ocupado
        await db.tpv.update_one(
            {"id": tpv_id},
            {
                "$set": {
                    "ocupado": True,
                    "ocupado_por": current_user["_id"],
                    "ocupado_por_nombre": current_user["nombre"]
                }
            }
        )
        
        # El nombre de la caja será el nombre del TPV
        numero_caja = tpv_nombre
    else:
        # No se proporcionó TPV - verificar si hay alguno disponible o crear uno automáticamente
        org_id = current_user["organizacion_id"]
        
        # Buscar TPV disponible (activo y NO ocupado)
        tpv_disponible = await db.tpv.find_one({
            "organizacion_id": org_id,
            "$and": [
                {"$or": [{"activo": True}, {"activo": {"$exists": False}}]},
                {"$or": [{"ocupado": False}, {"ocupado": {"$exists": False}}, {"ocupado": None}]}
            ]
        })
        
        if not tpv_disponible:
            # No hay TPVs disponibles - crear uno nuevo con secuencia correcta
            # Primero buscar o crear tienda
            tienda = await db.tiendas.find_one({"organizacion_id": org_id}, {"_id": 0})
            
            if not tienda:
                # Crear tienda por defecto
                nueva_tienda_id = str(uuid.uuid4())
                tienda = {
                    "id": nueva_tienda_id,
                    "nombre": "Tienda Principal",
                    "codigo_establecimiento": "001",
                    "direccion": "",
                    "telefono": "",
                    "organizacion_id": org_id,
                    "activo": True,
                    "fecha_creacion": datetime.now(timezone.utc).isoformat()
                }
                await db.tiendas.insert_one(tienda)
            
            # Contar TPVs existentes para determinar el siguiente número
            tpvs_count = await db.tpv.count_documents({
                "organizacion_id": org_id,
                "tienda_id": tienda["id"]
            })
            siguiente_numero = tpvs_count + 1
            
            # Crear TPV con el siguiente número en la secuencia
            nuevo_tpv_id = str(uuid.uuid4())
            tpv_disponible = {
                "id": nuevo_tpv_id,
                "nombre": f"Caja {siguiente_numero}",
                "punto_emision": f"{siguiente_numero:03d}",
                "tienda_id": tienda["id"],
                "activo": True,
                "ocupado": False,
                "ocupado_por": None,
                "ocupado_por_nombre": None,
                "organizacion_id": org_id,
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            }
            await db.tpv.insert_one(tpv_disponible)
        
        # Ahora tenemos un TPV disponible, usarlo
        tpv_id = tpv_disponible["id"]
        tpv_nombre = tpv_disponible["nombre"]
        
        # Obtener datos de la tienda
        tienda = await db.tiendas.find_one({"id": tpv_disponible["tienda_id"]}, {"_id": 0})
        tienda_id = tienda["id"] if tienda else None
        tienda_nombre = tienda["nombre"] if tienda else "Sin tienda"
        codigo_establecimiento = tienda.get("codigo_establecimiento", "001") if tienda else "001"
        punto_emision = tpv_disponible["punto_emision"]
        
        # Marcar el TPV como ocupado
        await db.tpv.update_one(
            {"id": tpv_id},
            {
                "$set": {
                    "ocupado": True,
                    "ocupado_por": current_user["_id"],
                    "ocupado_por_nombre": current_user["nombre"]
                }
            }
        )
        
        numero_caja = tpv_nombre
    
    caja_id = str(uuid.uuid4())
    
    nueva_caja = {
        "_id": caja_id,
        "numero": numero_caja,
        "usuario_id": current_user["_id"],
        "usuario_nombre": current_user["nombre"],
        "organizacion_id": current_user["organizacion_id"],
        "rol_usuario": current_user.get("rol", "cajero"),
        "monto_inicial": monto_inicial,
        "monto_ventas": 0.0,
        "total_ventas": 0,
        "fecha_apertura": datetime.now(timezone.utc).isoformat(),
        "fecha_cierre": None,
        "estado": "abierta",
        "requiere_cierre": requiere_cierre,
        "tpv_id": tpv_id,
        "tpv_nombre": tpv_nombre,
        "tienda_id": tienda_id,
        "tienda_nombre": tienda_nombre,
        "codigo_establecimiento": codigo_establecimiento,
        "punto_emision": punto_emision
    }
    
    await db.cajas.insert_one(nueva_caja)
    
    return CajaResponse(
        id=caja_id,
        numero=numero_caja,
        usuario_id=current_user["_id"],
        usuario_nombre=current_user["nombre"],
        monto_inicial=monto_inicial,
        monto_ventas=0.0,
        monto_final=monto_inicial,
        total_ventas=0,
        fecha_apertura=nueva_caja["fecha_apertura"],
        fecha_cierre=None,
        estado="abierta",
        tpv_id=tpv_id,
        tpv_nombre=tpv_nombre,
        tienda_id=tienda_id,
        tienda_nombre=tienda_nombre,
        codigo_establecimiento=codigo_establecimiento,
        punto_emision=punto_emision
    )

async def calcular_ventas_por_metodo(caja_id: str, organizacion_id: str):
    """Calcula el resumen de ventas por método de pago para una caja"""
    # Obtener todas las facturas de esta caja
    facturas = await db.facturas.find({
        "caja_id": caja_id,
        "organizacion_id": organizacion_id
    }).to_list(1000)
    
    # Agrupar por método de pago
    ventas_por_metodo = {}
    for f in facturas:
        metodo_id = f.get("metodo_pago_id") or "efectivo"
        metodo_nombre = f.get("metodo_pago_nombre") or "Efectivo"
        
        if metodo_id not in ventas_por_metodo:
            ventas_por_metodo[metodo_id] = {
                "metodo_id": metodo_id if metodo_id != "efectivo" else None,
                "metodo_nombre": metodo_nombre,
                "total": 0.0,
                "cantidad": 0
            }
        
        ventas_por_metodo[metodo_id]["total"] += f.get("total", 0)
        ventas_por_metodo[metodo_id]["cantidad"] += 1
    
    return [VentasPorMetodo(**v) for v in ventas_por_metodo.values()]

@app.post("/api/caja/cerrar")
async def cerrar_caja(cierre: CajaCierre, current_user: dict = Depends(get_current_user)):
    caja = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja:
        raise HTTPException(status_code=404, detail="No tienes una caja abierta")
    
    # Calcular ventas por método de pago
    ventas_por_metodo = await calcular_ventas_por_metodo(caja["_id"], current_user["organizacion_id"])
    
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
    
    # Liberar el TPV si estaba asignado
    if caja.get("tpv_id"):
        await db.tpv.update_one(
            {"id": caja["tpv_id"]},
            {
                "$set": {
                    "ocupado": False,
                    "ocupado_por": None,
                    "ocupado_por_nombre": None
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
        estado="cerrada",
        tpv_id=caja.get("tpv_id"),
        tpv_nombre=caja.get("tpv_nombre"),
        tienda_id=caja.get("tienda_id"),
        tienda_nombre=caja.get("tienda_nombre"),
        codigo_establecimiento=caja.get("codigo_establecimiento"),
        punto_emision=caja.get("punto_emision"),
        ventas_por_metodo=ventas_por_metodo
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

@app.get("/api/caja/abiertas", response_model=List[CajaResponse])
async def get_cajas_abiertas(current_user: dict = Depends(get_current_user)):
    """Obtiene todas las cajas abiertas de la organización (solo para propietarios/administradores)"""
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver todas las cajas")
    
    cajas = await db.cajas.find({
        "organizacion_id": current_user["organizacion_id"],
        "estado": "abierta"
    }).to_list(100)
    
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
            estado=c["estado"],
            tpv_id=c.get("tpv_id"),
            tpv_nombre=c.get("tpv_nombre"),
            tienda_id=c.get("tienda_id"),
            tienda_nombre=c.get("tienda_nombre")
        )
        for c in cajas
    ]

@app.post("/api/caja/cerrar-admin/{caja_id}")
async def cerrar_caja_admin(caja_id: str, cierre: CajaCierre, current_user: dict = Depends(get_current_user)):
    """Permite a propietarios/administradores cerrar cualquier caja de su organización"""
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para cerrar cajas de otros usuarios")
    
    caja = await db.cajas.find_one({
        "_id": caja_id,
        "organizacion_id": current_user["organizacion_id"],
        "estado": "abierta"
    })
    
    if not caja:
        raise HTTPException(status_code=404, detail="Caja no encontrada o ya cerrada")
    
    monto_final = caja["monto_inicial"] + caja["monto_ventas"]
    diferencia = cierre.efectivo_contado - monto_final
    fecha_cierre = datetime.now(timezone.utc).isoformat()
    
    # Liberar el TPV si estaba asociado
    if caja.get("tpv_id"):
        await db.tpv.update_one(
            {"id": caja["tpv_id"]},
            {"$set": {"ocupado": False, "ocupado_por": None, "ocupado_por_nombre": None}}
        )
    
    await db.cajas.update_one(
        {"_id": caja_id},
        {
            "$set": {
                "estado": "cerrada",
                "efectivo_contado": cierre.efectivo_contado,
                "diferencia": diferencia,
                "fecha_cierre": fecha_cierre,
                "cerrada_por": current_user["_id"],
                "cerrada_por_nombre": current_user["nombre"]
            }
        }
    )
    
    return {
        "message": "Caja cerrada correctamente",
        "diferencia": diferencia,
        "cerrada_por": current_user["nombre"]
    }

@app.post("/api/facturas", response_model=InvoiceResponse)
async def create_factura(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    caja_activa = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja_activa:
        raise HTTPException(status_code=400, detail="Debes abrir una caja antes de realizar ventas")
    
    invoice_id = str(uuid.uuid4())
    
    # Determinar el formato de numeración de factura
    codigo_establecimiento = caja_activa.get("codigo_establecimiento")
    punto_emision = caja_activa.get("punto_emision")
    
    if codigo_establecimiento and punto_emision:
        # Nueva numeración SRI: XXX-YYY-ZZZZZZZZZ
        # Contador por punto de emisión específico
        contador_id = f"factura_{current_user['organizacion_id']}_{codigo_establecimiento}_{punto_emision}"
        counter = await db.contadores.find_one({"_id": contador_id})
        if not counter:
            numero = 1
            await db.contadores.insert_one({"_id": contador_id, "seq": 1})
        else:
            numero = counter["seq"] + 1
            await db.contadores.update_one(
                {"_id": contador_id},
                {"$set": {"seq": numero}}
            )
        
        numero_factura = f"{codigo_establecimiento}-{punto_emision}-{numero:09d}"
    else:
        # Numeración antigua para compatibilidad
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
    
    # Obtener nombre del método de pago
    metodo_pago_nombre = None
    if invoice.metodo_pago_id:
        metodo = await db.metodos_pago.find_one({"id": invoice.metodo_pago_id}, {"_id": 0})
        if metodo:
            metodo_pago_nombre = metodo["nombre"]
    
    # Obtener nombre del tipo de pedido
    tipo_pedido_nombre = None
    if invoice.tipo_pedido_id:
        tipo = await db.tipos_pedido.find_one({"id": invoice.tipo_pedido_id}, {"_id": 0})
        if tipo:
            tipo_pedido_nombre = tipo["nombre"]
    
    # Calcular subtotal de items (sin impuestos)
    subtotal = sum(item.subtotal for item in invoice.items)
    
    # Obtener impuestos activos de la organización
    impuestos_activos = await db.impuestos.find({
        "organizacion_id": current_user["organizacion_id"],
        "activo": True
    }, {"_id": 0}).to_list(100)
    
    # Calcular impuestos
    desglose_impuestos = []
    total_impuestos = 0
    
    for impuesto in impuestos_activos:
        if impuesto["tipo"] == "agregado" or impuesto["tipo"] == "no_incluido":
            # Impuesto se agrega al subtotal
            monto_impuesto = subtotal * (impuesto["tasa"] / 100)
        else:  # tipo == "incluido"
            # Impuesto ya está incluido en el precio
            # Calculamos cuánto del subtotal corresponde al impuesto
            monto_impuesto = subtotal - (subtotal / (1 + impuesto["tasa"] / 100))
        
        desglose_impuestos.append({
            "nombre": impuesto["nombre"],
            "tasa": impuesto["tasa"],
            "tipo": impuesto["tipo"],
            "monto": round(monto_impuesto, 2)
        })
        total_impuestos += monto_impuesto
    
    # Calcular total final
    if impuestos_activos:
        # Si hay impuestos del tipo "agregado" o "no_incluido", se suman al subtotal
        total_agregado = sum(imp["monto"] for imp in desglose_impuestos if imp["tipo"] in ["agregado", "no_incluido"])
        total_final = subtotal + total_agregado
    else:
        total_final = subtotal
    
    total_impuestos = round(total_impuestos, 2)
    total_final = round(total_final, 2)
    
    new_invoice = {
        "_id": invoice_id,
        "id": invoice_id,
        "numero": numero_factura,
        "items": [item.model_dump() for item in invoice.items],
        "subtotal": subtotal,
        "total_impuestos": total_impuestos,
        "desglose_impuestos": desglose_impuestos,
        "total": total_final,
        "vendedor": current_user["_id"],
        "vendedor_nombre": current_user["nombre"],
        "organizacion_id": current_user["organizacion_id"],
        "caja_id": caja_activa["_id"],
        "cliente_id": invoice.cliente_id,
        "cliente_nombre": cliente_nombre,
        "comentarios": invoice.comentarios,
        "metodo_pago_id": invoice.metodo_pago_id,
        "metodo_pago_nombre": metodo_pago_nombre,
        "tipo_pedido_id": invoice.tipo_pedido_id,
        "tipo_pedido_nombre": tipo_pedido_nombre,
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    await db.facturas.insert_one(new_invoice)
    
    await db.cajas.update_one(
        {"_id": caja_activa["_id"]},
        {
            "$inc": {
                "monto_ventas": total_final,
                "total_ventas": 1
            }
        }
    )
    
    return InvoiceResponse(
        id=invoice_id,
        numero=numero_factura,
        items=invoice.items,
        subtotal=subtotal,
        total_impuestos=total_impuestos,
        desglose_impuestos=[ImpuestoDesglose(**imp) for imp in desglose_impuestos],
        total=total_final,
        vendedor=current_user["_id"],
        vendedor_nombre=current_user["nombre"],
        organizacion_id=current_user["organizacion_id"],
        caja_id=caja_activa["_id"],
        cliente_id=invoice.cliente_id,
        cliente_nombre=cliente_nombre,
        comentarios=invoice.comentarios,
        metodo_pago_id=invoice.metodo_pago_id,
        metodo_pago_nombre=metodo_pago_nombre,
        tipo_pedido_id=invoice.tipo_pedido_id,
        tipo_pedido_nombre=tipo_pedido_nombre,
        fecha=new_invoice["fecha"]
    )

@app.get("/api/facturas", response_model=List[InvoiceResponse])
async def get_facturas(
    current_user: dict = Depends(get_current_user),
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    cajero_id: Optional[str] = None,
    tienda_id: Optional[str] = None,
    tpv_id: Optional[str] = None,
    metodo_pago_id: Optional[str] = None
):
    query = {"organizacion_id": current_user["organizacion_id"]}
    
    # Filtro por rol (cajeros solo ven sus propias facturas)
    if current_user["rol"] == "cajero":
        query["vendedor"] = current_user["_id"]
    elif cajero_id:
        query["vendedor"] = cajero_id
    
    # Filtro por fechas
    if fecha_desde or fecha_hasta:
        query["fecha"] = {}
        if fecha_desde:
            query["fecha"]["$gte"] = fecha_desde
        if fecha_hasta:
            # Agregar un día para incluir todo el día hasta
            query["fecha"]["$lte"] = fecha_hasta + "T23:59:59"
    
    # Filtro por tienda (a través de la caja)
    if tienda_id:
        # Obtener las cajas de esa tienda
        cajas_tienda = await db.cajas.find({"tienda_id": tienda_id}, {"_id": 1}).to_list(1000)
        caja_ids = [c["_id"] for c in cajas_tienda]
        if caja_ids:
            query["caja_id"] = {"$in": caja_ids}
    
    # Filtro por TPV (a través de la caja)
    if tpv_id:
        cajas_tpv = await db.cajas.find({"tpv_id": tpv_id}, {"_id": 1}).to_list(1000)
        caja_ids = [c["_id"] for c in cajas_tpv]
        if caja_ids:
            query["caja_id"] = {"$in": caja_ids}
    
    # Filtro por método de pago
    if metodo_pago_id:
        query["metodo_pago_id"] = metodo_pago_id
    
    facturas = await db.facturas.find(query).sort("fecha", -1).to_list(1000)
    return [
        InvoiceResponse(
            id=f.get("id", f.get("_id", "")),
            numero=f["numero"],
            items=[InvoiceItem(**item) for item in f["items"]],
            subtotal=f.get("subtotal", f["total"]),
            total_impuestos=f.get("total_impuestos", 0),
            desglose_impuestos=[ImpuestoDesglose(**imp) for imp in f.get("desglose_impuestos", [])],
            total=f["total"],
            vendedor=f["vendedor"],
            vendedor_nombre=f["vendedor_nombre"],
            organizacion_id=f["organizacion_id"],
            caja_id=f.get("caja_id"),
            cliente_id=f.get("cliente_id"),
            cliente_nombre=f.get("cliente_nombre"),
            comentarios=f.get("comentarios"),
            metodo_pago_id=f.get("metodo_pago_id"),
            metodo_pago_nombre=f.get("metodo_pago_nombre"),
            tipo_pedido_id=f.get("tipo_pedido_id"),
            tipo_pedido_nombre=f.get("tipo_pedido_nombre"),
            estado=f.get("estado", "completado"),
            fecha=f["fecha"]
        )
        for f in facturas
    ]

class ReembolsoRequest(BaseModel):
    motivo: Optional[str] = None

@app.post("/api/facturas/{factura_id}/reembolso")
async def reembolsar_factura(factura_id: str, request: ReembolsoRequest, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para realizar reembolsos")
    
    factura = await db.facturas.find_one({
        "id": factura_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    if factura.get("estado") == "reembolsado":
        raise HTTPException(status_code=400, detail="Esta factura ya fue reembolsada")
    
    # Actualizar estado de la factura
    await db.facturas.update_one(
        {"id": factura_id},
        {
            "$set": {
                "estado": "reembolsado",
                "reembolso_fecha": datetime.now(timezone.utc).isoformat(),
                "reembolso_motivo": request.motivo,
                "reembolso_por": current_user["_id"]
            }
        }
    )
    
    # Devolver stock de productos
    for item in factura.get("items", []):
        await db.productos.update_one(
            {"id": item.get("producto_id")},
            {"$inc": {"stock": item.get("cantidad", 0)}}
        )
    
    return {"message": "Reembolso procesado correctamente"}

@app.get("/api/dashboard")
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    cajero_id: Optional[str] = None,
    tienda_id: Optional[str] = None,
    tpv_id: Optional[str] = None
):
    total_productos = await db.productos.count_documents({"organizacion_id": current_user["organizacion_id"]})
    
    facturas_query = {"organizacion_id": current_user["organizacion_id"]}
    
    # Filtro por rol
    if current_user["rol"] == "cajero":
        facturas_query["vendedor"] = current_user["_id"]
    elif cajero_id:
        facturas_query["vendedor"] = cajero_id
    
    # Filtro por fechas
    if fecha_desde or fecha_hasta:
        facturas_query["fecha"] = {}
        if fecha_desde:
            facturas_query["fecha"]["$gte"] = fecha_desde
        if fecha_hasta:
            facturas_query["fecha"]["$lte"] = fecha_hasta + "T23:59:59"
    
    # Filtro por tienda
    if tienda_id:
        cajas_tienda = await db.cajas.find({"tienda_id": tienda_id}, {"_id": 1}).to_list(1000)
        caja_ids = [c["_id"] for c in cajas_tienda]
        if caja_ids:
            facturas_query["caja_id"] = {"$in": caja_ids}
    
    # Filtro por TPV
    if tpv_id:
        cajas_tpv = await db.cajas.find({"tpv_id": tpv_id}, {"_id": 1}).to_list(1000)
        caja_ids = [c["_id"] for c in cajas_tpv]
        if caja_ids:
            facturas_query["caja_id"] = {"$in": caja_ids}
    
    facturas = await db.facturas.find(facturas_query).sort("fecha", -1).to_list(1000)
    
    # Separar facturas completadas y reembolsadas
    facturas_completadas = [f for f in facturas if f.get("estado", "completado") == "completado"]
    facturas_reembolsadas = [f for f in facturas if f.get("estado") == "reembolsado"]
    
    # Calcular totales
    total_ventas = len(facturas_completadas)
    total_ingresos = sum(f["total"] for f in facturas_completadas)  # Ventas netas (solo completadas)
    total_reembolsos = sum(f["total"] for f in facturas_reembolsadas)
    total_ventas_brutas = total_ingresos + total_reembolsos
    num_reembolsos = len(facturas_reembolsadas)
    
    total_empleados = 0
    if current_user["rol"] == "propietario":
        total_empleados = await db.usuarios.count_documents({"organizacion_id": current_user["organizacion_id"]}) - 1
    
    caja_activa = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    # Ventas por método de pago (solo facturas completadas)
    ventas_por_metodo = {}
    for f in facturas_completadas:
        metodo = f.get("metodo_pago_nombre", "Sin especificar")
        if metodo not in ventas_por_metodo:
            ventas_por_metodo[metodo] = {"cantidad": 0, "total": 0}
        ventas_por_metodo[metodo]["cantidad"] += 1
        ventas_por_metodo[metodo]["total"] += f["total"]
    
    # Ventas por día (solo facturas completadas)
    ventas_por_dia = {}
    for f in facturas_completadas:
        fecha = f["fecha"][:10] if f.get("fecha") else "Sin fecha"
        if fecha not in ventas_por_dia:
            ventas_por_dia[fecha] = {"cantidad": 0, "total": 0}
        ventas_por_dia[fecha]["cantidad"] += 1
        ventas_por_dia[fecha]["total"] += f["total"]
    
    return {
        "total_productos": total_productos,
        "total_ventas": total_ventas,
        "total_ingresos": total_ingresos,  # Ventas netas
        "total_ventas_brutas": total_ventas_brutas,
        "total_reembolsos": total_reembolsos,
        "num_reembolsos": num_reembolsos,
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
        ],
        "ventas_por_metodo": ventas_por_metodo,
        "ventas_por_dia": ventas_por_dia
    }

@app.get("/api/empleados-filtro")
async def get_empleados_filtro(current_user: dict = Depends(get_current_user)):
    """Obtiene la lista de empleados para filtros en reportes"""
    if current_user["rol"] not in ["propietario", "administrador"]:
        return []
    
    empleados = await db.usuarios.find(
        {"organizacion_id": current_user["organizacion_id"]},
        {"_id": 1, "nombre": 1, "rol": 1}
    ).to_list(1000)
    
    return [
        {"id": e["_id"], "nombre": e["nombre"], "rol": e["rol"]}
        for e in empleados
    ]

@app.get("/api/")
async def root():
    return {"message": "Sistema de Facturación API"}
