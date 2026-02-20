# 📱 Documentación Completa para APK - POS Ahora

**Versión:** 2.0  
**Última actualización:** 13 Febrero 2026  
**Base URL:** `https://tu-dominio.com`

---

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Autenticación y Sesiones](#autenticación-y-sesiones)
3. [Gestión de TPV](#gestión-de-tpv)
4. [Gestión de Caja](#gestión-de-caja)
5. [Productos y Categorías](#productos-y-categorías)
6. [Clientes](#clientes)
7. [Ventas y Facturas](#ventas-y-facturas)
8. [Tickets Abiertos (Mesas)](#tickets-abiertos-mesas)
9. [Facturación Electrónica Ecuador](#facturación-electrónica-ecuador)
10. [Impresoras de Cocina](#impresoras-de-cocina)
11. [Planes y Suscripciones](#planes-y-suscripciones)
12. [Políticas y Reglas de Negocio](#políticas-y-reglas-de-negocio)
13. [Códigos de Error](#códigos-de-error)
14. [Ejemplos de Implementación](#ejemplos-de-implementación)

---

## 🏗️ Arquitectura del Sistema

### Visión General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA POS AHORA                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐      │
│   │  APK/Web    │ ◄─────► │  Backend    │ ◄─────► │  MongoDB    │      │
│   │  (Cliente)  │  REST   │  (FastAPI)  │         │  (Base Datos)│      │
│   └─────────────┘         └──────┬──────┘         └─────────────┘      │
│                                  │                                      │
│                                  │ Proxy                                │
│                                  ▼                                      │
│                          ┌─────────────┐         ┌─────────────┐      │
│                          │ Backend FE  │ ◄─────► │  SRI Ecuador│      │
│                          │ (Facturación)│  SOAP  │  (Gobierno) │      │
│                          └─────────────┘         └─────────────┘      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Endpoints Base

| Servicio | Puerto | Prefijo | Descripción |
|----------|--------|---------|-------------|
| Backend POS | 8001 | `/api` | API principal del POS |
| Backend FE | 8002 | `/api/fe` | Facturación Electrónica SRI |
| Frontend Web | 3000 | `/` | Aplicación web React |

### Headers Requeridos

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## 🔐 Autenticación y Sesiones

### Flujo de Login Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE LOGIN POS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. VERIFICAR CÓDIGO DE TIENDA                                  │
│     GET /api/tienda/verificar/{codigo}                          │
│     → Retorna: nombre tienda, organización                      │
│                                                                 │
│  2. VALIDAR PIN Y OBTENER TPVs DISPONIBLES                      │
│     POST /api/auth/validar-pin                                  │
│     → Retorna: usuario, TPVs disponibles, sesión pausada        │
│                                                                 │
│  3. LOGIN COMPLETO CON TPV SELECCIONADO                         │
│     POST /api/auth/login-pin                                    │
│     → Retorna: token, session_id, usuario, TPV asignado         │
│                                                                 │
│  4. (ALTERNATIVA) LOGIN TRADICIONAL                             │
│     POST /api/login                                             │
│     → Para propietarios/admin con usuario y contraseña          │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Verificar Código de Tienda

```http
GET /api/tienda/verificar/{codigo}
```

**Parámetros:**
- `codigo` (path): Código único de la tienda (ej: "TIEN-7A31")

**Respuesta exitosa (200):**
```json
{
  "valido": true,
  "tienda_nombre": "Tienda Principal",
  "organizacion_nombre": "Mi Empresa"
}
```

**Errores:**
- `404`: Código de tienda no encontrado

---

### 2. Validar PIN y Obtener TPVs Disponibles

```http
POST /api/auth/validar-pin
Content-Type: application/json
```

**Body:**
```json
{
  "pin": "1234",
  "codigo_tienda": "TIEN-7A31",
  "forzar_cierre": false
}
```

**Respuesta exitosa - Sin sesión previa:**
```json
{
  "usuario": {
    "id": "user_id",
    "nombre": "Juan Pérez",
    "rol": "cajero"
  },
  "tienda": {
    "codigo": "TIEN-7A31",
    "nombre": "Tienda Principal"
  },
  "sesion_pausada": null,
  "tpvs_disponibles": [
    {
      "id": "tpv_uuid",
      "nombre": "Caja 1",
      "tienda_nombre": "Tienda Principal",
      "punto_emision": "001",
      "es_mi_caja": false
    }
  ]
}
```

**Respuesta con sesión pausada (tiene caja abierta):**
```json
{
  "usuario": {
    "id": "user_id",
    "nombre": "Juan Pérez",
    "rol": "cajero"
  },
  "tienda": {
    "codigo": "TIEN-7A31",
    "nombre": "Tienda Principal"
  },
  "sesion_pausada": {
    "tpv_id": "tpv_uuid",
    "tpv_nombre": "Caja 1",
    "monto_caja": 150.00,
    "fecha_pausa": "2026-01-30T10:00:00Z"
  },
  "tpvs_disponibles": []
}
```

**Error 409 - Sesión activa en otro dispositivo:**
```json
{
  "detail": {
    "code": "SESSION_ACTIVE",
    "message": "Este usuario ya tiene una sesión activa",
    "session_info": {
      "usuario_nombre": "Juan Pérez",
      "usuario_rol": "cajero",
      "tpv_id": "tpv_uuid",
      "tpv_nombre": "Caja 1",
      "dispositivo": "APK Android",
      "iniciada": "2026-01-30T08:00:00Z"
    }
  }
}
```

---

### 3. Login Completo con TPV

```http
POST /api/auth/login-pin
Content-Type: application/json
```

**Body:**
```json
{
  "pin": "1234",
  "codigo_tienda": "TIEN-7A31",
  "tpv_id": "tpv_uuid",
  "forzar_cierre": false,
  "dispositivo": "APK Android v1.0"
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "session_id": "session_uuid",
  "usuario": {
    "id": "user_id",
    "nombre": "Juan Pérez",
    "username": "juan",
    "rol": "cajero",
    "organizacion_id": "org_id",
    "tpv_id": "tpv_uuid",
    "tpv_nombre": "Caja 1"
  },
  "tienda": {
    "codigo": "TIEN-7A31",
    "nombre": "Tienda Principal"
  },
  "tpv": {
    "id": "tpv_uuid",
    "nombre": "Caja 1"
  }
}
```

**Errores (409):**
- `TPV_RESERVED`: TPV reservado por otro usuario con caja abierta
- `TPV_BUSY`: TPV en uso por otro usuario activo

---

### 4. Login Tradicional (Usuario/Contraseña)

```http
POST /api/login
Content-Type: application/json
```

**Body:**
```json
{
  "username": "propietario@email.com",
  "password": "mi_contraseña"
}
```

**Respuesta:**
```json
{
  "access_token": "jwt_token...",
  "token_type": "bearer",
  "user": {
    "id": "user_id",
    "nombre": "Oscar Castro",
    "email": "propietario@email.com",
    "rol": "propietario",
    "organizacion_id": "org_uuid"
  }
}
```

---

### 5. Verificar Sesión Activa

```http
GET /api/auth/verificar-sesion
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "valida": true,
  "session_id": "session_uuid",
  "usuario": {
    "id": "user_id",
    "nombre": "Juan Pérez",
    "rol": "cajero"
  },
  "tpv": {
    "id": "tpv_uuid",
    "nombre": "Caja 1"
  }
}
```

**⚠️ Si `valida: false`, cerrar sesión local inmediatamente.**

---

### 6. Cerrar Sesión

```http
POST /api/auth/logout-pos
Authorization: Bearer {token}
```

**Respuesta - Sin caja abierta:**
```json
{
  "message": "Sesión cerrada correctamente",
  "estado": "cerrada"
}
```

**Respuesta - Con caja abierta (sesión pausada):**
```json
{
  "message": "Sesión pausada - Tienes caja abierta",
  "estado": "pausada",
  "tpv_reservado": "tpv_uuid",
  "debe_cerrar_caja": true,
  "monto_caja": 150.00
}
```

---

### 7. Obtener Usuario Actual

```http
GET /api/me
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "id": "user_uuid",
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "username": "juan",
  "rol": "cajero",
  "organizacion_id": "org_uuid",
  "pin_activo": true,
  "permisos_pos": {
    "ver_productos": true,
    "agregar_ticket": true,
    "guardar_ticket": true,
    "recuperar_tickets_propios": true,
    "recuperar_tickets_otros": false,
    "cobrar": true,
    "facturar_electronico": false,
    "aplicar_descuentos": true,
    "eliminar_items": true,
    "anular_ventas": false,
    "abrir_caja": true,
    "cerrar_caja_propia": true,
    "cerrar_caja_otros": false,
    "dividir_ticket": true,
    "cambiar_precio": false
  },
  "permisos_backoffice": {
    "ver_dashboard": false,
    "ver_reportes": false,
    "gestionar_productos": false
  }
}
```

---

## 📟 Gestión de TPV

### Estados de TPV

| Estado | Descripción |
|--------|-------------|
| `disponible` | TPV libre para cualquier usuario |
| `ocupado` | TPV en uso por un usuario activo |
| `pausado` | TPV reservado (usuario salió sin cerrar caja) |

### Listar TPVs

```http
GET /api/tpv
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "tpv_uuid",
    "nombre": "Caja 1",
    "tienda_id": "tienda_uuid",
    "tienda_nombre": "Tienda Principal",
    "punto_emision": "001",
    "activo": true,
    "estado": "disponible",
    "usuario_actual_id": null,
    "usuario_actual_nombre": null
  }
]
```

### Listar TPVs Disponibles

```http
GET /api/tpv/disponibles
Authorization: Bearer {token}
```

### Estado de Sesiones por TPV (Solo Admin)

```http
GET /api/tpv/estado-sesiones
Authorization: Bearer {token_admin}
```

**Respuesta:**
```json
{
  "tpvs": [
    {
      "tpv_id": "tpv_uuid",
      "tpv_nombre": "Caja 1",
      "estado": "ocupado",
      "usuario": {
        "id": "user_uuid",
        "nombre": "Juan Pérez",
        "rol": "cajero"
      },
      "sesion": {
        "id": "session_uuid",
        "estado": "activa",
        "iniciada": "2026-02-13T08:00:00Z",
        "dispositivo": "APK Android"
      },
      "caja_abierta": true,
      "monto_caja": 250.00
    }
  ]
}
```

### Liberar TPV (Solo Admin)

```http
POST /api/tpv/{tpv_id}/liberar
Authorization: Bearer {token_admin}
```

---

## 💰 Gestión de Caja

### Obtener Caja Activa

```http
GET /api/caja/activa
Authorization: Bearer {token}
```

**Respuesta - Caja abierta:**
```json
{
  "caja_abierta": true,
  "caja": {
    "_id": "caja_uuid",
    "usuario_id": "user_uuid",
    "usuario_nombre": "Juan Pérez",
    "tpv_id": "tpv_uuid",
    "tpv_nombre": "Caja 1",
    "tienda_id": "tienda_uuid",
    "tienda_nombre": "Tienda Principal",
    "monto_inicial": 100.00,
    "monto_actual": 350.00,
    "monto_ventas": 250.00,
    "total_ventas": 5,
    "fecha_apertura": "2026-02-13T08:00:00Z",
    "estado": "abierta"
  }
}
```

**Respuesta - Sin caja:**
```json
{
  "caja_abierta": false,
  "caja": null
}
```

### Abrir Caja

```http
POST /api/caja/abrir
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "monto_inicial": 100.00
}
```

**Respuesta:**
```json
{
  "_id": "caja_uuid",
  "usuario_id": "user_uuid",
  "usuario_nombre": "Juan Pérez",
  "tpv_id": "tpv_uuid",
  "tpv_nombre": "Caja 1",
  "tienda_id": "tienda_uuid",
  "tienda_nombre": "Tienda Principal",
  "monto_inicial": 100.00,
  "monto_actual": 100.00,
  "monto_ventas": 0,
  "total_ventas": 0,
  "fecha_apertura": "2026-02-13T08:00:00Z",
  "estado": "abierta"
}
```

**Errores:**
- `400`: Ya tienes una caja abierta
- `400`: El TPV ya tiene una caja abierta por otro usuario

### Cerrar Caja

```http
POST /api/caja/cerrar
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "monto_contado": 345.50
}
```

**Respuesta:**
```json
{
  "_id": "caja_uuid",
  "usuario_id": "user_uuid",
  "usuario_nombre": "Juan Pérez",
  "monto_inicial": 100.00,
  "monto_ventas": 250.00,
  "monto_esperado": 350.00,
  "monto_contado": 345.50,
  "diferencia": -4.50,
  "fecha_apertura": "2026-02-13T08:00:00Z",
  "fecha_cierre": "2026-02-13T18:00:00Z",
  "estado": "cerrada",
  "ventas_por_metodo": [
    {
      "metodo_id": "met_uuid",
      "metodo_nombre": "Efectivo",
      "total": 150.00,
      "cantidad": 3
    },
    {
      "metodo_id": "met_uuid2",
      "metodo_nombre": "Tarjeta",
      "total": 100.00,
      "cantidad": 2
    }
  ]
}
```

### Historial de Cajas

```http
GET /api/caja/historial
Authorization: Bearer {token}
```

---

## 📦 Productos y Categorías

### Listar Productos

```http
GET /api/productos
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "prod_uuid",
    "nombre": "Hamburguesa Clásica",
    "descripcion": "Carne 150g, queso, lechuga, tomate",
    "precio": 8.50,
    "categoria_id": "cat_uuid",
    "categoria_nombre": "Platos Principales",
    "imagen_url": "/uploads/productos/hamburguesa.jpg",
    "codigo_barras": "7501234567890",
    "stock": 50,
    "activo": true,
    "impuesto_id": "imp_uuid",
    "impuesto_nombre": "IVA 15%",
    "impuesto_porcentaje": 15,
    "representacion": {
      "tipo": "color_forma",
      "color": "#FCA5A5",
      "forma": "cuadrado"
    }
  }
]
```

### Representación Visual del Producto en TPV

Cada producto puede tener una representación visual de dos tipos:

#### Opción 1: Color y Forma (sin imagen)

Cuando no quieres subir una imagen, puedes usar una combinación de color y forma geométrica:

**Colores disponibles:**
| Color | Código Hex |
|-------|------------|
| Blanco | `#F3F4F6` |
| Rosa claro | `#FCA5A5` |
| Rosa | `#F9A8D4` |
| Naranja | `#FDBA74` |
| Amarillo | `#FDE047` |
| Verde claro | `#BBF7D0` |
| Azul claro | `#93C5FD` |
| Lila | `#DDD6FE` |
| Morado | `#E879F9` |

**Formas disponibles:**
| Forma | Valor |
|-------|-------|
| Cuadrado | `cuadrado` |
| Círculo/Óvalo | `circulo` |
| Estrella | `estrella` |
| Hexágono | `hexagono` |

**Ejemplo de producto con color y forma:**
```json
{
  "id": "prod_uuid",
  "nombre": "Café Americano",
  "precio": 2.50,
  "imagen_url": null,
  "representacion": {
    "tipo": "color_forma",
    "color": "#FDBA74",
    "forma": "circulo"
  }
}
```

#### Opción 2: Imagen

Cuando subes una imagen del producto:

```json
{
  "id": "prod_uuid",
  "nombre": "Pastel de Chocolate",
  "precio": 15.00,
  "imagen_url": "/uploads/productos/pastel-chocolate.jpg",
  "representacion": {
    "tipo": "imagen",
    "color": null,
    "forma": null
  }
}
```

### Crear/Actualizar Producto

```http
POST /api/productos
Authorization: Bearer {token}
Content-Type: application/json
```

**Body con Color y Forma:**
```json
{
  "nombre": "Café Americano",
  "descripcion": "Café de grano molido",
  "precio": 2.50,
  "categoria_id": "cat_uuid",
  "impuesto_id": "imp_uuid",
  "codigo_barras": "",
  "stock": -1,
  "activo": true,
  "representacion_tipo": "color_forma",
  "representacion_color": "#FDBA74",
  "representacion_forma": "circulo"
}
```

**Body con Imagen:**
```json
{
  "nombre": "Pastel de Chocolate",
  "descripcion": "Delicioso pastel",
  "precio": 15.00,
  "categoria_id": "cat_uuid",
  "impuesto_id": "imp_uuid",
  "representacion_tipo": "imagen"
}
```
*(La imagen se sube por separado con multipart/form-data)*

### Renderizado en el TPV (APK)

```javascript
// Ejemplo de cómo renderizar el producto en el TPV
function renderProducto(producto) {
  if (producto.representacion?.tipo === 'imagen' && producto.imagen_url) {
    // Mostrar imagen
    return <Image source={{ uri: API_URL + producto.imagen_url }} />;
  } else {
    // Mostrar color y forma
    const color = producto.representacion?.color || '#F3F4F6';
    const forma = producto.representacion?.forma || 'cuadrado';
    
    return (
      <View style={{ 
        backgroundColor: color,
        borderRadius: forma === 'circulo' ? 50 : (forma === 'hexagono' ? 10 : 0),
        // Aplicar forma según el tipo
      }}>
        <Text>{producto.nombre}</Text>
      </View>
    );
  }
}
```

---

### Buscar Producto por Código de Barras

```http
GET /api/productos/barcode/{codigo}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "id": "prod_uuid",
  "nombre": "Coca Cola 500ml",
  "precio": 1.50,
  "categoria_id": "cat_uuid",
  "codigo_barras": "7501234567890"
}
```

**Error 404:** Producto no encontrado

### Listar Categorías

```http
GET /api/categorias
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "cat_uuid",
    "nombre": "Platos Principales",
    "color": "#3B82F6",
    "orden": 1
  },
  {
    "id": "cat_uuid2",
    "nombre": "Bebidas",
    "color": "#10B981",
    "orden": 2
  }
]
```

### Listar Modificadores

```http
GET /api/modificadores
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "mod_uuid",
    "nombre": "Extras",
    "tipo": "multiple",
    "obligatorio": false,
    "opciones": [
      {
        "nombre": "Queso extra",
        "precio_adicional": 1.00
      },
      {
        "nombre": "Tocino",
        "precio_adicional": 1.50
      }
    ],
    "categorias": ["cat_uuid"]
  }
]
```

### Listar Descuentos

```http
GET /api/descuentos
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "desc_uuid",
    "nombre": "10% Cumpleaños",
    "tipo": "porcentaje",
    "valor": 10,
    "activo": true
  },
  {
    "id": "desc_uuid2",
    "nombre": "$5 Descuento",
    "tipo": "monto",
    "valor": 5.00,
    "activo": true
  }
]
```

---

## 👥 Clientes

### Buscar Cliente por Cédula/RUC

```http
GET /api/clientes/buscar/{cedula}
Authorization: Bearer {token}
```

**Respuesta encontrado:**
```json
{
  "id": "cli_uuid",
  "nombre": "Juan Pérez",
  "cedula": "1234567890",
  "email": "juan@email.com",
  "telefono": "0991234567",
  "direccion": "Av. Principal 123",
  "tipo_identificacion": "cedula"
}
```

**Respuesta no encontrado (200):**
```json
{
  "message": "Cliente no encontrado"
}
```

### Buscar Cliente por ID

```http
GET /api/clientes/id/{cliente_id}
Authorization: Bearer {token}
```

### Listar Clientes

```http
GET /api/clientes
Authorization: Bearer {token}
```

### Crear Cliente

```http
POST /api/clientes
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "cedula": "1234567890",
  "email": "juan@email.com",
  "telefono": "0991234567",
  "direccion": "Av. Principal 123",
  "tipo_identificacion": "cedula"
}
```

**Tipos de identificación válidos:**
- `cedula` - Cédula de ciudadanía (10 dígitos)
- `ruc` - RUC (13 dígitos)
- `pasaporte` - Pasaporte

---

## 🧾 Ventas y Facturas

### Crear Factura/Venta

```http
POST /api/facturas
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "items": [
    {
      "producto_id": "prod_uuid",
      "nombre": "Hamburguesa Clásica",
      "cantidad": 2,
      "precio_unitario": 8.50,
      "impuesto_id": "imp_uuid",
      "impuesto_porcentaje": 15,
      "categoria_id": "cat_uuid",
      "notas": "Sin cebolla",
      "modificadores": [
        {
          "nombre": "Queso extra",
          "precio": 1.00
        }
      ]
    }
  ],
  "cliente_id": "cli_uuid",
  "metodo_pago_id": "met_uuid",
  "tipo_pedido_id": "tipo_uuid",
  "comentarios": "Mesa 5",
  "descuentos": [
    {
      "descuento_id": "desc_uuid",
      "nombre": "10% Cumpleaños",
      "tipo": "porcentaje",
      "valor": 10,
      "monto": 1.70
    }
  ],
  "mesero_id": "user_uuid",
  "mesero_nombre": "María López"
}
```

**Respuesta:**
```json
{
  "id": "fac_uuid",
  "numero": "001-001-000000123",
  "items": [...],
  "subtotal": 19.00,
  "descuento": 1.90,
  "total_impuestos": 2.57,
  "desglose_impuestos": [
    {
      "nombre": "IVA 15%",
      "porcentaje": 15,
      "base": 17.10,
      "valor": 2.57
    }
  ],
  "total": 19.67,
  "vendedor": "user_uuid",
  "vendedor_nombre": "Juan Pérez",
  "cliente_id": "cli_uuid",
  "cliente_nombre": "Cliente Demo",
  "metodo_pago_id": "met_uuid",
  "metodo_pago_nombre": "Efectivo",
  "fecha": "2026-02-13T12:30:00Z",
  "estado": "completado"
}
```

### Listar Facturas

```http
GET /api/facturas
Authorization: Bearer {token}
```

**Query params opcionales:**
- `fecha_inicio`: Fecha inicial (ISO)
- `fecha_fin`: Fecha final (ISO)
- `estado`: `completado`, `reembolsado`

### Reembolsar Factura

```http
POST /api/facturas/{factura_id}/reembolso
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "motivo": "Cliente no satisfecho con el producto"
}
```

---

## 🍽️ Tickets Abiertos (Mesas)

### Listar Tickets Abiertos

```http
GET /api/tickets-abiertos-pos
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "ticket_uuid",
    "numero": 15,
    "mesa": "Mesa 5",
    "items": [
      {
        "producto_id": "prod_uuid",
        "nombre": "Hamburguesa",
        "cantidad": 2,
        "precio_unitario": 8.50,
        "notas": "Sin cebolla",
        "categoria_id": "cat_uuid"
      }
    ],
    "subtotal": 17.00,
    "total": 19.55,
    "notas": "Cliente VIP",
    "creado": "2026-02-13T12:00:00Z",
    "actualizado": "2026-02-13T12:30:00Z",
    "mesero_id": "user_uuid",
    "mesero_nombre": "María López",
    "estado": "abierto",
    "puede_editar": true
  }
]
```

### Crear Ticket Abierto

```http
POST /api/tickets-abiertos-pos
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "mesa": "Mesa 5",
  "items": [
    {
      "producto_id": "prod_uuid",
      "nombre": "Hamburguesa",
      "cantidad": 2,
      "precio_unitario": 8.50,
      "impuesto_id": "imp_uuid",
      "impuesto_porcentaje": 15,
      "categoria_id": "cat_uuid",
      "notas": "Sin cebolla"
    }
  ],
  "notas": "Cliente VIP"
}
```

### Actualizar Ticket

```http
PUT /api/tickets-abiertos-pos/{ticket_id}
Authorization: Bearer {token}
Content-Type: application/json
```

### Eliminar Ticket

```http
DELETE /api/tickets-abiertos-pos/{ticket_id}
Authorization: Bearer {token}
```

---

## 🇪🇨 Facturación Electrónica Ecuador

### Arquitectura FE

```
┌─────────────────────────────────────────────────────────────────┐
│              FLUJO FACTURACIÓN ELECTRÓNICA SRI                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POS crea venta normal (POST /api/facturas)                  │
│     └── Se guarda en MongoDB con estado "completado"            │
│                                                                 │
│  2. Usuario solicita factura electrónica                        │
│     └── POST /api/facturas/{id}/emitir-fe                       │
│                                                                 │
│  3. Backend FE procesa:                                         │
│     ├── Genera clave de acceso (49 dígitos)                     │
│     ├── Genera XML según formato SRI                            │
│     ├── Firma XML con certificado .p12                          │
│     ├── Envía a SRI vía SOAP                                    │
│     └── Recibe autorización o rechazo                           │
│                                                                 │
│  4. Estados posibles:                                           │
│     ├── AUTORIZADO     ✅ Factura válida                        │
│     ├── NO_AUTORIZADO  ❌ Rechazada por SRI                     │
│     ├── EN_PROCESO     ⏳ SRI procesando                        │
│     ├── ERROR          🔴 Error técnico                         │
│     └── PENDIENTE      ⚪ Sin enviar                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Emitir Factura Electrónica

```http
POST /api/facturas/{factura_id}/emitir-fe
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "documento": {
    "document_id": "doc_uuid",
    "doc_number": "001-001-000000123",
    "access_key": "1302202601179012345600110010010000001230000001234",
    "sri_status": "AUTORIZADO",
    "sri_authorization_number": "1302202612345678901234567890123456789012345678",
    "sri_messages": []
  }
}
```

**Errores comunes:**
- `400`: Configuración del emisor no encontrada
- `400`: Certificado no configurado o expirado
- `400`: Cliente es Consumidor Final (no se puede crear NC)

### Consultar Estado FE

```http
GET /api/facturas/{factura_id}/fe-status
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "tiene_fe": true,
  "estado": "AUTORIZADO",
  "numero_autorizacion": "1302202612345678901234567890123456789012345678",
  "fecha_autorizacion": "2026-02-13T12:35:00Z",
  "clave_acceso": "1302202601179012345600110010010000001230000001234"
}
```

### Endpoints de Facturación Electrónica (Backend FE)

#### Crear Factura Electrónica Directa

```http
POST /api/fe/documents/invoice
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "store_code": "001",
  "emission_point": "001",
  "customer": {
    "identification_type": "04",
    "identification": "1234567890",
    "name": "Juan Pérez",
    "email": "juan@email.com",
    "phone": "0991234567",
    "address": "Av. Principal 123"
  },
  "items": [
    {
      "code": "PROD001",
      "auxiliary_code": "PROD001",
      "description": "Hamburguesa Clásica",
      "quantity": 2,
      "unit_price": 8.50,
      "discount": 0,
      "iva_rate": 15
    }
  ],
  "payments": [
    {
      "method": "01",
      "total": 19.55,
      "term": 0,
      "time_unit": "dias"
    }
  ]
}
```

**Tipos de identificación SRI:**
- `04` - RUC
- `05` - Cédula
- `06` - Pasaporte
- `07` - Consumidor Final

**Métodos de pago SRI:**
- `01` - Sin utilización del sistema financiero (Efectivo)
- `15` - Compensación de deudas
- `16` - Tarjeta de débito
- `17` - Dinero electrónico
- `18` - Tarjeta prepago
- `19` - Tarjeta de crédito
- `20` - Otros con utilización sistema financiero

#### Crear Nota de Crédito

```http
POST /api/fe/documents/credit-note
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "invoice_id": "doc_uuid_factura_original",
  "reason": "Devolución de producto defectuoso",
  "items": [
    {
      "code": "PROD001",
      "description": "Hamburguesa Clásica",
      "quantity": 1,
      "unit_price": 8.50,
      "discount": 0,
      "iva_rate": 15
    }
  ]
}
```

**⚠️ Restricciones:**
- Solo se pueden crear NC de facturas AUTORIZADAS
- NO se pueden crear NC para "Consumidor Final" (9999999999999)
- Una factura solo puede tener una NC

#### Listar Documentos Electrónicos

```http
GET /api/fe/documents
Authorization: Bearer {token}
```

**Query params:**
- `page`: Número de página
- `limit`: Items por página
- `status`: `AUTORIZADO`, `NO_AUTORIZADO`, `PENDIENTE`, `ERROR`
- `doc_type`: `01` (Factura), `04` (Nota de Crédito)

#### Descargar XML

```http
GET /api/fe/documents/{document_id}/xml
Authorization: Bearer {token}
```

#### Descargar PDF (RIDE)

```http
GET /api/fe/documents/{document_id}/pdf
Authorization: Bearer {token}
```

#### Reenviar Documento al SRI

```http
POST /api/fe/documents/{document_id}/resend
Authorization: Bearer {token}
```

#### Sincronizar Documentos Pendientes

```http
POST /api/fe/documents/sync-pending
Authorization: Bearer {token}
```

---

## 🖨️ Impresoras de Cocina

### Arquitectura de Impresión

```
┌─────────────────────────────────────────────────────────────────┐
│                ARQUITECTURA DE IMPRESIÓN                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐         ┌──────────────┐                    │
│   │  Backend     │ ◄────── │  APK/QZ Tray │                    │
│   │  (Nube)      │ polling │  (Local)     │                    │
│   └──────────────┘         └──────┬───────┘                    │
│         │                         │                             │
│         │ Guarda órdenes          │ Envía a impresora          │
│         ▼                         ▼                             │
│   ┌──────────────┐         ┌──────────────┐                    │
│   │  MongoDB     │         │  Impresora   │                    │
│   │  (Nube)      │         │  Térmica     │                    │
│   └──────────────┘         │  (IP/USB)    │                    │
│                            └──────────────┘                    │
│                                                                 │
│  La configuración de IP/Puerto se hace EN LA APK LOCAL         │
│  NO se guarda en el servidor web                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Verificar si Impresoras de Cocina están Activas

```http
GET /api/funciones
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "cierres_caja": true,
  "tickets_abiertos": false,
  "tipo_pedido": false,
  "venta_con_stock": true,
  "funcion_reloj": false,
  "impresoras_cocina": true,
  "pantalla_clientes": false,
  "mesas_por_mesero": false,
  "facturacion_electronica": false,
  "tickets_abiertos_count": 0
}
```

**⚠️ Si `impresoras_cocina` es `false`, no mostrar funcionalidad de impresión.**

### Obtener Grupos de Impresora

```http
GET /api/grupos-impresora
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "grupo_uuid",
    "nombre": "Cocina Principal",
    "categorias": ["cat_uuid_1", "cat_uuid_2"],
    "categorias_nombres": ["Platos Principales", "Entradas"],
    "organizacion_id": "org_uuid",
    "creado": "2026-02-11T04:27:12Z"
  },
  {
    "id": "grupo_uuid_2",
    "nombre": "Bar",
    "categorias": ["cat_uuid_bebidas"],
    "categorias_nombres": ["Bebidas"],
    "organizacion_id": "org_uuid",
    "creado": "2026-02-11T05:00:00Z"
  }
]
```

### Consultar Órdenes Pendientes de Impresión (POLLING)

```http
GET /api/impresion/ordenes-pendientes
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "grupos": [
    {
      "grupo_id": "grupo_uuid",
      "grupo_nombre": "Cocina Principal",
      "ordenes": [
        {
          "ticket_id": "ticket_uuid",
          "numero": 123,
          "mesa": "Mesa 5",
          "mesero": "María López",
          "cajero": "Juan Pérez",
          "notas": "Cliente VIP",
          "creado": "2026-02-13T12:30:00Z",
          "tipo": "ticket_abierto",
          "items": [
            {
              "producto_id": "prod_uuid",
              "nombre": "Hamburguesa Clásica",
              "cantidad": 2,
              "notas": "Sin cebolla",
              "modificadores": []
            }
          ]
        }
      ]
    }
  ],
  "timestamp": "2026-02-13T12:30:05Z"
}
```

**Frecuencia de polling recomendada:** Cada 3-5 segundos

### Marcar Orden como Impresa

```http
POST /api/impresion/marcar-impresa/{ticket_id}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "message": "Orden marcada como impresa",
  "ticket_id": "ticket_uuid"
}
```

### Formato de Ticket de Cocina

```
================================
  *** COCINA PRINCIPAL ***
================================

Mesa: Mesa 5
Mesero: María López
Cajero: Juan Pérez
Hora: 12:30

--------------------------------
2x Hamburguesa Clásica
   >> Sin cebolla
1x Papas Fritas
--------------------------------

#001-001-000000123




```

---

## 💳 Planes y Suscripciones

### Planes Disponibles

| Plan | Precio | Facturas/mes | Usuarios | Productos | TPV | Clientes |
|------|--------|--------------|----------|-----------|-----|----------|
| **Gratis** | $0 | 50 | 1 | 50 | 1 | 20 |
| **Básico** | $15 | 300 | 3 | 200 | 2 | 100 |
| **Pro** | $35 | ∞ | 10 | ∞ | 5 | ∞ |
| **Enterprise** | $75 | ∞ | ∞ | ∞ | ∞ | ∞ |

### Funciones por Plan

| Función | Gratis | Básico | Pro | Enterprise |
|---------|--------|--------|-----|------------|
| Facturación Electrónica | ❌ | ❌ | ✅ | ✅ |
| Reportes Avanzados | ❌ | ✅ | ✅ | ✅ |
| Tickets Abiertos | ❌ | ❌ | ✅ | ✅ |
| Multi-Tienda | ❌ | ❌ | ✅ | ✅ |
| Logo en Ticket | ❌ | ✅ | ✅ | ✅ |
| Exportar Excel | ❌ | ❌ | ✅ | ✅ |
| Impresoras Cocina | ❌ | ❌ | ✅ | ✅ |

### Obtener Plan Actual

```http
GET /api/mi-plan
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "plan": {
    "id": "plan_uuid",
    "nombre": "Pro",
    "precio": 35.00,
    "moneda": "USD",
    "periodo": "mensual",
    "limite_facturas": null,
    "limite_usuarios": 10,
    "limite_productos": null,
    "limite_tpv": 5,
    "limite_clientes": null,
    "funciones": {
      "facturacion_electronica": true,
      "reportes_avanzados": true,
      "tickets_abiertos": true,
      "multi_tienda": true,
      "logo_ticket": true,
      "exportar_excel": true,
      "impresoras_cocina": true
    }
  },
  "uso": {
    "facturas": 45,
    "usuarios": 3,
    "productos": 120,
    "tpv": 2,
    "clientes": 85
  },
  "suscripcion": {
    "status": "active",
    "fecha_inicio": "2026-01-01T00:00:00Z",
    "fecha_fin": "2026-02-01T00:00:00Z",
    "auto_renovacion": true
  }
}
```

### Verificar Límite Específico

```http
GET /api/verificar-limite/{recurso}
Authorization: Bearer {token}
```

**Recursos válidos:** `facturas`, `usuarios`, `productos`, `tpv`, `clientes`

**Respuesta:**
```json
{
  "puede_crear": true,
  "uso_actual": 45,
  "limite": null,
  "mensaje": null
}
```

**Respuesta límite alcanzado:**
```json
{
  "puede_crear": false,
  "uso_actual": 50,
  "limite": 50,
  "mensaje": "Has alcanzado el límite de productos (50/50) de tu plan Gratis"
}
```

---

## 📜 Políticas y Reglas de Negocio

### Autenticación y Sesiones

| Regla | Descripción |
|-------|-------------|
| **Un usuario = Un TPV** | Cada usuario solo puede estar en un TPV a la vez |
| **Un TPV = Un usuario** | Cada TPV solo puede tener un usuario activo |
| **Caja abierta = TPV reservado** | Si sales sin cerrar caja, el TPV queda reservado para ti |
| **Solo el mismo usuario puede volver** | Un TPV pausado solo acepta al usuario que dejó la caja abierta |
| **Admin puede liberar TPVs** | El propietario puede forzar el cierre de un TPV ocupado |

### Roles y Permisos

| Rol | Descripción | Permisos Típicos |
|-----|-------------|------------------|
| **Propietario** | Dueño del negocio | Todos los permisos |
| **Administrador** | Gestiona el negocio | Casi todos excepto facturación SRI |
| **Cajero** | Opera el POS | Vender, abrir/cerrar caja, cobrar |
| **Mesero** | Toma pedidos | Agregar items, guardar tickets, ver productos |
| **Supervisor** | Supervisa operaciones | Ver reportes, cerrar cajas de otros |
| **Cocinero** | Prepara pedidos | Solo ver órdenes de cocina |

### Numeración de Facturas

```
001 - 001 - 000000123
 │     │       │
 │     │       └── Secuencial (9 dígitos, se incrementa)
 │     └────────── Punto de emisión (TPV)
 └──────────────── Código de establecimiento (Tienda)
```

### Reglas de Facturación Electrónica

1. **Configuración requerida:**
   - Datos del emisor (RUC, razón social, dirección)
   - Configuración fiscal (ambiente, obligado contabilidad)
   - Certificado digital .p12 vigente

2. **Ambientes SRI:**
   - `pruebas`: Para testing (no tiene validez legal)
   - `produccion`: Facturas reales con validez legal

3. **Restricciones Notas de Crédito:**
   - Solo para facturas AUTORIZADAS
   - NO para Consumidor Final (9999999999999)
   - Una factura = máximo una NC

### Reglas de Impresión de Cocina

1. **Activación:** Debe estar habilitada en Configuración → Funciones
2. **Grupos:** Cada grupo tiene categorías de productos asignadas
3. **Destino:** Los items se imprimen según su categoría → grupo → impresora
4. **Configuración local:** IP y puerto se configuran en la APK, no en el servidor

---

## ❌ Códigos de Error

### Errores de Autenticación (401, 403)

| Código | Mensaje | Acción |
|--------|---------|--------|
| `401` | Token inválido o expirado | Reloguear |
| `403` | No tienes permiso | Verificar rol/permisos |

### Errores de Sesión (409)

| Code | Mensaje | Acción |
|------|---------|--------|
| `SESSION_ACTIVE` | Usuario tiene sesión activa en otro dispositivo | Mostrar info de sesión, ofrecer forzar cierre |
| `TPV_RESERVED` | TPV reservado por otro usuario | Seleccionar otro TPV |
| `TPV_BUSY` | TPV en uso | Seleccionar otro TPV |

### Errores de Límite de Plan (400)

```json
{
  "detail": {
    "code": "PLAN_LIMIT",
    "message": "Has alcanzado el límite de productos (50/50) de tu plan Gratis. Actualiza tu plan para continuar."
  }
}
```

### Errores de Facturación Electrónica (400, 500)

| Mensaje | Causa | Solución |
|---------|-------|----------|
| Configuración del emisor no encontrada | Datos de empresa incompletos | Completar en Configuración FE |
| Certificado no configurado | Sin certificado .p12 | Subir certificado |
| Certificado expirado | Certificado vencido | Renovar certificado |
| Error al firmar | Contraseña incorrecta | Verificar contraseña del .p12 |
| NO se permite NC para Consumidor Final | Restricción SRI | No crear NC para 9999999999999 |

---

## 💻 Ejemplos de Implementación

### Servicio de Autenticación (React Native/JavaScript)

```javascript
class AuthService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.token = null;
    this.sessionId = null;
    this.tpv = null;
  }

  // Paso 1: Verificar código de tienda
  async verificarTienda(codigo) {
    const response = await fetch(`${this.apiUrl}/api/tienda/verificar/${codigo}`);
    if (!response.ok) throw new Error('Tienda no encontrada');
    return await response.json();
  }

  // Paso 2: Validar PIN
  async validarPin(pin, codigoTienda) {
    const response = await fetch(`${this.apiUrl}/api/auth/validar-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, codigo_tienda: codigoTienda })
    });
    
    if (response.status === 409) {
      const error = await response.json();
      throw { code: error.detail.code, info: error.detail };
    }
    
    return await response.json();
  }

  // Paso 3: Login completo
  async login(pin, codigoTienda, tpvId, dispositivo = 'APK') {
    const response = await fetch(`${this.apiUrl}/api/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin,
        codigo_tienda: codigoTienda,
        tpv_id: tpvId,
        dispositivo
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw error;
    }
    
    const data = await response.json();
    this.token = data.access_token;
    this.sessionId = data.session_id;
    this.tpv = data.tpv;
    
    // Guardar en storage
    await this.saveCredentials();
    
    return data;
  }

  // Verificar sesión activa
  async verificarSesion() {
    const response = await fetch(`${this.apiUrl}/api/auth/verificar-sesion`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    const data = await response.json();
    
    if (!data.valida) {
      await this.clearCredentials();
    }
    
    return data;
  }

  // Logout
  async logout() {
    await fetch(`${this.apiUrl}/api/auth/logout-pos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    await this.clearCredentials();
  }

  async saveCredentials() {
    // Implementar según plataforma (AsyncStorage, SecureStore, etc.)
  }

  async clearCredentials() {
    this.token = null;
    this.sessionId = null;
    this.tpv = null;
  }
}
```

### Servicio de Impresión de Cocina

```javascript
class KitchenPrintService {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.printerConfigs = {}; // { grupoId: { ip, port } }
    this.pollingInterval = null;
  }

  // Verificar si impresoras activas
  async isEnabled() {
    const response = await fetch(`${this.apiUrl}/api/funciones`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    const data = await response.json();
    return data.impresoras_cocina === true;
  }

  // Obtener grupos de impresora
  async getGroups() {
    const response = await fetch(`${this.apiUrl}/api/grupos-impresora`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  // Configurar impresora para un grupo
  setGroupPrinter(grupoId, ip, port) {
    this.printerConfigs[grupoId] = { ip, port };
    // Guardar en storage local
  }

  // Obtener órdenes pendientes
  async getPendingOrders() {
    const response = await fetch(`${this.apiUrl}/api/impresion/ordenes-pendientes`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  // Marcar como impresa
  async markAsPrinted(ticketId) {
    await fetch(`${this.apiUrl}/api/impresion/marcar-impresa/${ticketId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
  }

  // Formatear ticket
  formatTicket(grupoNombre, orden) {
    let text = '\n================================\n';
    text += `  *** ${grupoNombre.toUpperCase()} ***\n`;
    text += '================================\n\n';
    
    if (orden.mesa) text += `Mesa: ${orden.mesa}\n`;
    if (orden.mesero) text += `Mesero: ${orden.mesero}\n`;
    if (orden.cajero) text += `Cajero: ${orden.cajero}\n`;
    if (!orden.mesero && !orden.cajero) text += `Creado por: Sistema\n`;
    
    text += `Hora: ${new Date(orden.creado).toLocaleTimeString()}\n`;
    if (orden.notas) text += `Notas: ${orden.notas}\n`;
    text += '--------------------------------\n';
    
    for (const item of orden.items) {
      text += `${item.cantidad}x ${item.nombre}\n`;
      if (item.notas) text += `   >> ${item.notas}\n`;
    }
    
    text += '--------------------------------\n';
    text += `#${orden.numero || orden.ticket_id.slice(-8)}\n`;
    text += '\n\n\n\n';
    
    return text;
  }

  // Enviar a impresora (implementar según SDK de impresora)
  async printToThermal(ip, port, content) {
    // Implementar según librería de impresión
    // Ej: react-native-thermal-printer, escpos, etc.
    console.log(`Imprimiendo en ${ip}:${port}:`, content);
  }

  // Procesar un grupo
  async processGroup(grupo) {
    const config = this.printerConfigs[grupo.grupo_id];
    if (!config) {
      console.warn(`Sin impresora para ${grupo.grupo_nombre}`);
      return;
    }

    for (const orden of grupo.ordenes || []) {
      try {
        const ticket = this.formatTicket(grupo.grupo_nombre, orden);
        await this.printToThermal(config.ip, config.port, ticket);
        await this.markAsPrinted(orden.ticket_id);
        console.log(`✅ Impreso: ${orden.ticket_id}`);
      } catch (error) {
        console.error(`❌ Error imprimiendo ${orden.ticket_id}:`, error);
      }
    }
  }

  // Iniciar polling
  startPolling(intervalMs = 3000) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        const { grupos } = await this.getPendingOrders();
        for (const grupo of grupos || []) {
          if (grupo.ordenes?.length > 0) {
            await this.processGroup(grupo);
          }
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, intervalMs);

    console.log(`▶️ Polling iniciado cada ${intervalMs}ms`);
  }

  // Detener polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('⏹️ Polling detenido');
  }
}
```

### Servicio de Ventas

```javascript
class SalesService {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  // Crear venta/factura
  async createSale(items, clienteId, metodoPagoId, options = {}) {
    const body = {
      items: items.map(item => ({
        producto_id: item.id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        impuesto_id: item.impuesto_id,
        impuesto_porcentaje: item.impuesto_porcentaje,
        categoria_id: item.categoria_id,
        notas: item.notas || '',
        modificadores: item.modificadores || []
      })),
      cliente_id: clienteId,
      metodo_pago_id: metodoPagoId,
      tipo_pedido_id: options.tipoPedidoId,
      comentarios: options.comentarios,
      descuentos: options.descuentos || [],
      mesero_id: options.meseroId,
      mesero_nombre: options.meseroNombre
    };

    const response = await fetch(`${this.apiUrl}/api/facturas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return await response.json();
  }

  // Emitir factura electrónica
  async emitirFE(facturaId) {
    const response = await fetch(`${this.apiUrl}/api/facturas/${facturaId}/emitir-fe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return await response.json();
  }
}
```

---

## 📝 Notas Importantes para Desarrolladores APK

1. **Token de autenticación:** Usar `access_token` del login, NO `token`

2. **Session ID:** Guardar `session_id` para verificar si la sesión sigue activa

3. **TPV asignado:** El TPV viene asignado en el login, no pedir al abrir caja

4. **Manejar 409:** Mostrar diálogo de conflicto y ofrecer opciones

5. **Verificación periódica:** Llamar `/api/auth/verificar-sesion` cada 5 minutos

6. **Logout automático:** Si `valida: false`, cerrar sesión local inmediatamente

7. **Polling de impresión:** Solo si `impresoras_cocina: true`

8. **Configuración local:** IPs de impresoras se guardan en la APK

9. **Reconexión:** Si polling falla, reintentar con backoff exponencial

10. **Offline:** Considerar caché local para productos, categorías, etc.

---

## 📞 Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 13 Feb 2026 | 2.0 | Documentación completa para APK con FE |
| 12 Feb 2026 | 1.5 | Añadidos campos cajero/mesero en impresión |
| 11 Feb 2026 | 1.0 | Documento inicial |
