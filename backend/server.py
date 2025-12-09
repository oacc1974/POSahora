from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
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
    nombre_negocio: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    rfc: Optional[str] = None
    email: Optional[str] = None
    sitio_web: Optional[str] = None
    mensaje_pie: Optional[str] = "¡Gracias por su compra!"

class UserCreate(BaseModel):
    nombre: str
    username: str
    password: str
    rol: str  # propietario, administrador, cajero

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

class InvoiceResponse(BaseModel):
    id: str
    numero: str
    items: List[InvoiceItem]
    total: float
    vendedor: str
    vendedor_nombre: str
    organizacion_id: str
    fecha: str

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
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
        import uuid
        org_id = str(uuid.uuid4())
        admin_user = {
            "_id": "admin",
            "nombre": "Administrador Principal",
            "username": "admin",
            "password": get_password_hash("admin*88"),
            "rol": "propietario",
            "organizacion_id": org_id,
            "creado_por": None,
            "creado": datetime.now(timezone.utc).isoformat()
        }
        await db.usuarios.insert_one(admin_user)
        
        config_negocio = {
            "_id": org_id,
            "nombre_negocio": "Mi Negocio",
            "direccion": "",
            "telefono": "",
            "rfc": "",
            "email": "",
            "sitio_web": "",
            "mensaje_pie": "¡Gracias por su compra!"
        }
        await db.configuraciones.insert_one(config_negocio)

@app.post("/api/login")
async def login(user_login: UserLogin):
    user = await db.usuarios.find_one({"username": user_login.username})
    if not user or not verify_password(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
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
    return {
        "id": current_user["_id"],
        "nombre": current_user["nombre"],
        "username": current_user["username"],
        "rol": current_user["rol"],
        "organizacion_id": current_user["organizacion_id"]
    }

@app.get("/api/config")
async def get_config(current_user: dict = Depends(get_current_user)):
    config = await db.configuraciones.find_one({"_id": current_user["organizacion_id"]})
    if not config:
        return {
            "nombre_negocio": "Mi Negocio",
            "direccion": "",
            "telefono": "",
            "rfc": "",
            "email": "",
            "sitio_web": "",
            "mensaje_pie": "¡Gracias por su compra!"
        }
    return {
        "nombre_negocio": config.get("nombre_negocio", "Mi Negocio"),
        "direccion": config.get("direccion", ""),
        "telefono": config.get("telefono", ""),
        "rfc": config.get("rfc", ""),
        "email": config.get("email", ""),
        "sitio_web": config.get("sitio_web", ""),
        "mensaje_pie": config.get("mensaje_pie", "¡Gracias por su compra!")
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

@app.post("/api/facturas", response_model=InvoiceResponse)
async def create_factura(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
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
    
    new_invoice = {
        "_id": invoice_id,
        "numero": numero_factura,
        "items": [item.model_dump() for item in invoice.items],
        "total": invoice.total,
        "vendedor": current_user["_id"],
        "vendedor_nombre": current_user["nombre"],
        "organizacion_id": current_user["organizacion_id"],
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    await db.facturas.insert_one(new_invoice)
    
    return InvoiceResponse(
        id=invoice_id,
        numero=numero_factura,
        items=invoice.items,
        total=invoice.total,
        vendedor=current_user["_id"],
        vendedor_nombre=current_user["nombre"],
        organizacion_id=current_user["organizacion_id"],
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
    
    return {
        "total_productos": total_productos,
        "total_ventas": total_ventas,
        "total_ingresos": total_ingresos,
        "total_empleados": total_empleados,
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
