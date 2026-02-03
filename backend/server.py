from fastapi import FastAPI, HTTPException, Depends, status, Request, Response, File, UploadFile, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import httpx
import shutil
import random
import base64
import io
import asyncio
from PIL import Image
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

# Función para generar PIN único de 4 dígitos
async def generar_pin_unico(organizacion_id: str) -> str:
    """Genera un PIN único de 4 dígitos para la organización"""
    max_intentos = 100
    for _ in range(max_intentos):
        pin = str(random.randint(1000, 9999))
        # Verificar que no exista en la organización
        existe = await db.usuarios.find_one({
            "organizacion_id": organizacion_id,
            "pin": pin
        })
        if not existe:
            return pin
    raise HTTPException(status_code=500, detail="No se pudo generar un PIN único")
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
    ancho_ticket: Optional[int] = 80  # Ancho en mm: 58 o 80

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
    password: Optional[str] = None  # Opcional para cajeros/meseros que usan PIN
    rol: str
    perfil_id: Optional[str] = None  # ID del perfil de permisos
    pin: Optional[str] = None  # PIN de 4 dígitos
    pin_activo: Optional[bool] = False

class UserLogin(BaseModel):
    username: str
    password: str

class PINLogin(BaseModel):
    pin: str
    codigo_tienda: str  # Código de tienda obligatorio para mayor seguridad
    tpv_id: Optional[str] = None  # TPV seleccionado en el login
    forzar_cierre: Optional[bool] = False  # Si es True, cierra la sesión anterior
    dispositivo: Optional[str] = "Navegador Web"  # Identificador del dispositivo

class POSLogin(BaseModel):
    codigo_tienda: str
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    nombre: str
    username: str
    rol: str
    perfil_id: Optional[str] = None
    perfil_nombre: Optional[str] = None
    organizacion_id: str
    creado_por: Optional[str] = None
    creado: str
    pin: Optional[str] = None
    pin_activo: Optional[bool] = False

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    perfil_id: Optional[str] = None
    pin: Optional[str] = None
    pin_activo: Optional[bool] = None

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

# ============ MODELOS DE PERMISOS Y PERFILES ============

class PermisosPOS(BaseModel):
    """Permisos para el Punto de Venta"""
    ver_productos: bool = True
    agregar_ticket: bool = True
    guardar_ticket: bool = True
    recuperar_tickets_propios: bool = True
    recuperar_tickets_otros: bool = False
    cobrar: bool = False
    facturar_electronico: bool = False
    aplicar_descuentos: bool = False
    eliminar_items: bool = True
    anular_ventas: bool = False
    abrir_caja: bool = False
    cerrar_caja_propia: bool = False
    cerrar_caja_otros: bool = False
    dividir_ticket: bool = False
    cambiar_precio: bool = False

class PermisosBackoffice(BaseModel):
    """Permisos para Administración/Backoffice"""
    ver_reportes: bool = False
    ver_reportes_propios: bool = False
    ver_dashboard: bool = False
    ver_productos: bool = True
    gestionar_productos: bool = False
    gestionar_categorias: bool = False
    ver_clientes: bool = False
    gestionar_clientes: bool = False
    gestionar_empleados: bool = False
    ver_configuracion: bool = False
    gestionar_configuracion: bool = False
    gestionar_tpv: bool = False
    gestionar_tiendas: bool = False
    gestionar_metodos_pago: bool = False
    gestionar_impuestos: bool = False
    ver_facturacion_electronica: bool = False
    gestionar_facturacion_electronica: bool = False
    gestionar_perfiles: bool = False

class PerfilCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    permisos_pos: PermisosPOS = PermisosPOS()
    permisos_backoffice: PermisosBackoffice = PermisosBackoffice()
    es_predeterminado: bool = False

class PerfilUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    permisos_pos: Optional[PermisosPOS] = None
    permisos_backoffice: Optional[PermisosBackoffice] = None

class PerfilResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = None
    permisos_pos: dict
    permisos_backoffice: dict
    es_predeterminado: bool
    es_sistema: bool = False
    organizacion_id: str
    created_at: Optional[str] = None

class FuncionesConfig(BaseModel):
    cierres_caja: bool = True
    tickets_abiertos: bool = False
    tipo_pedido: bool = False
    venta_con_stock: bool = True
    funcion_reloj: bool = False
    impresoras_cocina: bool = False
    pantalla_clientes: bool = False
    # Control de mesas por mesero: Si está activo, cada mesero solo puede editar sus propias mesas
    # Los cajeros siempre pueden recuperar cualquier mesa para cobrar
    mesas_por_mesero: bool = False
    # Facturación electrónica SRI Ecuador
    facturacion_electronica: bool = False

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

# Modelo para forzar cierre de sesión
class ForzarCierreSesion(BaseModel):
    forzar: bool = True

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
    # Campos para tracking de mesero
    mesero_id: Optional[str] = None
    mesero_nombre: Optional[str] = None

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
    descuento: Optional[float] = 0
    descuentos_detalle: Optional[List[dict]] = []
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
    # Campos para tracking de mesero
    mesero_id: Optional[str] = None
    mesero_nombre: Optional[str] = None
    # Campos para tracking de quien cobró
    cobrado_por_id: Optional[str] = None
    cobrado_por_nombre: Optional[str] = None

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
    caja_id: Optional[str] = None
    cliente_id: Optional[str] = None
    cliente_nombre: Optional[str] = None
    comentarios: Optional[str] = None
    fecha_creacion: str
    # Campos para tracking de quién trabaja en el ticket
    ultimo_vendedor_id: Optional[str] = None
    ultimo_vendedor_nombre: Optional[str] = None
    ultima_modificacion: Optional[str] = None
    # Campo para indicar si el usuario actual puede editar este ticket
    puede_editar: Optional[bool] = True
    es_propio: Optional[bool] = True
    # Campos para tracking de mesero
    mesero_id: Optional[str] = None
    mesero_nombre: Optional[str] = None

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

# ============ GOOGLE OAUTH PROPIO ============
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "https://www.posahora.com/auth/google/callback")

class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None  # URI que usó el frontend
    nombre_tienda: Optional[str] = None
    password: Optional[str] = None

@app.post("/api/auth/google")
async def google_auth(body: GoogleAuthRequest, response: Response):
    """
    Intercambia el código de autorización de Google por tokens y autentica al usuario.
    Si el usuario es nuevo, requiere nombre_tienda y password para crear la cuenta.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth no configurado en el servidor")
    
    # Usar el redirect_uri que envió el frontend, o el por defecto
    redirect_uri = body.redirect_uri or GOOGLE_REDIRECT_URI
    
    # Intercambiar código por tokens con Google
    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": body.code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                },
                timeout=10.0
            )
            
            if token_response.status_code != 200:
                error_detail = token_response.json().get("error_description", "Error al obtener token")
                raise HTTPException(status_code=400, detail=f"Error de Google: {error_detail}")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            if not access_token:
                raise HTTPException(status_code=400, detail="No se recibió token de acceso")
            
            # Obtener información del usuario de Google
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            if user_info_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Error al obtener información del usuario")
            
            google_user = user_info_response.json()
            
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Error de conexión con Google: {str(e)}")
    
    email = google_user.get("email")
    nombre = google_user.get("name", email.split("@")[0])
    picture = google_user.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="No se pudo obtener el email de Google")
    
    # Buscar si el usuario ya existe
    user = await db.usuarios.find_one({"email": email}, {"_id": 0})
    
    if user:
        # Usuario existente - iniciar sesión
        user_id = user.get("_id") or user.get("user_id")
        
        # Obtener código de tienda
        org = await db.organizaciones.find_one({"_id": user["organizacion_id"]}, {"_id": 0})
        codigo_tienda = org.get("codigo_tienda") if org else None
        
        # Crear token JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": user_id, "rol": user["rol"], "organizacion_id": user["organizacion_id"]},
            expires_delta=access_token_expires
        )
        
        response.set_cookie(
            key="access_token",
            value=jwt_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "is_new_user": False,
            "user": {
                "id": user_id,
                "nombre": user["nombre"],
                "email": user["email"],
                "username": user.get("username"),
                "rol": user["rol"],
                "organizacion_id": user["organizacion_id"],
                "codigo_tienda": codigo_tienda
            }
        }
    else:
        # Usuario nuevo - devolver datos para que complete el registro
        return {
            "is_new_user": True,
            "needs_registration": True,
            "email": email,
            "nombre": nombre,
            "picture": picture,
            "message": "Usuario nuevo. Se requiere nombre de tienda y contraseña."
        }

class GoogleRegisterRequest(BaseModel):
    email: str
    nombre: str
    nombre_tienda: str
    password: str
    picture: Optional[str] = None

@app.post("/api/auth/google/register")
async def google_register(body: GoogleRegisterRequest, response: Response):
    """
    Completa el registro de un usuario nuevo que se autenticó con Google.
    """
    # Verificar que el email no exista ya
    existing_user = await db.usuarios.find_one({"email": body.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Este email ya está registrado")
    
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Crear nuevo usuario y organización
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    org_id = str(uuid.uuid4())
    
    new_user = {
        "_id": user_id,
        "user_id": user_id,
        "nombre": body.nombre,
        "email": body.email,
        "username": body.email,
        "password": get_password_hash(body.password),
        "picture": body.picture,
        "rol": "propietario",
        "organizacion_id": org_id,
        "google_auth": True,
        "creado_por": None,
        "creado": datetime.now(timezone.utc).isoformat()
    }
    await db.usuarios.insert_one(new_user)
    
    nueva_org = {
        "_id": org_id,
        "nombre": body.nombre_tienda,
        "codigo_tienda": generar_codigo_tienda(body.nombre_tienda),
        "propietario_id": user_id,
        "fecha_creacion": datetime.now(timezone.utc).isoformat(),
        "ultima_actividad": datetime.now(timezone.utc).isoformat()
    }
    await db.organizaciones.insert_one(nueva_org)
    
    # Crear tienda por defecto
    tienda_id = str(uuid.uuid4())
    nueva_tienda = {
        "_id": tienda_id,
        "id": tienda_id,
        "nombre": "Tienda Principal",
        "codigo": "001",
        "codigo_establecimiento": "001",
        "codigo_tienda": nueva_org["codigo_tienda"],
        "direccion": "",
        "telefono": "",
        "organizacion_id": org_id,
        "activo": True,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.tiendas.insert_one(nueva_tienda)
    
    # Crear TPV por defecto
    tpv_default = {
        "id": str(uuid.uuid4()),
        "nombre": "Caja Principal",
        "punto_emision": "001",
        "tienda_id": tienda_id,
        "activo": True,
        "ocupado": False,
        "estado_sesion": "disponible",
        "organizacion_id": org_id,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.tpv.insert_one(tpv_default)
    
    # Crear funciones por defecto
    await db.funciones.insert_one({
        "_id": str(uuid.uuid4()),
        "organizacion_id": org_id,
        "cierres_caja": True,
        "tickets_abiertos": True,
        "mesas_por_mesero": False,
        "tipo_pedido": False,
        "venta_con_stock": False,
        "reloj_checador": False,
        "impresoras_cocina": False,
        "pantalla_cliente": False
    })
    
    # Crear configuración de ticket
    await db.ticket_config.insert_one({
        "_id": str(uuid.uuid4()),
        "organizacion_id": org_id,
        "nombre_negocio": body.nombre_tienda,
        "direccion": "",
        "telefono": "",
        "mensaje_pie": "¡Gracias por su compra!",
        "imprimir_ticket": False,
        "mostrar_info_cliente": False,
        "mostrar_comentarios": False
    })
    
    # Crear método de pago por defecto
    await db.metodos_pago.insert_one({
        "_id": str(uuid.uuid4()),
        "id": str(uuid.uuid4()),
        "nombre": "Efectivo",
        "organizacion_id": org_id,
        "activo": True
    })
    
    # Crear impuesto por defecto
    await db.impuestos.insert_one({
        "_id": str(uuid.uuid4()),
        "id": str(uuid.uuid4()),
        "nombre": "IVA",
        "porcentaje": 12,
        "tipo": "agregado",
        "organizacion_id": org_id,
        "activo": True
    })
    
    # Crear token JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = create_access_token(
        data={"sub": user_id, "rol": "propietario", "organizacion_id": org_id},
        expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "is_new_user": True,
        "user": {
            "id": user_id,
            "nombre": body.nombre,
            "email": body.email,
            "username": body.email,
            "rol": "propietario",
            "organizacion_id": org_id,
            "codigo_tienda": nueva_org["codigo_tienda"]
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
        "codigo_tienda": nueva_org["codigo_tienda"],  # Usar el mismo código de la organización
        "direccion": None,
        "telefono": None,
        "email": user_data.email,
        "activa": True,
        "organizacion_id": org_id,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.tiendas.insert_one(tienda_default)
    
    # Crear TPV por defecto
    tpv_default = {
        "id": str(uuid.uuid4()),
        "nombre": "Caja Principal",
        "punto_emision": "001",
        "tienda_id": tienda_default["id"],
        "activo": True,
        "ocupado": False,
        "estado_sesion": "disponible",
        "organizacion_id": org_id,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.tpv.insert_one(tpv_default)
    
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
        },
        "organizacion": {
            "id": org_id,
            "nombre": nueva_org["nombre"],
            "codigo_tienda": nueva_org["codigo_tienda"]
        },
        "tienda": {
            "id": tienda_default["id"],
            "nombre": tienda_default["nombre"],
            "codigo_tienda": tienda_default["codigo_tienda"]
        }
    }

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"message": "Sesión cerrada correctamente"}

@app.post("/api/auth/logout-pos")
async def logout_pos(request: Request, current_user: dict = Depends(get_current_user)):
    """Cierra la sesión POS del usuario actual"""
    user_id = str(current_user.get("_id") or current_user.get("user_id"))
    organizacion_id = str(current_user.get("organizacion_id"))
    
    # Verificar si el usuario tiene caja abierta
    caja_abierta = await db.cajas.find_one({
        "usuario_id": user_id,
        "organizacion_id": organizacion_id,
        "estado": "abierta"
    })
    
    if caja_abierta:
        # Tiene caja abierta - PAUSAR la sesión en lugar de cerrarla
        tpv_id = caja_abierta.get("tpv_id")
        
        # Marcar sesión como pausada (no cerrada)
        await db.sesiones_pos.update_many(
            {"user_id": user_id, "activa": True},
            {"$set": {
                "estado": "pausada",
                "activa": False,
                "tpv_id": tpv_id,
                "caja_abierta_id": str(caja_abierta["_id"]),
                "fecha_pausa": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Marcar el TPV como pausado/reservado
        if tpv_id:
            await db.tpv.update_one(
                {"id": tpv_id},
                {"$set": {
                    "estado_sesion": "pausado",
                    "usuario_reservado_id": user_id,
                    "usuario_reservado_nombre": current_user.get("nombre", "Usuario"),
                    "caja_abierta_id": str(caja_abierta["_id"])
                }}
            )
        
        return {
            "message": "Sesión pausada - Tienes caja abierta",
            "estado": "pausada",
            "tpv_reservado": tpv_id,
            "debe_cerrar_caja": True,
            "monto_caja": caja_abierta.get("monto_actual", 0)
        }
    else:
        # No tiene caja abierta - cerrar sesión completamente
        # Obtener el TPV de la sesión para liberarlo
        sesion = await db.sesiones_pos.find_one({"user_id": user_id, "activa": True})
        tpv_id = sesion.get("tpv_id") if sesion else None
        
        # Cerrar todas las sesiones activas del usuario
        await db.sesiones_pos.update_many(
            {"user_id": user_id, "activa": True},
            {"$set": {
                "activa": False,
                "estado": "cerrada",
                "fecha_cierre": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Liberar el TPV si estaba asignado
        if tpv_id:
            await db.tpv.update_one(
                {"id": tpv_id},
                {"$set": {
                    "estado_sesion": "disponible",
                    "usuario_reservado_id": None,
                    "usuario_reservado_nombre": None,
                    "caja_abierta_id": None
                }}
            )
        
        # También limpiar sesiones pausadas del usuario (si cerró caja desde otro lugar)
        await db.sesiones_pos.update_many(
            {"user_id": user_id, "estado": "pausada"},
            {"$set": {
                "estado": "cerrada",
                "fecha_cierre": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Sesión cerrada correctamente", "estado": "cerrada"}

@app.get("/api/auth/verificar-sesion")
async def verificar_sesion(request: Request, current_user: dict = Depends(get_current_user)):
    """Verifica si la sesión actual del usuario sigue siendo válida"""
    user_id = str(current_user.get("_id") or current_user.get("user_id"))
    
    # Obtener el session_id del token si está disponible
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            session_id = payload.get("session_id")
            
            if session_id:
                # Verificar si esta sesión específica sigue activa
                sesion = await db.sesiones_pos.find_one({
                    "session_id": session_id,
                    "user_id": user_id,
                    "activa": True
                })
                
                if not sesion:
                    return {
                        "valida": False,
                        "razon": "Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo"
                    }
                
                # Actualizar última actividad
                await db.sesiones_pos.update_one(
                    {"session_id": session_id},
                    {"$set": {"ultima_actividad": datetime.now(timezone.utc).isoformat()}}
                )
                
                return {"valida": True, "session_id": session_id}
        except:
            pass
    
    return {"valida": True}

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
            "logo_url": None,
            "ancho_ticket": 80
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
        "logo_url": config.get("logo_url"),
        "ancho_ticket": config.get("ancho_ticket", 80)
    }

@app.put("/api/config")
async def update_config(config: TicketConfig, current_user: dict = Depends(get_propietario_user)):
    await db.configuraciones.update_one(
        {"_id": current_user["organizacion_id"]},
        {"$set": config.model_dump()},
        upsert=True
    )
    return {"message": "Configuración actualizada"}

# ============ PERFILES Y PERMISOS ============

async def crear_perfiles_predeterminados(organizacion_id: str):
    """Crea los perfiles predeterminados para una organización"""
    perfiles_default = [
        {
            "_id": f"{organizacion_id}_propietario",
            "nombre": "Propietario",
            "descripcion": "Acceso total al sistema",
            "permisos_pos": {
                "ver_productos": True, "agregar_ticket": True, "guardar_ticket": True,
                "recuperar_tickets_propios": True, "recuperar_tickets_otros": True,
                "cobrar": True, "facturar_electronico": True, "aplicar_descuentos": True,
                "eliminar_items": True, "anular_ventas": True, "abrir_caja": True,
                "cerrar_caja_propia": True, "cerrar_caja_otros": True,
                "dividir_ticket": True, "cambiar_precio": True
            },
            "permisos_backoffice": {
                "ver_reportes": True, "ver_reportes_propios": True, "ver_dashboard": True,
                "ver_productos": True, "gestionar_productos": True, "gestionar_categorias": True,
                "ver_clientes": True, "gestionar_clientes": True, "gestionar_empleados": True,
                "ver_configuracion": True, "gestionar_configuracion": True,
                "gestionar_tpv": True, "gestionar_tiendas": True,
                "gestionar_metodos_pago": True, "gestionar_impuestos": True,
                "ver_facturacion_electronica": True, "gestionar_facturacion_electronica": True,
                "gestionar_perfiles": True
            },
            "es_predeterminado": True,
            "es_sistema": True,
            "organizacion_id": organizacion_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "_id": f"{organizacion_id}_administrador",
            "nombre": "Administrador",
            "descripcion": "Gestión del negocio sin acceso a empleados",
            "permisos_pos": {
                "ver_productos": True, "agregar_ticket": True, "guardar_ticket": True,
                "recuperar_tickets_propios": True, "recuperar_tickets_otros": True,
                "cobrar": True, "facturar_electronico": True, "aplicar_descuentos": True,
                "eliminar_items": True, "anular_ventas": True, "abrir_caja": True,
                "cerrar_caja_propia": True, "cerrar_caja_otros": True,
                "dividir_ticket": True, "cambiar_precio": True
            },
            "permisos_backoffice": {
                "ver_reportes": True, "ver_reportes_propios": True, "ver_dashboard": True,
                "ver_productos": True, "gestionar_productos": True, "gestionar_categorias": True,
                "ver_clientes": True, "gestionar_clientes": True, "gestionar_empleados": False,
                "ver_configuracion": True, "gestionar_configuracion": False,
                "gestionar_tpv": True, "gestionar_tiendas": True,
                "gestionar_metodos_pago": True, "gestionar_impuestos": True,
                "ver_facturacion_electronica": True, "gestionar_facturacion_electronica": True,
                "gestionar_perfiles": False
            },
            "es_predeterminado": True,
            "es_sistema": True,
            "organizacion_id": organizacion_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "_id": f"{organizacion_id}_cajero",
            "nombre": "Cajero",
            "descripcion": "Puede vender, cobrar y gestionar su caja",
            "permisos_pos": {
                "ver_productos": True, "agregar_ticket": True, "guardar_ticket": True,
                "recuperar_tickets_propios": True, "recuperar_tickets_otros": True,
                "cobrar": True, "facturar_electronico": True, "aplicar_descuentos": True,
                "eliminar_items": True, "anular_ventas": False, "abrir_caja": True,
                "cerrar_caja_propia": True, "cerrar_caja_otros": False,
                "dividir_ticket": True, "cambiar_precio": False
            },
            "permisos_backoffice": {
                "ver_reportes": False, "ver_reportes_propios": True, "ver_dashboard": False,
                "ver_productos": True, "gestionar_productos": False, "gestionar_categorias": False,
                "ver_clientes": True, "gestionar_clientes": True, "gestionar_empleados": False,
                "ver_configuracion": False, "gestionar_configuracion": False,
                "gestionar_tpv": False, "gestionar_tiendas": False,
                "gestionar_metodos_pago": False, "gestionar_impuestos": False,
                "ver_facturacion_electronica": False, "gestionar_facturacion_electronica": False,
                "gestionar_perfiles": False
            },
            "es_predeterminado": True,
            "es_sistema": True,
            "organizacion_id": organizacion_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "_id": f"{organizacion_id}_mesero",
            "nombre": "Mesero",
            "descripcion": "Solo puede tomar pedidos y guardar tickets",
            "permisos_pos": {
                "ver_productos": True, "agregar_ticket": True, "guardar_ticket": True,
                "recuperar_tickets_propios": True, "recuperar_tickets_otros": False,
                "cobrar": False, "facturar_electronico": False, "aplicar_descuentos": False,
                "eliminar_items": True, "anular_ventas": False, "abrir_caja": False,
                "cerrar_caja_propia": False, "cerrar_caja_otros": False,
                "dividir_ticket": False, "cambiar_precio": False
            },
            "permisos_backoffice": {
                "ver_reportes": False, "ver_reportes_propios": False, "ver_dashboard": False,
                "ver_productos": True, "gestionar_productos": False, "gestionar_categorias": False,
                "ver_clientes": False, "gestionar_clientes": False, "gestionar_empleados": False,
                "ver_configuracion": False, "gestionar_configuracion": False,
                "gestionar_tpv": False, "gestionar_tiendas": False,
                "gestionar_metodos_pago": False, "gestionar_impuestos": False,
                "ver_facturacion_electronica": False, "gestionar_facturacion_electronica": False,
                "gestionar_perfiles": False
            },
            "es_predeterminado": True,
            "es_sistema": True,
            "organizacion_id": organizacion_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "_id": f"{organizacion_id}_supervisor",
            "nombre": "Supervisor",
            "descripcion": "Cajero con permisos de anulación y reportes",
            "permisos_pos": {
                "ver_productos": True, "agregar_ticket": True, "guardar_ticket": True,
                "recuperar_tickets_propios": True, "recuperar_tickets_otros": True,
                "cobrar": True, "facturar_electronico": True, "aplicar_descuentos": True,
                "eliminar_items": True, "anular_ventas": True, "abrir_caja": True,
                "cerrar_caja_propia": True, "cerrar_caja_otros": True,
                "dividir_ticket": True, "cambiar_precio": True
            },
            "permisos_backoffice": {
                "ver_reportes": True, "ver_reportes_propios": True, "ver_dashboard": True,
                "ver_productos": True, "gestionar_productos": False, "gestionar_categorias": False,
                "ver_clientes": True, "gestionar_clientes": True, "gestionar_empleados": False,
                "ver_configuracion": False, "gestionar_configuracion": False,
                "gestionar_tpv": False, "gestionar_tiendas": False,
                "gestionar_metodos_pago": False, "gestionar_impuestos": False,
                "ver_facturacion_electronica": True, "gestionar_facturacion_electronica": False,
                "gestionar_perfiles": False
            },
            "es_predeterminado": True,
            "es_sistema": True,
            "organizacion_id": organizacion_id,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "_id": f"{organizacion_id}_cocinero",
            "nombre": "Cocinero",
            "descripcion": "Solo ve pedidos en pantalla de cocina",
            "permisos_pos": {
                "ver_productos": True, "agregar_ticket": False, "guardar_ticket": False,
                "recuperar_tickets_propios": False, "recuperar_tickets_otros": False,
                "cobrar": False, "facturar_electronico": False, "aplicar_descuentos": False,
                "eliminar_items": False, "anular_ventas": False, "abrir_caja": False,
                "cerrar_caja_propia": False, "cerrar_caja_otros": False,
                "dividir_ticket": False, "cambiar_precio": False
            },
            "permisos_backoffice": {
                "ver_reportes": False, "ver_reportes_propios": False, "ver_dashboard": False,
                "ver_productos": True, "gestionar_productos": False, "gestionar_categorias": False,
                "ver_clientes": False, "gestionar_clientes": False, "gestionar_empleados": False,
                "ver_configuracion": False, "gestionar_configuracion": False,
                "gestionar_tpv": False, "gestionar_tiendas": False,
                "gestionar_metodos_pago": False, "gestionar_impuestos": False,
                "ver_facturacion_electronica": False, "gestionar_facturacion_electronica": False,
                "gestionar_perfiles": False
            },
            "es_predeterminado": True,
            "es_sistema": True,
            "organizacion_id": organizacion_id,
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    
    for perfil in perfiles_default:
        await db.perfiles.update_one(
            {"_id": perfil["_id"]},
            {"$setOnInsert": perfil},
            upsert=True
        )

@app.get("/api/perfiles", response_model=List[PerfilResponse])
async def get_perfiles(current_user: dict = Depends(get_current_user)):
    """Obtiene todos los perfiles de la organización"""
    # Asegurar que existan los perfiles predeterminados
    await crear_perfiles_predeterminados(current_user["organizacion_id"])
    
    perfiles = await db.perfiles.find(
        {"organizacion_id": current_user["organizacion_id"]}
    ).to_list(100)
    
    return [
        PerfilResponse(
            id=p["_id"],
            nombre=p["nombre"],
            descripcion=p.get("descripcion"),
            permisos_pos=p.get("permisos_pos", {}),
            permisos_backoffice=p.get("permisos_backoffice", {}),
            es_predeterminado=p.get("es_predeterminado", False),
            es_sistema=p.get("es_sistema", False),
            organizacion_id=p["organizacion_id"],
            created_at=p.get("created_at")
        )
        for p in perfiles
    ]

@app.get("/api/perfiles/{perfil_id}", response_model=PerfilResponse)
async def get_perfil(perfil_id: str, current_user: dict = Depends(get_current_user)):
    """Obtiene un perfil específico"""
    perfil = await db.perfiles.find_one({
        "_id": perfil_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    return PerfilResponse(
        id=perfil["_id"],
        nombre=perfil["nombre"],
        descripcion=perfil.get("descripcion"),
        permisos_pos=perfil.get("permisos_pos", {}),
        permisos_backoffice=perfil.get("permisos_backoffice", {}),
        es_predeterminado=perfil.get("es_predeterminado", False),
        es_sistema=perfil.get("es_sistema", False),
        organizacion_id=perfil["organizacion_id"],
        created_at=perfil.get("created_at")
    )

@app.post("/api/perfiles", response_model=PerfilResponse)
async def create_perfil(perfil: PerfilCreate, current_user: dict = Depends(get_propietario_user)):
    """Crea un nuevo perfil personalizado"""
    perfil_id = str(uuid.uuid4())
    
    nuevo_perfil = {
        "_id": perfil_id,
        "nombre": perfil.nombre,
        "descripcion": perfil.descripcion,
        "permisos_pos": perfil.permisos_pos.dict(),
        "permisos_backoffice": perfil.permisos_backoffice.dict(),
        "es_predeterminado": False,
        "es_sistema": False,
        "organizacion_id": current_user["organizacion_id"],
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.perfiles.insert_one(nuevo_perfil)
    
    return PerfilResponse(
        id=perfil_id,
        nombre=nuevo_perfil["nombre"],
        descripcion=nuevo_perfil.get("descripcion"),
        permisos_pos=nuevo_perfil["permisos_pos"],
        permisos_backoffice=nuevo_perfil["permisos_backoffice"],
        es_predeterminado=False,
        es_sistema=False,
        organizacion_id=current_user["organizacion_id"],
        created_at=nuevo_perfil["created_at"]
    )

@app.put("/api/perfiles/{perfil_id}", response_model=PerfilResponse)
async def update_perfil(perfil_id: str, perfil_update: PerfilUpdate, current_user: dict = Depends(get_propietario_user)):
    """Actualiza un perfil existente"""
    perfil = await db.perfiles.find_one({
        "_id": perfil_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    # Solo el perfil "Propietario" no se puede editar
    if perfil.get("nombre") == "Propietario":
        raise HTTPException(status_code=403, detail="El perfil Propietario no se puede editar")
    
    update_data = {}
    if perfil_update.nombre:
        update_data["nombre"] = perfil_update.nombre
    if perfil_update.descripcion is not None:
        update_data["descripcion"] = perfil_update.descripcion
    if perfil_update.permisos_pos:
        update_data["permisos_pos"] = perfil_update.permisos_pos.dict()
    if perfil_update.permisos_backoffice:
        update_data["permisos_backoffice"] = perfil_update.permisos_backoffice.dict()
    
    if update_data:
        await db.perfiles.update_one(
            {"_id": perfil_id},
            {"$set": update_data}
        )
    
    updated = await db.perfiles.find_one({"_id": perfil_id})
    
    return PerfilResponse(
        id=updated["_id"],
        nombre=updated["nombre"],
        descripcion=updated.get("descripcion"),
        permisos_pos=updated.get("permisos_pos", {}),
        permisos_backoffice=updated.get("permisos_backoffice", {}),
        es_predeterminado=updated.get("es_predeterminado", False),
        es_sistema=updated.get("es_sistema", False),
        organizacion_id=updated["organizacion_id"],
        created_at=updated.get("created_at")
    )

@app.delete("/api/perfiles/{perfil_id}")
async def delete_perfil(perfil_id: str, current_user: dict = Depends(get_propietario_user)):
    """Elimina un perfil personalizado"""
    perfil = await db.perfiles.find_one({
        "_id": perfil_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    # Solo el perfil "Propietario" no se puede eliminar, los demás del sistema sí
    if perfil.get("nombre") == "Propietario":
        raise HTTPException(status_code=403, detail="El perfil Propietario no se puede eliminar")
    
    # Verificar que no haya usuarios con este perfil
    usuarios_con_perfil = await db.usuarios.count_documents({
        "perfil_id": perfil_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if usuarios_con_perfil > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar. Hay {usuarios_con_perfil} empleado(s) con este perfil"
        )
    
    await db.perfiles.delete_one({"_id": perfil_id})
    return {"message": "Perfil eliminado correctamente"}

# ============ USUARIOS/EMPLEADOS ============

@app.get("/api/usuarios", response_model=List[UserResponse])
async def get_usuarios(current_user: dict = Depends(get_propietario_user)):
    usuarios = await db.usuarios.find(
        {"organizacion_id": current_user["organizacion_id"]},
        {"password": 0}
    ).to_list(1000)
    
    # Obtener todos los perfiles para mapear nombres
    perfiles = await db.perfiles.find(
        {"organizacion_id": current_user["organizacion_id"]}
    ).to_list(100)
    perfiles_map = {p["_id"]: p["nombre"] for p in perfiles}
    
    return [
        UserResponse(
            id=u["_id"],
            nombre=u["nombre"],
            username=u["username"],
            rol=u["rol"],
            perfil_id=u.get("perfil_id"),
            perfil_nombre=perfiles_map.get(u.get("perfil_id"), u["rol"].capitalize()),
            organizacion_id=u["organizacion_id"],
            creado_por=u.get("creado_por"),
            creado=u.get("creado", ""),
            pin=u.get("pin"),
            pin_activo=u.get("pin_activo", False)
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
    
    # Para cajeros y meseros, el PIN es obligatorio
    pin = user.pin
    pin_activo = user.pin_activo or False
    
    if user.rol in ["cajero", "mesero"]:
        # Generar PIN automáticamente si no se proporciona
        if not pin:
            pin = await generar_pin_unico(current_user["organizacion_id"])
        pin_activo = True  # Siempre activo para cajeros/meseros
    
    # Validar que el PIN sea único si se proporciona
    if pin:
        pin_existe = await db.usuarios.find_one({
            "organizacion_id": current_user["organizacion_id"],
            "pin": pin
        })
        if pin_existe:
            raise HTTPException(status_code=400, detail="Este PIN ya está en uso. Por favor, elige otro.")
    
    # Determinar perfil_id - si no se proporciona, usar el perfil del sistema según el rol
    perfil_id = user.perfil_id
    if not perfil_id:
        # Asignar perfil del sistema basado en el rol
        perfil_id = f"{current_user['organizacion_id']}_{user.rol}"
    
    # Verificar que el perfil exista
    perfil = await db.perfiles.find_one({"_id": perfil_id})
    perfil_nombre = perfil["nombre"] if perfil else user.rol.capitalize()
    
    new_user = {
        "_id": user_id,
        "nombre": user.nombre,
        "username": user.username,
        "password": get_password_hash(user.password) if user.password else None,
        "rol": user.rol,
        "perfil_id": perfil_id,
        "organizacion_id": current_user["organizacion_id"],
        "creado_por": current_user["_id"],
        "creado": datetime.now(timezone.utc).isoformat(),
        "pin": pin,
        "pin_activo": pin_activo
    }
    await db.usuarios.insert_one(new_user)
    
    return UserResponse(
        id=user_id,
        nombre=user.nombre,
        username=user.username,
        rol=user.rol,
        perfil_id=perfil_id,
        perfil_nombre=perfil_nombre,
        organizacion_id=current_user["organizacion_id"],
        creado_por=current_user["_id"],
        creado=new_user["creado"],
        pin=pin,
        pin_activo=pin_activo
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

@app.put("/api/usuarios/{user_id}", response_model=UserResponse)
async def update_usuario(user_id: str, user_update: UserUpdate, current_user: dict = Depends(get_propietario_user)):
    """Actualizar un usuario existente"""
    user_to_update = await db.usuarios.find_one({"_id": user_id})
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user_to_update["organizacion_id"] != current_user["organizacion_id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este usuario")
    
    update_data = {}
    
    if user_update.nombre:
        update_data["nombre"] = user_update.nombre
    
    if user_update.username and user_update.username != user_to_update["username"]:
        # Verificar que el nuevo username sea único
        existing = await db.usuarios.find_one({
            "username": user_update.username,
            "organizacion_id": current_user["organizacion_id"],
            "_id": {"$ne": user_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="El username ya existe en esta organización")
        update_data["username"] = user_update.username
    
    if user_update.password:
        update_data["password"] = get_password_hash(user_update.password)
    
    if user_update.rol and user_update.rol in ["administrador", "cajero", "mesero"]:
        update_data["rol"] = user_update.rol
    
    # Manejo de perfil_id
    if user_update.perfil_id is not None:
        if user_update.perfil_id:
            # Verificar que el perfil exista
            perfil = await db.perfiles.find_one({
                "_id": user_update.perfil_id,
                "organizacion_id": current_user["organizacion_id"]
            })
            if not perfil:
                raise HTTPException(status_code=400, detail="El perfil especificado no existe")
            update_data["perfil_id"] = user_update.perfil_id
    
    # Manejo de PIN
    if user_update.pin is not None:
        if user_update.pin:
            # Validar que el PIN sea único
            pin_existe = await db.usuarios.find_one({
                "organizacion_id": current_user["organizacion_id"],
                "pin": user_update.pin,
                "_id": {"$ne": user_id}
            })
            if pin_existe:
                raise HTTPException(status_code=400, detail="Este PIN ya está en uso. Por favor, elige otro.")
            update_data["pin"] = user_update.pin
        else:
            update_data["pin"] = None
    
    if user_update.pin_activo is not None:
        update_data["pin_activo"] = user_update.pin_activo
    
    if update_data:
        await db.usuarios.update_one({"_id": user_id}, {"$set": update_data})
    
    # Obtener usuario actualizado
    updated_user = await db.usuarios.find_one({"_id": user_id})
    
    # Obtener nombre del perfil
    perfil_nombre = updated_user["rol"].capitalize()
    if updated_user.get("perfil_id"):
        perfil = await db.perfiles.find_one({"_id": updated_user["perfil_id"]})
        if perfil:
            perfil_nombre = perfil["nombre"]
    
    return UserResponse(
        id=updated_user["_id"],
        nombre=updated_user["nombre"],
        username=updated_user["username"],
        rol=updated_user["rol"],
        perfil_id=updated_user.get("perfil_id"),
        perfil_nombre=perfil_nombre,
        organizacion_id=updated_user["organizacion_id"],
        creado_por=updated_user.get("creado_por"),
        creado=updated_user["creado"],
        pin=updated_user.get("pin"),
        pin_activo=updated_user.get("pin_activo", False)
    )

@app.post("/api/usuarios/{user_id}/generar-pin")
async def generar_nuevo_pin(user_id: str, current_user: dict = Depends(get_propietario_user)):
    """Generar un nuevo PIN único para un usuario"""
    user_to_update = await db.usuarios.find_one({"_id": user_id})
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user_to_update["organizacion_id"] != current_user["organizacion_id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este usuario")
    
    nuevo_pin = await generar_pin_unico(current_user["organizacion_id"])
    
    await db.usuarios.update_one(
        {"_id": user_id},
        {"$set": {"pin": nuevo_pin, "pin_activo": True}}
    )
    
    return {"pin": nuevo_pin, "message": "PIN generado correctamente"}

class ValidarPINRequest(BaseModel):
    pin: str
    codigo_tienda: str
    forzar_cierre: bool = False

@app.post("/api/auth/validar-pin")
async def validar_pin(request: ValidarPINRequest):
    """
    PASO 1 del login: Valida el PIN y retorna los TPVs disponibles.
    No crea sesión aún - solo valida credenciales y muestra opciones.
    """
    tienda = None
    organizacion_id = None
    
    # Buscar la tienda por su codigo_tienda único
    tienda = await db.tiendas.find_one({
        "codigo_tienda": request.codigo_tienda.upper()
    })
    
    if tienda:
        organizacion_id = tienda["organizacion_id"]
    else:
        # Buscar por codigo_establecimiento (compatibilidad)
        tienda = await db.tiendas.find_one({
            "codigo_establecimiento": request.codigo_tienda.upper()
        })
        
        if tienda:
            organizacion_id = tienda["organizacion_id"]
        else:
            raise HTTPException(status_code=401, detail="Código de tienda no válido")
    
    # Buscar usuario con ese PIN
    org_id_str = str(organizacion_id)
    user = await db.usuarios.find_one({
        "pin": request.pin,
        "pin_activo": True,
        "$or": [
            {"organizacion_id": organizacion_id},
            {"organizacion_id": org_id_str}
        ]
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="PIN inválido o no activo")
    
    user_id = str(user["_id"])
    
    # Verificar si tiene sesión ACTIVA en otro dispositivo
    sesion_activa = await db.sesiones_pos.find_one({
        "user_id": user_id,
        "activa": True
    })
    
    if sesion_activa and not request.forzar_cierre:
        # En lugar de rechazar, retornar info de la sesión activa y su TPV
        tpv_id = sesion_activa.get("tpv_id")
        tpv_info = await db.tpv.find_one({"id": tpv_id}) if tpv_id else None
        
        return {
            "usuario": {
                "id": user_id,
                "nombre": user.get("nombre", "Usuario"),
                "rol": user.get("rol", "")
            },
            "tienda": {
                "codigo": request.codigo_tienda.upper(),
                "nombre": tienda["nombre"] if tienda else "Tienda"
            },
            "sesion_activa": {
                "tpv_id": tpv_id,
                "tpv_nombre": tpv_info.get("nombre") if tpv_info else "TPV",
                "dispositivo": sesion_activa.get("dispositivo", "Desconocido"),
                "iniciada": sesion_activa.get("fecha_inicio", "")
            },
            "sesion_pausada": None,
            "tpvs_disponibles": [{
                "id": tpv_id,
                "nombre": (tpv_info.get("nombre") if tpv_info else "TPV") + " (Tu sesión activa)",
                "tienda_nombre": tienda["nombre"] if tienda else "Tienda",
                "punto_emision": tpv_info.get("punto_emision", "001") if tpv_info else "001",
                "es_mi_caja": True
            }] if tpv_id else []
        }
    
    # Verificar si tiene sesión PAUSADA (caja abierta)
    sesion_pausada = await db.sesiones_pos.find_one({
        "user_id": user_id,
        "estado": "pausada"
    })
    
    if sesion_pausada:
        tpv_id = sesion_pausada.get("tpv_id")
        tpv_info = await db.tpv.find_one({"id": tpv_id}) if tpv_id else None
        
        # Buscar caja abierta del usuario
        caja = await db.cajas.find_one({
            "usuario_id": user_id,
            "estado": "abierta"
        })
        monto_caja = caja.get("monto_actual", 0) if caja else 0
        
        return {
            "usuario": {
                "id": user_id,
                "nombre": user.get("nombre", "Usuario"),
                "rol": user.get("rol", "")
            },
            "tienda": {
                "codigo": request.codigo_tienda.upper(),
                "nombre": tienda["nombre"] if tienda else "Tienda"
            },
            "sesion_pausada": {
                "tpv_id": tpv_id,
                "tpv_nombre": tpv_info.get("nombre") if tpv_info else "TPV",
                "monto_caja": monto_caja,
                "fecha_pausa": sesion_pausada.get("fecha_pausa", "")
            },
            "tpvs_disponibles": []  # No mostrar otros TPVs si tiene caja abierta
        }
    
    # Obtener TPVs disponibles para este usuario
    tpvs = await db.tpv.find({
        "organizacion_id": org_id_str,
        "$or": [{"activo": True}, {"activo": {"$exists": False}}]
    }, {"_id": 0}).to_list(100)
    
    tpvs_disponibles = []
    for t in tpvs:
        estado_sesion = t.get("estado_sesion", "disponible")
        usuario_reservado = t.get("usuario_reservado_id")
        
        # Disponible si:
        # 1. Está libre (disponible o sin estado)
        # 2. Está ocupado/pausado por ESTE mismo usuario
        # 3. El campo legacy "ocupado" es False/None
        es_disponible = (
            estado_sesion == "disponible" or 
            estado_sesion is None or
            usuario_reservado == user_id or  # Si es mi TPV, siempre disponible para mí
            (estado_sesion not in ["ocupado", "pausado"] and t.get("ocupado") != True)
        )
        
        if es_disponible:
            tienda_tpv = await db.tiendas.find_one({"id": t["tienda_id"]}, {"_id": 0, "nombre": 1})
            
            es_mi_caja = usuario_reservado == user_id and estado_sesion in ["ocupado", "pausado"]
            
            tpvs_disponibles.append({
                "id": t["id"],
                "nombre": t["nombre"],
                "tienda_nombre": tienda_tpv["nombre"] if tienda_tpv else "Sin tienda",
                "punto_emision": t.get("punto_emision", "001"),
                "es_mi_caja": es_mi_caja
            })
    
    return {
        "usuario": {
            "id": user_id,
            "nombre": user.get("nombre", "Usuario"),
            "rol": user.get("rol", "")
        },
        "tienda": {
            "codigo": request.codigo_tienda.upper(),
            "nombre": tienda["nombre"] if tienda else "Tienda"
        },
        "sesion_pausada": None,
        "tpvs_disponibles": tpvs_disponibles,
        "es_mesero": user.get("rol") == "mesero"  # Indicador para el frontend
    }


@app.post("/api/auth/login-pin")
async def login_con_pin(pin_login: PINLogin):
    """Login usando PIN + Código de Tienda (para cajeros, meseros y empleados con PIN activo)"""
    
    tienda = None
    organizacion_id = None
    
    # Primero buscar la tienda por su codigo_tienda único
    tienda = await db.tiendas.find_one({
        "codigo_tienda": pin_login.codigo_tienda.upper()
    })
    
    if tienda:
        organizacion_id = tienda["organizacion_id"]
    else:
        # Buscar por codigo_establecimiento (compatibilidad)
        tienda = await db.tiendas.find_one({
            "codigo_establecimiento": pin_login.codigo_tienda.upper()
        })
        
        if tienda:
            organizacion_id = tienda["organizacion_id"]
        else:
            # También buscar en organizaciones por código, codigo_tienda o ID
            org = await db.organizaciones.find_one({
                "$or": [
                    {"codigo": pin_login.codigo_tienda.upper()},
                    {"codigo_tienda": pin_login.codigo_tienda.upper()},
                    {"_id": pin_login.codigo_tienda}
                ]
            })
            if org:
                organizacion_id = org["_id"]
            else:
                raise HTTPException(
                    status_code=401, 
                    detail="Código de tienda no válido"
                )
    
    # Buscar usuario con ese PIN en esa organización
    org_id_str = str(organizacion_id)
    user = await db.usuarios.find_one({
        "pin": pin_login.pin,
        "pin_activo": True,
        "$or": [
            {"organizacion_id": organizacion_id},
            {"organizacion_id": org_id_str}
        ]
    })
    
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="PIN inválido o no activo"
        )
    
    user_id = str(user["_id"])
    organizacion_id = str(user["organizacion_id"])
    es_mesero = user.get("rol") == "mesero"
    
    # ============ SISTEMA DE SESIONES POR TPV ============
    
    # Los meseros no tienen las mismas restricciones de sesión (no manejan caja)
    if es_mesero:
        # Cerrar cualquier sesión anterior del mesero automáticamente
        await db.sesiones_pos.update_many(
            {"user_id": user_id, "activa": True},
            {"$set": {"activa": False, "estado": "cerrada", "fecha_cierre": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        # 1. Verificar si el usuario tiene una sesión PAUSADA (salió sin cerrar caja)
        sesion_pausada = await db.sesiones_pos.find_one({
            "user_id": user_id,
            "estado": "pausada"
        })
        
        if sesion_pausada:
            tpv_reservado = sesion_pausada.get("tpv_id")
            caja_id = sesion_pausada.get("caja_abierta_id")
            
            # Obtener info del TPV reservado
            tpv_info = await db.tpv.find_one({"id": tpv_reservado}) if tpv_reservado else None
            tpv_nombre = tpv_info.get("nombre", "TPV") if tpv_info else "TPV"
            
            # Obtener monto de la caja (buscar por múltiples formatos de ID)
            caja = None
            monto_caja = 0
            if caja_id:
                try:
                    # Intentar primero con ObjectId
                    caja = await db.cajas.find_one({"_id": ObjectId(caja_id)})
                except:
                    # Si falla, buscar como string o por usuario
                    caja = await db.cajas.find_one({
                        "usuario_id": user_id,
                        "estado": "abierta"
                    })
                if caja:
                    monto_caja = caja.get("monto_actual", 0)
            
            if not getattr(pin_login, 'forzar_cierre', False):
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "SESSION_PAUSED",
                        "message": "Tienes una caja abierta que debes cerrar",
                        "session_info": {
                            "usuario_nombre": user.get("nombre", "Usuario"),
                            "usuario_rol": user.get("rol", ""),
                            "tpv_id": tpv_reservado,
                            "tpv_nombre": tpv_nombre,
                            "monto_caja": monto_caja,
                            "fecha_pausa": sesion_pausada.get("fecha_pausa", "")
                        }
                    }
                )
            # Si forzar_cierre=True, continuar y reactivar la sesión en el mismo TPV
        
        # 2. Verificar si el usuario ya tiene una sesión ACTIVA
        sesion_existente = await db.sesiones_pos.find_one({
            "user_id": user_id,
            "activa": True
        })
        
        if sesion_existente:
            if not getattr(pin_login, 'forzar_cierre', False):
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "SESSION_ACTIVE",
                        "message": "Este usuario ya tiene una sesión activa",
                        "session_info": {
                            "usuario_nombre": user.get("nombre", "Usuario"),
                            "usuario_rol": user.get("rol", ""),
                            "dispositivo": sesion_existente.get("dispositivo", "Desconocido"),
                            "tpv_nombre": sesion_existente.get("tpv_nombre", ""),
                            "iniciada": sesion_existente.get("fecha_inicio", ""),
                            "ultima_actividad": sesion_existente.get("ultima_actividad", "")
                        }
                    }
                )
    
    # Variable para rastrear sesión pausada (solo para no-meseros)
    sesion_pausada = None
    if not es_mesero:
        sesion_pausada = await db.sesiones_pos.find_one({
            "user_id": user_id,
            "estado": "pausada"
        })
    
    # 3. Verificar si el TPV seleccionado está disponible (si se especificó uno)
    tpv_id_seleccionado = getattr(pin_login, 'tpv_id', None)
    
    # Los meseros no necesitan TPV (es_mesero ya está definido arriba)
    if es_mesero:
        tpv_id_seleccionado = None  # Forzar a None para meseros
    
    if tpv_id_seleccionado:
        tpv = await db.tpv.find_one({"id": tpv_id_seleccionado})
        if tpv:
            estado_tpv = tpv.get("estado_sesion", "disponible")
            usuario_reservado = tpv.get("usuario_reservado_id")
            
            # Si el TPV está ocupado/pausado por ESTE mismo usuario, permitir
            if usuario_reservado == user_id:
                pass  # OK, es su propio TPV
            elif estado_tpv == "pausado" and usuario_reservado:
                # TPV reservado por otro usuario
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "TPV_RESERVED",
                        "message": f"Este TPV está reservado por {tpv.get('usuario_reservado_nombre', 'otro usuario')} que tiene caja abierta",
                        "tpv_info": {
                            "nombre": tpv.get("nombre"),
                            "usuario_reservado": tpv.get("usuario_reservado_nombre")
                        }
                    }
                )
            elif estado_tpv == "ocupado" and usuario_reservado:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "TPV_BUSY",
                        "message": f"Este TPV está siendo usado por {tpv.get('usuario_reservado_nombre', 'otro usuario')}",
                        "tpv_info": {
                            "nombre": tpv.get("nombre"),
                            "usuario_reservado": tpv.get("usuario_reservado_nombre")
                        }
                    }
                )
    
    # ============ CREAR/REACTIVAR SESIÓN ============
    
    session_id = str(uuid.uuid4())
    
    # Si tenía sesión pausada, reactivarla en el mismo TPV
    if sesion_pausada:
        tpv_id_seleccionado = sesion_pausada.get("tpv_id")
        
        # Reactivar la sesión pausada
        await db.sesiones_pos.update_one(
            {"_id": sesion_pausada["_id"]},
            {"$set": {
                "session_id": session_id,
                "activa": True,
                "estado": "activa",
                "fecha_reactivacion": datetime.now(timezone.utc).isoformat(),
                "ultima_actividad": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Marcar TPV como ocupado
        if tpv_id_seleccionado:
            await db.tpv.update_one(
                {"id": tpv_id_seleccionado},
                {"$set": {"estado_sesion": "ocupado"}}
            )
    else:
        # Cerrar cualquier sesión anterior del usuario
        await db.sesiones_pos.update_many(
            {"user_id": user_id, "activa": True},
            {"$set": {"activa": False, "estado": "cerrada", "fecha_cierre": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Liberar TPV anterior si lo tenía
        await db.tpv.update_many(
            {"usuario_reservado_id": user_id, "estado_sesion": {"$in": ["ocupado", "pausado"]}},
            {"$set": {
                "estado_sesion": "disponible",
                "usuario_reservado_id": None,
                "usuario_reservado_nombre": None,
                "caja_abierta_id": None
            }}
        )
        
        # Obtener info del TPV seleccionado
        tpv_nombre = ""
        if tpv_id_seleccionado:
            tpv_info = await db.tpv.find_one({"id": tpv_id_seleccionado})
            if tpv_info:
                tpv_nombre = tpv_info.get("nombre", "")
                # Marcar TPV como ocupado desde el login
                await db.tpv.update_one(
                    {"id": tpv_id_seleccionado},
                    {"$set": {
                        "estado_sesion": "ocupado",
                        "usuario_reservado_id": user_id,
                        "usuario_reservado_nombre": user.get("nombre", "Usuario"),
                        "ocupado": True,
                        "ocupado_por": user_id,
                        "ocupado_por_nombre": user.get("nombre", "Usuario")
                    }}
                )
        
        # Crear nueva sesión con TPV asignado
        nueva_sesion = {
            "session_id": session_id,
            "user_id": user_id,
            "user_nombre": user.get("nombre", "Usuario"),
            "user_rol": user.get("rol", ""),
            "organizacion_id": organizacion_id,
            "tpv_id": tpv_id_seleccionado,
            "tpv_nombre": tpv_nombre,
            "dispositivo": getattr(pin_login, 'dispositivo', None) or "Navegador Web",
            "activa": True,
            "estado": "activa",
            "fecha_inicio": datetime.now(timezone.utc).isoformat(),
            "ultima_actividad": datetime.now(timezone.utc).isoformat()
        }
        await db.sesiones_pos.insert_one(nueva_sesion)
    
    # Crear token JWT con el session_id incluido
    access_token = create_access_token(data={"sub": user_id, "session_id": session_id})
    
    # Obtener nombre de la tienda para mostrar
    tienda_nombre = tienda["nombre"] if tienda else "Tienda Principal"
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "session_id": session_id,
        "usuario": {
            "id": user_id,
            "nombre": user.get("nombre") or user.get("nombre_completo", "Usuario"),
            "username": user["username"],
            "rol": user["rol"],
            "organizacion_id": str(user["organizacion_id"]),
            "tpv_id": tpv_id_seleccionado,
            "tpv_nombre": tpv_nombre if 'tpv_nombre' in dir() else sesion_pausada.get("tpv_nombre", "") if sesion_pausada else ""
        },
        "tienda": {
            "codigo": pin_login.codigo_tienda.upper(),
            "nombre": tienda_nombre
        },
        "tpv": {
            "id": tpv_id_seleccionado,
            "nombre": tpv_nombre if 'tpv_nombre' in dir() else ""
        }
    }

@app.get("/api/tienda/verificar/{codigo}")
async def verificar_codigo_tienda(codigo: str):
    """Verificar si un código de tienda es válido y devolver info básica"""
    
    # Primero buscar en tiendas por codigo_tienda (código único de cada tienda)
    tienda = await db.tiendas.find_one({
        "codigo_tienda": codigo.upper()
    })
    
    if tienda:
        org = await db.organizaciones.find_one({"_id": tienda["organizacion_id"]})
        return {
            "valido": True,
            "tienda_nombre": tienda["nombre"],
            "organizacion_nombre": org.get("nombre", "Organización") if org else "Organización"
        }
    
    # Buscar por codigo_establecimiento (compatibilidad)
    tienda = await db.tiendas.find_one({
        "codigo_establecimiento": codigo.upper()
    })
    
    if tienda:
        org = await db.organizaciones.find_one({"_id": tienda["organizacion_id"]})
        return {
            "valido": True,
            "tienda_nombre": tienda["nombre"],
            "organizacion_nombre": org.get("nombre", "Organización") if org else "Organización"
        }
    
    # Buscar en organizaciones por múltiples campos
    org = await db.organizaciones.find_one({
        "$or": [
            {"codigo": codigo.upper()},
            {"codigo_tienda": codigo.upper()},
            {"_id": codigo}
        ]
    })
    
    if org:
        return {
            "valido": True,
            "tienda_nombre": "Tienda Principal",
            "organizacion_nombre": org.get("nombre", "Organización")
        }
    
    raise HTTPException(status_code=404, detail="Código de tienda no encontrado")

@app.get("/api/config/pin-mode")
async def get_pin_mode(current_user: dict = Depends(get_current_user)):
    """Obtener si el modo PIN está activo en la organización (si hay usuarios con PIN activo)"""
    usuarios_con_pin = await db.usuarios.count_documents({
        "organizacion_id": current_user["organizacion_id"],
        "pin_activo": True
    })
    return {"pin_mode_activo": usuarios_con_pin > 0, "usuarios_con_pin": usuarios_con_pin}

@app.get("/api/organizaciones", response_model=List[OrganizacionResponse])
async def get_organizaciones(current_user: dict = Depends(get_current_user)):
    if current_user["_id"] != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador principal puede ver organizaciones")
    
    organizaciones = await db.organizaciones.find({}, {"_id": 1, "nombre": 1, "propietario_id": 1, "fecha_creacion": 1, "ultima_actividad": 1}).to_list(1000)
    
    result = []
    for org in organizaciones:
        propietario_id = org.get("propietario_id")
        propietario = None
        if propietario_id:
            propietario = await db.usuarios.find_one(
                {"$or": [{"user_id": propietario_id}, {"_id": propietario_id}]},
                {"_id": 0, "nombre": 1, "email": 1}
            )
        
        total_usuarios = await db.usuarios.count_documents({"organizacion_id": str(org["_id"])})
        total_productos = await db.productos.count_documents({"organizacion_id": str(org["_id"])})
        total_ventas = await db.facturas.count_documents({"organizacion_id": str(org["_id"])})
        
        # Convertir fecha a string si es datetime
        fecha_creacion = org.get("fecha_creacion", "")
        if hasattr(fecha_creacion, 'isoformat'):
            fecha_creacion = fecha_creacion.isoformat()
        elif not isinstance(fecha_creacion, str):
            fecha_creacion = str(fecha_creacion) if fecha_creacion else ""
            
        ultima_actividad = org.get("ultima_actividad")
        if hasattr(ultima_actividad, 'isoformat'):
            ultima_actividad = ultima_actividad.isoformat()
        elif ultima_actividad and not isinstance(ultima_actividad, str):
            ultima_actividad = str(ultima_actividad)
        
        result.append(OrganizacionResponse(
            id=str(org["_id"]),
            nombre=org.get("nombre", "Sin nombre"),
            propietario_id=str(propietario_id) if propietario_id else "N/A",
            propietario_nombre=propietario["nombre"] if propietario else "Desconocido",
            propietario_email=propietario.get("email") if propietario else None,
            fecha_creacion=fecha_creacion,
            ultima_actividad=ultima_actividad,
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
            "mesas_por_mesero": False,
            "facturacion_electronica": False,
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
        "mesas_por_mesero": config.get("mesas_por_mesero", False),
        "facturacion_electronica": config.get("facturacion_electronica", False),
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
            "pantalla_clientes": funciones.pantalla_clientes,
            "mesas_por_mesero": funciones.mesas_por_mesero,
            "facturacion_electronica": funciones.facturacion_electronica
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
    
    # Obtener el código de tienda de la organización (como fallback)
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
            # Usar el código propio de la tienda, o el de la organización como fallback
            codigo_tienda=t.get("codigo_tienda") or codigo_tienda_org,
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
    
    # Generar código único para esta tienda
    codigo_tienda = generar_codigo_tienda(tienda.nombre)
    
    nueva_tienda = {
        "id": tienda_id,
        "_id": tienda_id,
        "nombre": tienda.nombre,
        "codigo_establecimiento": tienda.codigo_establecimiento,
        "codigo_tienda": codigo_tienda,  # Código único por tienda
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
        codigo_tienda=codigo_tienda,
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

@app.post("/api/tiendas/{tienda_id}/regenerar-codigo")
async def regenerar_codigo_tienda(tienda_id: str, current_user: dict = Depends(get_current_user)):
    """Regenera el código único de una tienda"""
    if current_user["rol"] not in ["propietario", "administrador"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    tienda = await db.tiendas.find_one({
        "id": tienda_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Generar nuevo código único
    nuevo_codigo = generar_codigo_tienda(tienda["nombre"])
    
    await db.tiendas.update_one(
        {"id": tienda_id},
        {"$set": {"codigo_tienda": nuevo_codigo}}
    )
    
    return {"codigo_tienda": nuevo_codigo, "message": "Código regenerado correctamente"}

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
    """Obtiene solo los TPV activos y disponibles para selección al abrir caja"""
    user_id = str(current_user.get("_id") or current_user.get("user_id"))
    
    # Buscar TPVs de la organización que estén activos
    tpvs = await db.tpv.find({
        "organizacion_id": current_user["organizacion_id"],
        "$or": [
            {"activo": True},
            {"activo": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(1000)
    
    result = []
    for t in tpvs:
        estado_sesion = t.get("estado_sesion", "disponible")
        usuario_reservado = t.get("usuario_reservado_id")
        
        # El TPV está disponible si:
        # 1. estado_sesion es "disponible" o no existe
        # 2. está ocupado/pausado pero reservado para ESTE usuario
        # 3. campo ocupado antiguo es False/None
        ocupado_legacy = t.get("ocupado")
        
        esta_disponible = (
            estado_sesion == "disponible" or 
            estado_sesion is None or
            usuario_reservado == user_id or  # Si es mi TPV, siempre disponible para mí
            (estado_sesion not in ["ocupado", "pausado"] and ocupado_legacy != True)
        )
        
        if not esta_disponible:
            continue
            
        tienda = await db.tiendas.find_one({"id": t["tienda_id"]}, {"_id": 0, "nombre": 1})
        tienda_nombre = tienda["nombre"] if tienda else "Sin tienda"
        
        # Indicar si es un TPV reservado para este usuario
        es_mi_tpv = usuario_reservado == user_id and estado_sesion in ["ocupado", "pausado"]
        
        result.append(TPVResponse(
            id=t["id"],
            nombre=t["nombre"] + (" (Tu caja)" if es_mi_tpv else ""),
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

@app.get("/api/tpv/estado-sesiones")
async def get_estado_sesiones_tpv(current_user: dict = Depends(get_current_user)):
    """Obtiene el estado de sesiones de todos los TPVs (para panel de admin)"""
    # Verificar que sea propietario o admin
    if current_user.get("rol") not in ["propietario", "admin", "administrador"]:
        raise HTTPException(status_code=403, detail="Solo el propietario puede ver el estado de sesiones")
    
    tpvs = await db.tpv.find({
        "organizacion_id": current_user["organizacion_id"],
        "$or": [{"activo": True}, {"activo": {"$exists": False}}]
    }, {"_id": 0}).to_list(100)
    
    result = []
    for t in tpvs:
        tienda = await db.tiendas.find_one({"id": t["tienda_id"]}, {"_id": 0, "nombre": 1})
        
        # Obtener info de caja abierta si existe
        caja_info = None
        if t.get("caja_abierta_id"):
            try:
                caja = await db.cajas.find_one({"_id": ObjectId(t["caja_abierta_id"])})
                if caja:
                    caja_info = {
                        "monto_inicial": caja.get("monto_inicial", 0),
                        "monto_actual": caja.get("monto_actual", 0),
                        "fecha_apertura": caja.get("fecha_apertura", "")
                    }
            except:
                pass
        
        result.append({
            "id": t["id"],
            "nombre": t["nombre"],
            "tienda_nombre": tienda["nombre"] if tienda else "Sin tienda",
            "estado_sesion": t.get("estado_sesion", "disponible"),
            "usuario_nombre": t.get("usuario_reservado_nombre"),
            "usuario_id": t.get("usuario_reservado_id"),
            "caja_info": caja_info
        })
    
    return result

@app.post("/api/tpv/{tpv_id}/liberar")
async def liberar_tpv(tpv_id: str, current_user: dict = Depends(get_current_user)):
    """Libera un TPV forzadamente (solo propietario) - cierra la caja si está abierta"""
    if current_user.get("rol") not in ["propietario", "admin", "administrador"]:
        raise HTTPException(status_code=403, detail="Solo el propietario puede liberar TPVs")
    
    tpv = await db.tpv.find_one({"id": tpv_id, "organizacion_id": current_user["organizacion_id"]})
    if not tpv:
        raise HTTPException(status_code=404, detail="TPV no encontrado")
    
    usuario_afectado = tpv.get("usuario_reservado_id")
    caja_id = tpv.get("caja_abierta_id")
    
    # Si hay caja abierta, cerrarla con el monto actual
    if caja_id:
        try:
            caja = await db.cajas.find_one({"_id": ObjectId(caja_id)})
            if caja and caja.get("estado") == "abierta":
                await db.cajas.update_one(
                    {"_id": ObjectId(caja_id)},
                    {"$set": {
                        "estado": "cerrada",
                        "fecha_cierre": datetime.now(timezone.utc).isoformat(),
                        "cerrado_por": "admin_forzado",
                        "cerrado_por_nombre": current_user.get("nombre", "Admin")
                    }}
                )
        except:
            pass
    
    # Cerrar sesiones del usuario afectado
    if usuario_afectado:
        await db.sesiones_pos.update_many(
            {"user_id": usuario_afectado},
            {"$set": {
                "activa": False,
                "estado": "cerrada_por_admin",
                "fecha_cierre": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # Liberar el TPV
    await db.tpv.update_one(
        {"id": tpv_id},
        {"$set": {
            "estado_sesion": "disponible",
            "usuario_reservado_id": None,
            "usuario_reservado_nombre": None,
            "caja_abierta_id": None,
            "ocupado": False,
            "ocupado_por": None,
            "ocupado_por_nombre": None
        }}
    )
    
    return {
        "message": "TPV liberado correctamente",
        "usuario_afectado": usuario_afectado,
        "caja_cerrada": caja_id is not None
    }


@app.post("/api/tpv/crear-automatico")
async def crear_tpv_automatico(current_user: dict = Depends(get_current_user)):
    """Crea automáticamente una tienda y TPV por defecto SOLO si no existe ninguno (primera vez)"""
    org_id = current_user["organizacion_id"]
    
    # Verificar si ya existen TPVs en la organización
    total_tpvs = await db.tpv.count_documents({
        "organizacion_id": org_id,
        "$or": [{"activo": True}, {"activo": {"$exists": False}}]
    })
    
    if total_tpvs > 0:
        # Ya existen TPVs - verificar si hay alguno disponible
        tpv_disponible = await db.tpv.find_one({
            "organizacion_id": org_id,
            "$and": [
                {"$or": [{"activo": True}, {"activo": {"$exists": False}}]},
                {"$or": [{"ocupado": False}, {"ocupado": {"$exists": False}}, {"ocupado": None}]}
            ]
        })
        
        if tpv_disponible:
            tienda = await db.tiendas.find_one({"id": tpv_disponible["tienda_id"]}, {"_id": 0})
            return {
                "mensaje": "Ya existe un TPV disponible",
                "tpv_id": tpv_disponible["id"],
                "tpv_nombre": tpv_disponible["nombre"],
                "tienda_nombre": tienda["nombre"] if tienda else "Sin tienda",
                "creado": False
            }
        else:
            # Todos ocupados - indicar que debe crear uno manualmente
            raise HTTPException(
                status_code=400,
                detail="No hay TPVs disponibles. Todos están ocupados. Ve a Configuración → Dispositivos TPV para crear uno nuevo."
            )
    
    # PRIMERA VEZ - No hay ningún TPV, crear uno automáticamente
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
    
    # Crear primer TPV
    tpv_id = str(uuid.uuid4())
    nuevo_tpv = {
        "id": tpv_id,
        "nombre": "Caja 1",
        "punto_emision": "001",
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
        "mensaje": "TPV creado automáticamente (primera vez)",
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
@app.get("/api/tickets-abiertos-pos")
async def get_tickets_abiertos_pos(current_user: dict = Depends(get_current_user)):
    # Obtener configuración de mesas_por_mesero
    config = await db.funciones_config.find_one(
        {"organizacion_id": current_user["organizacion_id"]}, 
        {"_id": 0}
    )
    mesas_por_mesero = config.get("mesas_por_mesero", False) if config else False
    
    user_id = current_user["_id"]
    user_rol = current_user["rol"]
    
    # Filtro base
    filtro = {"organizacion_id": current_user["organizacion_id"]}
    
    # Si es mesero y mesas_por_mesero está activado, solo mostrar SUS tickets
    if user_rol == "mesero" and mesas_por_mesero:
        filtro["vendedor_id"] = user_id
    
    # Obtener tickets según el filtro
    tickets = await db.tickets_abiertos.find(filtro, {"_id": 0}).sort("fecha_creacion", -1).to_list(1000)
    
    result = []
    for t in tickets:
        # Determinar si el ticket es propio (creado por este usuario)
        es_propio = t["vendedor_id"] == user_id
        
        # Determinar si puede editar:
        # - Si mesas_por_mesero está DESACTIVADO: todos pueden editar todo
        # - Si mesas_por_mesero está ACTIVADO:
        #   - Propietarios/Administradores/Cajeros: pueden editar cualquier ticket
        #   - Meseros: solo pueden editar sus propios tickets
        if not mesas_por_mesero:
            puede_editar = True
        else:
            if user_rol in ["propietario", "administrador", "cajero"]:
                puede_editar = True
            else:  # mesero
                puede_editar = es_propio
        
        result.append(TicketAbiertoResponse(
            id=t["id"],
            nombre=t["nombre"],
            items=[InvoiceItem(**item) for item in t["items"]],
            subtotal=t["subtotal"],
            vendedor_id=t["vendedor_id"],
            vendedor_nombre=t["vendedor_nombre"],
            organizacion_id=t["organizacion_id"],
            caja_id=t.get("caja_id"),
            cliente_id=t.get("cliente_id"),
            cliente_nombre=t.get("cliente_nombre"),
            comentarios=t.get("comentarios"),
            fecha_creacion=t["fecha_creacion"],
            ultimo_vendedor_id=t.get("ultimo_vendedor_id"),
            ultimo_vendedor_nombre=t.get("ultimo_vendedor_nombre"),
            ultima_modificacion=t.get("ultima_modificacion"),
            puede_editar=puede_editar,
            es_propio=es_propio,
            mesero_id=t.get("mesero_id"),
            mesero_nombre=t.get("mesero_nombre")
        ))
    
    return result

@app.post("/api/tickets-abiertos-pos")
async def create_ticket_abierto(ticket: TicketAbiertoCreate, current_user: dict = Depends(get_current_user)):
    caja_id = None
    
    # Los meseros no necesitan caja activa para guardar tickets
    if current_user.get("rol") == "mesero":
        caja_id = "mesero_virtual"
    else:
        # Verificar caja activa para otros roles
        caja_activa = await db.cajas.find_one({
            "usuario_id": current_user["_id"],
            "estado": "abierta"
        })
        
        if not caja_activa:
            raise HTTPException(status_code=400, detail="Debes abrir una caja antes de guardar tickets")
        
        caja_id = caja_activa["_id"]
    
    ticket_id = str(uuid.uuid4())
    
    # Determinar si es mesero para guardar como creador original
    es_mesero = current_user.get("rol") == "mesero"
    
    new_ticket = {
        "id": ticket_id,
        "nombre": ticket.nombre,
        "items": [item.model_dump() for item in ticket.items],
        "subtotal": ticket.subtotal,
        "vendedor_id": current_user["_id"],
        "vendedor_nombre": current_user["nombre"],
        # Guardar mesero original si aplica
        "mesero_id": current_user["_id"] if es_mesero else None,
        "mesero_nombre": current_user["nombre"] if es_mesero else None,
        "organizacion_id": current_user["organizacion_id"],
        "caja_id": caja_id,
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
        caja_id=caja_id,
        cliente_id=ticket.cliente_id,
        cliente_nombre=ticket.cliente_nombre,
        comentarios=ticket.comentarios,
        fecha_creacion=new_ticket["fecha_creacion"]
    )

@app.put("/api/tickets-abiertos-pos/{ticket_id}")
async def update_ticket_abierto(ticket_id: str, ticket: TicketAbiertoCreate, current_user: dict = Depends(get_current_user)):
    # Verificar configuración de mesas_por_mesero
    config = await db.funciones_config.find_one(
        {"organizacion_id": current_user["organizacion_id"]}, 
        {"_id": 0}
    )
    mesas_por_mesero = config.get("mesas_por_mesero", False) if config else False
    
    # Obtener el ticket para verificar permisos
    ticket_existente = await db.tickets_abiertos.find_one({
        "id": ticket_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not ticket_existente:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    # Verificar permisos si mesas_por_mesero está activo
    if mesas_por_mesero:
        es_propio = ticket_existente["vendedor_id"] == current_user["_id"]
        user_rol = current_user["rol"]
        
        # Meseros solo pueden editar sus propias mesas
        if user_rol == "mesero" and not es_propio:
            raise HTTPException(
                status_code=403, 
                detail=f"Esta mesa pertenece a {ticket_existente['vendedor_nombre']}. Solo puedes editar tus propias mesas."
            )
    
    # Determinar caja_id
    caja_id = None
    if current_user.get("rol") == "mesero":
        caja_id = "mesero_virtual"
    else:
        caja_activa = await db.cajas.find_one({
            "usuario_id": current_user["_id"],
            "estado": "abierta"
        })
        caja_id = caja_activa["_id"] if caja_activa else None
    
    # Actualizar el ticket
    result = await db.tickets_abiertos.update_one(
        {
            "id": ticket_id,
            "organizacion_id": current_user["organizacion_id"]
        },
        {
            "$set": {
                "nombre": ticket.nombre,
                "items": [item.model_dump() for item in ticket.items],
                "subtotal": ticket.subtotal,
                "cliente_id": ticket.cliente_id,
                "cliente_nombre": ticket.cliente_nombre,
                "comentarios": ticket.comentarios,
                # Actualizar quién está trabajando en este ticket ahora
                "ultimo_vendedor_id": current_user["_id"],
                "ultimo_vendedor_nombre": current_user["nombre"],
                "ultima_modificacion": datetime.now(timezone.utc).isoformat(),
                # Actualizar caja_id
                "caja_id": caja_id
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    return {"message": "Ticket actualizado correctamente"}

@app.delete("/api/tickets-abiertos-pos/{ticket_id}")
async def delete_ticket_abierto(ticket_id: str, current_user: dict = Depends(get_current_user)):
    # Cualquier empleado de la organización puede eliminar/cobrar tickets
    # Esto permite que un cajero cobre la mesa que tomó un mesero
    result = await db.tickets_abiertos.delete_one({
        "id": ticket_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
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
    """Sube una imagen para un producto, la comprime y devuelve como Base64"""
    # Validar tipo de archivo
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP")
    
    try:
        # Leer imagen
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        
        # Convertir a RGB si es necesario (para JPEG)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Redimensionar si es muy grande (max 800px de ancho)
        max_width = 800
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # Comprimir a JPEG con calidad 70%
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=70, optimize=True)
        buffer.seek(0)
        
        # Convertir a Base64
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        imagen_data = f"data:image/jpeg;base64,{img_base64}"
        
        return {"url": imagen_data, "filename": "compressed.jpg"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar imagen: {str(e)}")

@app.post("/api/config/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_propietario_or_admin)
):
    """Sube un logo para el negocio, lo comprime y devuelve como Base64"""
    # Validar tipo de archivo
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP")
    
    try:
        # Leer imagen
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        
        # Para logos, mantener transparencia si es PNG
        if img.mode == 'RGBA':
            # Guardar como PNG para mantener transparencia
            max_width = 300
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            buffer = io.BytesIO()
            img.save(buffer, format='PNG', optimize=True)
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            logo_data = f"data:image/png;base64,{img_base64}"
        else:
            # Convertir a RGB y guardar como JPEG
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            max_width = 300
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=80, optimize=True)
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            logo_data = f"data:image/jpeg;base64,{img_base64}"
        
        return {"url": logo_data, "filename": "logo_compressed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar logo: {str(e)}")

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

@app.get("/api/clientes/id/{cliente_id}")
async def buscar_cliente_por_id(cliente_id: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({
        "_id": cliente_id,
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
        
        # Obtener user_id del usuario actual
        user_id = str(current_user.get("_id") or current_user.get("user_id"))
        
        # Verificar estado de sesión del TPV
        estado_sesion = tpv.get("estado_sesion", "disponible")
        usuario_reservado = tpv.get("usuario_reservado_id")
        
        # Si el TPV está ocupado/reservado por ESTE usuario, permitir
        if usuario_reservado == user_id:
            pass  # OK, es su propio TPV
        elif tpv.get("ocupado") and usuario_reservado and usuario_reservado != user_id:
            raise HTTPException(status_code=400, detail=f"El TPV ya está ocupado por {tpv.get('usuario_reservado_nombre', 'otro usuario')}")
        elif estado_sesion == "pausado" and usuario_reservado:
            raise HTTPException(
                status_code=400, 
                detail=f"Este TPV está reservado por {tpv.get('usuario_reservado_nombre', 'otro usuario')} que tiene caja abierta"
            )
        elif estado_sesion == "ocupado" and usuario_reservado:
            raise HTTPException(
                status_code=400,
                detail=f"Este TPV está siendo usado por {tpv.get('usuario_reservado_nombre', 'otro usuario')}"
            )
        
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
        
        # Marcar el TPV como ocupado (sistema nuevo y legacy)
        user_id = str(current_user.get("_id") or current_user.get("user_id"))
        await db.tpv.update_one(
            {"id": tpv_id},
            {
                "$set": {
                    "ocupado": True,
                    "ocupado_por": current_user["_id"],
                    "ocupado_por_nombre": current_user["nombre"],
                    "estado_sesion": "ocupado",
                    "usuario_reservado_id": user_id,
                    "usuario_reservado_nombre": current_user["nombre"]
                }
            }
        )
        
        # Actualizar la sesión del usuario con el TPV asignado
        await db.sesiones_pos.update_one(
            {"user_id": user_id, "activa": True},
            {"$set": {
                "tpv_id": tpv_id,
                "tpv_nombre": tpv_nombre
            }}
        )
        
        # El nombre de la caja será el nombre del TPV
        numero_caja = tpv_nombre
    else:
        # No se proporcionó TPV - verificar disponibilidad
        org_id = current_user["organizacion_id"]
        
        # Primero verificar si existen TPVs en la organización
        total_tpvs = await db.tpv.count_documents({
            "organizacion_id": org_id,
            "$or": [{"activo": True}, {"activo": {"$exists": False}}]
        })
        
        if total_tpvs == 0:
            # PRIMERA VEZ - No hay ningún TPV, crear uno automáticamente
            # Buscar o crear tienda
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
            
            # Crear primer TPV
            nuevo_tpv_id = str(uuid.uuid4())
            tpv_disponible = {
                "id": nuevo_tpv_id,
                "nombre": "Caja 1",
                "punto_emision": "001",
                "tienda_id": tienda["id"],
                "activo": True,
                "ocupado": False,
                "ocupado_por": None,
                "ocupado_por_nombre": None,
                "organizacion_id": org_id,
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            }
            await db.tpv.insert_one(tpv_disponible)
        else:
            # Ya existen TPVs - buscar uno disponible
            tpv_disponible = await db.tpv.find_one({
                "organizacion_id": org_id,
                "$and": [
                    {"$or": [{"activo": True}, {"activo": {"$exists": False}}]},
                    {"$or": [{"ocupado": False}, {"ocupado": {"$exists": False}}, {"ocupado": None}]}
                ]
            })
            
            if not tpv_disponible:
                # Todos los TPVs están ocupados - NO crear automático
                raise HTTPException(
                    status_code=400, 
                    detail="No hay TPVs disponibles. Todos están ocupados. Ve a Configuración → Dispositivos TPV para crear uno nuevo."
                )
        
        # Ahora tenemos un TPV disponible, usarlo
        tpv_id = tpv_disponible["id"]
        tpv_nombre = tpv_disponible["nombre"]
        
        # Obtener datos de la tienda
        tienda = await db.tiendas.find_one({"id": tpv_disponible["tienda_id"]}, {"_id": 0})
        tienda_id = tienda["id"] if tienda else None
        tienda_nombre = tienda["nombre"] if tienda else "Sin tienda"
        codigo_establecimiento = tienda.get("codigo_establecimiento", "001") if tienda else "001"
        punto_emision = tpv_disponible["punto_emision"]
        
        # Marcar el TPV como ocupado (sistema nuevo y legacy)
        user_id = str(current_user.get("_id") or current_user.get("user_id"))
        await db.tpv.update_one(
            {"id": tpv_id},
            {
                "$set": {
                    "ocupado": True,
                    "ocupado_por": current_user["_id"],
                    "ocupado_por_nombre": current_user["nombre"],
                    "estado_sesion": "ocupado",
                    "usuario_reservado_id": user_id,
                    "usuario_reservado_nombre": current_user["nombre"]
                }
            }
        )
        
        # Actualizar la sesión del usuario con el TPV asignado
        await db.sesiones_pos.update_one(
            {"user_id": user_id, "activa": True},
            {"$set": {
                "tpv_id": tpv_id,
                "tpv_nombre": tpv_nombre
            }}
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
    
    # Liberar el TPV si estaba asignado (sistema nuevo y legacy)
    if caja.get("tpv_id"):
        await db.tpv.update_one(
            {"id": caja["tpv_id"]},
            {
                "$set": {
                    "ocupado": False,
                    "ocupado_por": None,
                    "ocupado_por_nombre": None,
                    "estado_sesion": "disponible",
                    "usuario_reservado_id": None,
                    "usuario_reservado_nombre": None,
                    "caja_abierta_id": None
                }
            }
        )
    
    # Limpiar sesiones pausadas del usuario (ya cerró su caja)
    user_id = str(current_user.get("_id") or current_user.get("user_id"))
    await db.sesiones_pos.update_many(
        {"user_id": user_id, "estado": "pausada"},
        {"$set": {
            "estado": "cerrada",
            "fecha_cierre": datetime.now(timezone.utc).isoformat()
        }}
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
    
    # Actualizar el objeto caja para la respuesta
    caja["estado"] = "cerrada"
    caja["efectivo_contado"] = cierre.efectivo_contado
    caja["diferencia"] = diferencia
    caja["fecha_cierre"] = fecha_cierre
    caja["monto_final"] = monto_final
    
    # Obtener ventas por método de pago
    ventas_por_metodo = []
    pipeline = [
        {"$match": {"caja_id": caja_id, "organizacion_id": current_user["organizacion_id"]}},
        {"$group": {"_id": "$metodo_pago_id", "total": {"$sum": "$total"}, "cantidad": {"$sum": 1}}}
    ]
    async for item in db.facturas.aggregate(pipeline):
        metodo = await db.metodos_pago.find_one({"id": item["_id"]})
        ventas_por_metodo.append({
            "metodo_id": item["_id"],
            "metodo_nombre": metodo["nombre"] if metodo else "Desconocido",
            "total": item["total"],
            "cantidad": item["cantidad"]
        })
    
    return CajaResponse(
        id=caja["_id"],
        numero=caja["numero"],
        usuario_id=caja["usuario_id"],
        usuario_nombre=caja["usuario_nombre"],
        monto_inicial=caja["monto_inicial"],
        monto_ventas=caja["monto_ventas"],
        monto_final=monto_final,
        efectivo_contado=cierre.efectivo_contado,
        diferencia=diferencia,
        total_ventas=caja["total_ventas"],
        fecha_apertura=caja["fecha_apertura"],
        fecha_cierre=fecha_cierre,
        estado="cerrada",
        tpv_id=caja.get("tpv_id"),
        tpv_nombre=caja.get("tpv_nombre"),
        tienda_id=caja.get("tienda_id"),
        tienda_nombre=caja.get("tienda_nombre"),
        codigo_establecimiento=caja.get("codigo_establecimiento"),
        punto_emision=caja.get("punto_emision"),
        ventas_por_metodo=ventas_por_metodo
    )

@app.post("/api/facturas", response_model=InvoiceResponse)
async def create_factura(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    caja_activa = await db.cajas.find_one({
        "usuario_id": current_user["_id"],
        "estado": "abierta"
    })
    
    if not caja_activa:
        raise HTTPException(status_code=400, detail="Debes abrir una caja antes de realizar ventas")
    
    invoice_id = str(uuid.uuid4())
    
    # Determinar el formato de numeración de factura (Formato SRI obligatorio)
    codigo_establecimiento = caja_activa.get("codigo_establecimiento")
    punto_emision = caja_activa.get("punto_emision")
    
    # Si la caja no tiene datos de TPV, obtenerlos o crear TPV automáticamente
    if not codigo_establecimiento or not punto_emision:
        tpv = await db.tpv.find_one({"id": caja_activa.get("tpv_id")})
        
        if tpv:
            # TPV existe, obtener datos
            tienda = await db.tiendas.find_one({"id": tpv.get("tienda_id")})
            codigo_establecimiento = tienda.get("codigo_establecimiento", "001") if tienda else "001"
            punto_emision = tpv.get("punto_emision", "001")
        else:
            # NO hay TPV - Crear uno automáticamente siguiendo las reglas
            org_id = current_user["organizacion_id"]
            
            # Buscar o crear tienda
            tienda = await db.tiendas.find_one({"organizacion_id": org_id}, {"_id": 0})
            if not tienda:
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
            
            codigo_establecimiento = tienda.get("codigo_establecimiento", "001")
            
            # Buscar siguiente punto de emisión disponible
            tpvs_existentes = await db.tpv.find({
                "organizacion_id": org_id,
                "tienda_id": tienda_id
            }, {"punto_emision": 1}).to_list(1000)
            
            puntos_usados = set()
            for tpv_exist in tpvs_existentes:
                try:
                    puntos_usados.add(int(tpv_exist.get("punto_emision", "0")))
                except ValueError:
                    pass
            
            siguiente_numero = 1
            while siguiente_numero in puntos_usados:
                siguiente_numero += 1
            
            punto_emision = f"{siguiente_numero:03d}"
            
            # Crear TPV
            nuevo_tpv_id = str(uuid.uuid4())
            nuevo_tpv = {
                "id": nuevo_tpv_id,
                "nombre": f"Caja {siguiente_numero}",
                "punto_emision": punto_emision,
                "tienda_id": tienda_id,
                "activo": True,
                "ocupado": True,
                "ocupado_por": current_user["_id"],
                "ocupado_por_nombre": current_user.get("nombre", current_user.get("username")),
                "organizacion_id": org_id,
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            }
            await db.tpv.insert_one(nuevo_tpv)
            
            # Actualizar la caja con el nuevo TPV
            await db.cajas.update_one(
                {"_id": caja_activa["_id"]},
                {"$set": {
                    "tpv_id": nuevo_tpv_id,
                    "tpv_nombre": f"Caja {siguiente_numero}",
                    "codigo_establecimiento": codigo_establecimiento,
                    "punto_emision": punto_emision
                }}
            )
        
        # Actualizar caja con los datos del TPV si faltaban
        if not caja_activa.get("codigo_establecimiento") or not caja_activa.get("punto_emision"):
            await db.cajas.update_one(
                {"_id": caja_activa["_id"]},
                {"$set": {
                    "codigo_establecimiento": codigo_establecimiento,
                    "punto_emision": punto_emision
                }}
            )
    
    # Numeración SRI: XXX-YYY-ZZZZZZZZZ
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
    
    # Usar descuentos enviados desde el frontend
    descuento_total = invoice.descuento or 0
    descuentos_detalle = invoice.descuentos_detalle or []
    
    # Subtotal después de descuentos
    subtotal_con_descuento = subtotal - descuento_total
    
    # Si el frontend envió desglose de impuestos, usarlo; si no, calcular en backend
    if invoice.desglose_impuestos and len(invoice.desglose_impuestos) > 0:
        desglose_impuestos = invoice.desglose_impuestos
        total_impuestos = invoice.impuesto or 0
        total_final = invoice.total
    else:
        # Obtener impuestos activos de la organización
        impuestos_activos = await db.impuestos.find({
            "organizacion_id": current_user["organizacion_id"],
            "activo": True
        }, {"_id": 0}).to_list(100)
        
        # Calcular impuestos sobre el subtotal con descuento
        desglose_impuestos = []
        total_impuestos = 0
        
        for impuesto in impuestos_activos:
            if impuesto["tipo"] == "agregado" or impuesto["tipo"] == "no_incluido":
                monto_impuesto = subtotal_con_descuento * (impuesto["tasa"] / 100)
            else:  # tipo == "incluido"
                monto_impuesto = subtotal_con_descuento - (subtotal_con_descuento / (1 + impuesto["tasa"] / 100))
            
            desglose_impuestos.append({
                "nombre": impuesto["nombre"],
                "tasa": impuesto["tasa"],
                "tipo": impuesto["tipo"],
                "monto": round(monto_impuesto, 2)
            })
            total_impuestos += monto_impuesto
        
        # Calcular total final
        if impuestos_activos:
            total_agregado = sum(imp["monto"] for imp in desglose_impuestos if imp["tipo"] in ["agregado", "no_incluido"])
            total_final = subtotal_con_descuento + total_agregado
        else:
            total_final = subtotal_con_descuento
    
    total_impuestos = round(total_impuestos, 2)
    total_final = round(total_final, 2)
    
    new_invoice = {
        "_id": invoice_id,
        "id": invoice_id,
        "numero": numero_factura,
        "items": [item.model_dump() for item in invoice.items],
        "subtotal": subtotal,
        "descuento": descuento_total,
        "descuentos_detalle": [d.model_dump() if hasattr(d, 'model_dump') else d for d in descuentos_detalle],
        "total_impuestos": total_impuestos,
        "desglose_impuestos": desglose_impuestos,
        "total": total_final,
        "vendedor": current_user["_id"],
        "vendedor_nombre": current_user["nombre"],
        # Guardar mesero original si viene del frontend (ticket guardado por mesero)
        "mesero_id": invoice.mesero_id,
        "mesero_nombre": invoice.mesero_nombre,
        # Quien cobra la factura
        "cobrado_por_id": current_user["_id"],
        "cobrado_por_nombre": current_user["nombre"],
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
        descuento=descuento_total,
        descuentos_detalle=[d.model_dump() if hasattr(d, 'model_dump') else d for d in descuentos_detalle],
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
        fecha=new_invoice["fecha"],
        mesero_id=invoice.mesero_id,
        mesero_nombre=invoice.mesero_nombre,
        cobrado_por_id=current_user["_id"],
        cobrado_por_nombre=current_user["nombre"]
    )


# ============================================
# FACTURACION ELECTRONICA ASINCRONA
# ============================================

class EmitirFERequest(BaseModel):
    """Datos para emitir factura electrónica"""
    factura_id: str
    cliente: dict
    items: list
    total: float
    metodo_pago: str = "01"


async def _emitir_fe_background(factura_id: str, organizacion_id: str, cliente: dict, items: list, total: float, metodo_pago: str, token: str):
    """
    Función que se ejecuta en background para emitir la factura electrónica.
    No bloquea el flujo principal de facturación.
    """
    try:
        # No validamos configuración aquí - si llegó a este endpoint es porque 
        # el usuario quiere emitir FE. La validación se hace en el frontend.
        
        # Preparar datos para la FE
        fe_data = {
            "store_code": "001",
            "emission_point": "001",
            "customer": cliente,
            "items": items,
            "payments": [{
                "method": metodo_pago,
                "total": total,
                "term": 0,
                "time_unit": "dias"
            }]
        }
        
        # Llamar al servicio de FE
        fe_url = os.environ.get("FE_BACKEND_URL", "http://localhost:8002")
        async with httpx.AsyncClient(timeout=60.0) as client_http:
            response = await client_http.post(
                f"{fe_url}/fe/documents/invoice",
                json=fe_data,
                headers={
                    "X-Tenant-ID": organizacion_id
                }
            )
            
            if response.status_code == 200:
                fe_result = response.json()
                # Actualizar la factura del POS con los datos de FE
                await db.facturas.update_one(
                    {"id": factura_id},
                    {"$set": {
                        "factura_electronica": {
                            "clave_acceso": fe_result.get("access_key"),
                            "estado": fe_result.get("sri_status"),
                            "numero_autorizacion": fe_result.get("sri_authorization_number"),
                            "documento_id": fe_result.get("document_id"),
                            "numero_documento": fe_result.get("doc_number"),
                            "emitida_at": datetime.now(timezone.utc).isoformat()
                        }
                    }}
                )
                print(f"[FE] Factura {factura_id} emitida: {fe_result.get('sri_status')}")
            else:
                print(f"[FE] Error emitiendo factura {factura_id}: {response.status_code} - {response.text}")
                # Guardar el error para que el usuario pueda ver qué pasó
                await db.facturas.update_one(
                    {"id": factura_id},
                    {"$set": {
                        "factura_electronica": {
                            "estado": "ERROR",
                            "error": response.text[:500],
                            "emitida_at": datetime.now(timezone.utc).isoformat()
                        }
                    }}
                )
    except Exception as e:
        print(f"[FE] Excepción emitiendo factura {factura_id}: {str(e)}")
        await db.facturas.update_one(
            {"id": factura_id},
            {"$set": {
                "factura_electronica": {
                    "estado": "ERROR",
                    "error": str(e)[:500],
                    "emitida_at": datetime.now(timezone.utc).isoformat()
                }
            }}
        )


@app.post("/api/facturas/{factura_id}/emitir-fe")
async def emitir_factura_electronica(
    factura_id: str,
    request: EmitirFERequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint para emitir factura electrónica de forma ASINCRONA.
    Retorna inmediatamente y procesa la FE en background.
    """
    # Verificar que la factura existe
    factura = await db.facturas.find_one({
        "id": factura_id,
        "organizacion_id": current_user["organizacion_id"]
    })
    
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # Si ya tiene FE emitida, no volver a emitir
    if factura.get("factura_electronica", {}).get("clave_acceso"):
        return {
            "status": "already_emitted",
            "message": "Esta factura ya tiene factura electrónica emitida",
            "factura_electronica": factura.get("factura_electronica")
        }
    
    # Obtener token del header
    token = ""
    
    # Marcar como "en proceso" inmediatamente
    await db.facturas.update_one(
        {"id": factura_id},
        {"$set": {
            "factura_electronica": {
                "estado": "EN_PROCESO",
                "emitida_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    # Agregar tarea en background
    background_tasks.add_task(
        _emitir_fe_background,
        factura_id,
        current_user["organizacion_id"],
        request.cliente,
        request.items,
        request.total,
        request.metodo_pago,
        token
    )
    
    return {
        "status": "processing",
        "message": "Factura electrónica en proceso de emisión",
        "factura_id": factura_id
    }


@app.get("/api/facturas/{factura_id}/fe-status")
async def get_fe_status(factura_id: str, current_user: dict = Depends(get_current_user)):
    """
    Consulta el estado de la factura electrónica de una factura del POS.
    """
    factura = await db.facturas.find_one({
        "id": factura_id,
        "organizacion_id": current_user["organizacion_id"]
    }, {"factura_electronica": 1})
    
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    return {
        "factura_id": factura_id,
        "factura_electronica": factura.get("factura_electronica")
    }


@app.get("/api/facturas", response_model=List[InvoiceResponse])
async def get_facturas(
    current_user: dict = Depends(get_current_user),
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    hora_desde: Optional[str] = None,
    hora_hasta: Optional[str] = None,
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
    
    # Filtro por fechas y horas
    if fecha_desde or fecha_hasta:
        query["fecha"] = {}
        if fecha_desde:
            # Si hay hora_desde, combinarla con la fecha
            if hora_desde:
                query["fecha"]["$gte"] = f"{fecha_desde}T{hora_desde}:00"
            else:
                query["fecha"]["$gte"] = fecha_desde
        if fecha_hasta:
            # Si hay hora_hasta, combinarla con la fecha
            if hora_hasta:
                query["fecha"]["$lte"] = f"{fecha_hasta}T{hora_hasta}:59"
            else:
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
            fecha=f["fecha"],
            descuento=f.get("descuento", 0),
            descuentos_detalle=f.get("descuentos_detalle", [])
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
    hora_desde: Optional[str] = None,
    hora_hasta: Optional[str] = None,
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
    
    # Filtro por fechas y horas
    if fecha_desde or fecha_hasta:
        facturas_query["fecha"] = {}
        if fecha_desde:
            if hora_desde:
                facturas_query["fecha"]["$gte"] = f"{fecha_desde}T{hora_desde}:00"
            else:
                facturas_query["fecha"]["$gte"] = fecha_desde
        if fecha_hasta:
            if hora_hasta:
                facturas_query["fecha"]["$lte"] = f"{fecha_hasta}T{hora_hasta}:59"
            else:
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

# ============ PROXY PARA BACKEND DE FACTURACIÓN ELECTRÓNICA ============
# Redirige todas las peticiones /api/fe/* al backend-fe (puerto 8002)

BACKEND_FE_URL = os.environ.get("BACKEND_FE_URL", "http://localhost:8002")

@app.api_route("/api/fe/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_fe(request: Request, path: str):
    """
    Proxy para el backend de Facturación Electrónica
    Redirige todas las peticiones /api/fe/* al backend-fe
    """
    # Construir URL destino
    target_url = f"{BACKEND_FE_URL}/fe/{path}"
    
    # Copiar query params
    if request.query_params:
        target_url += f"?{request.query_params}"
    
    # Copiar headers relevantes
    headers = {}
    for key, value in request.headers.items():
        if key.lower() not in ['host', 'content-length']:
            headers[key] = value
    
    # Obtener body si existe
    body = await request.body()
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body
            )
            
            # Filtrar headers de respuesta
            response_headers = {}
            for key, value in response.headers.items():
                if key.lower() not in ['content-encoding', 'content-length', 'transfer-encoding']:
                    response_headers[key] = value
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.headers.get('content-type')
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timeout conectando con servicio de facturación electrónica")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Error conectando con servicio de facturación electrónica: {str(e)}")
