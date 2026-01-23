# DOCUMENTACIÓN COMPLETA - SISTEMA POS

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Autenticación y Acceso](#autenticación-y-acceso)
3. [Configuración Google OAuth (Despliegue)](#configuración-google-oauth-despliegue)
4. [Flujo de TPV y Cajas](#flujo-de-tpv-y-cajas)
5. [Pantalla Principal del POS](#pantalla-principal-del-pos)
6. [Gestión del Carrito/Ticket](#gestión-del-carritoticket)
7. [Sistema de Mesas](#sistema-de-mesas)
8. [Proceso de Cobro](#proceso-de-cobro)
9. [Clientes](#clientes)
10. [Descuentos](#descuentos)
11. [Impuestos](#impuestos)
12. [Animaciones y UX](#animaciones-y-ux)
13. [Diseño Responsive](#diseño-responsive)
14. [Roles y Permisos](#roles-y-permisos)
15. [API Endpoints](#api-endpoints)
16. [Modelos de Datos](#modelos-de-datos)
17. [Variables de Entorno](#variables-de-entorno)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        SISTEMA POS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   FRONTEND   │◄──►│   BACKEND    │◄──►│   MONGODB    │       │
│  │   (React)    │    │  (FastAPI)   │    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  Tecnologías:                                                    │
│  - React + TailwindCSS + Shadcn/UI                              │
│  - FastAPI (Python)                                              │
│  - MongoDB (Motor async)                                         │
│  - JWT para autenticación                                        │
│  - Google OAuth 2.0                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Arquitectura de Despliegue (Producción)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCCIÓN                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │ www.posahora.com │ ──────► │ posahora.onrender│              │
│  │   (Frontend)     │         │     .com         │              │
│  │   Netlify/Vercel │         │   (Backend)      │              │
│  └──────────────────┘         └────────┬─────────┘              │
│                                        │                         │
│                                        ▼                         │
│                               ┌──────────────────┐              │
│                               │    MongoDB       │              │
│                               │    Atlas         │              │
│                               └──────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Iconografía

Se utilizan **iconos simples** de la librería `lucide-react`. **NO se usan emojis ni gráficos complejos** en la interfaz.

| Acción/Elemento | Icono Lucide | Uso |
|-----------------|--------------|-----|
| Menú hamburguesa | `Menu` | Abrir sidebar de navegación |
| Punto de Venta | `ShoppingCart` | Navegación al POS |
| Recibos | `FileText` | Historial de ventas |
| Caja | `Wallet` | Gestión de caja |
| Backoffice | `Briefcase` | Acceso administrativo |
| Cliente | `UserPlus` | Seleccionar/añadir cliente |
| Opciones | `MoreVertical` | Menú de opciones (3 puntos) |
| Cerrar | `X` | Cerrar diálogos/paneles |
| Eliminar | `Trash2` | Eliminar items |
| Buscar | `Search` | Buscar productos |
| Escanear | `ScanLine` | Escáner de código de barras |
| Cerrar sesión | `LogOut` | Salir del sistema |

---

## Autenticación y Acceso

### Login por PIN (Recomendado para empleados)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PANTALLA LOGIN POS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                     ┌─────────────────┐                          │
│                     │   LOGO EMPRESA  │                          │
│                     └─────────────────┘                          │
│                                                                  │
│  PASO 1: Código de Tienda                                        │
│  ┌─────────────────────────────────────────────┐                 │
│  │  Código de tienda: [____________] [✓]       │                 │
│  │                                             │                 │
│  │  Ejemplo: 1RAT-1017                         │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  → El código se guarda en localStorage                           │
│  → No se pide de nuevo en próximos accesos                       │
│  → Botón "Cambiar" para usar otro código                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASO 2: Ingreso de PIN                                          │
│  ┌─────────────────────────────────────────────┐                 │
│  │                                             │                 │
│  │    Tienda: "Tienda Principal"               │                 │
│  │    Org: "Mi Restaurante • 1RAT-1017"        │                 │
│  │                                   [Cambiar] │                 │
│  │                                             │                 │
│  │         ● ● ● ○ ○ ○  (PIN ingresado)       │                 │
│  │                                             │                 │
│  │    ┌─────┬─────┬─────┐                      │                 │
│  │    │  1  │  2  │  3  │                      │                 │
│  │    ├─────┼─────┼─────┤                      │                 │
│  │    │  4  │  5  │  6  │                      │                 │
│  │    ├─────┼─────┼─────┤                      │                 │
│  │    │  7  │  8  │  9  │                      │                 │
│  │    ├─────┼─────┼─────┤                      │                 │
│  │    │  ⌫  │  0  │  ↵  │                      │                 │
│  │    └─────┴─────┴─────┘                      │                 │
│  │                                             │                 │
│  │    [      INGRESAR      ]                   │                 │
│  │                                             │                 │
│  │    ─────── o ───────                        │                 │
│  │    [Acceder con Usuario]                    │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Autenticación

```
Usuario ingresa código → Valida en /api/tienda/verificar/{codigo}
                              ↓
                    ¿Código válido?
                    /            \
                  SÍ              NO
                  ↓               ↓
          Guardar en         Mostrar error
          localStorage       "Código no válido"
                  ↓
          Mostrar teclado PIN
                  ↓
          Usuario ingresa PIN
                  ↓
          POST /api/auth/login-pin
          {codigo_tienda, pin}
                  ↓
          Recibe JWT token
                  ↓
          Guardar token + user en localStorage
                  ↓
          Redirigir a /pos
```

---

## Configuración Google OAuth (Despliegue)

### Flujo de Autenticación con Google

```
┌─────────────────────────────────────────────────────────────────┐
│                  GOOGLE OAUTH 2.0 FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario click "Continuar con Google"                        │
│                      │                                           │
│                      ▼                                           │
│  2. Frontend redirige a Google:                                 │
│     accounts.google.com/o/oauth2/v2/auth                        │
│     ?client_id=XXXXXX                                           │
│     &redirect_uri=https://www.posahora.com/auth/google/callback │
│     &response_type=code                                         │
│     &scope=email profile                                        │
│                      │                                           │
│                      ▼                                           │
│  3. Usuario autentica en Google                                 │
│                      │                                           │
│                      ▼                                           │
│  4. Google redirige con código:                                 │
│     www.posahora.com/auth/google/callback?code=XXXX             │
│                      │                                           │
│                      ▼                                           │
│  5. Frontend envia código al Backend:                           │
│     POST posahora.onrender.com/api/auth/google                  │
│     {code: "XXXX"}                                              │
│                      │                                           │
│                      ▼                                           │
│  6. Backend intercambia código con Google                       │
│     (usa client_secret en el servidor)                          │
│                      │                                           │
│                      ▼                                           │
│  7. ¿Usuario existe?                                            │
│         │                                                        │
│     ┌───┴───┐                                                   │
│     │       │                                                    │
│     SÍ      NO                                                   │
│     │       │                                                    │
│     ▼       ▼                                                    │
│   Login   Mostrar formulario                                    │
│   auto    de registro                                           │
│     │       │                                                    │
│     └───┬───┘                                                   │
│         │                                                        │
│         ▼                                                        │
│  8. Usuario en /dashboard                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ir a: https://console.cloud.google.com/
2. Crear nuevo proyecto o usar uno existente
3. Ir a "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Tipo de aplicación: "Web application"

### Paso 2: Configurar URLs Autorizadas

En Google Cloud Console → Credentials → Tu OAuth Client:

**Authorized JavaScript origins:**
```
https://posahora.com
https://www.posahora.com
```

**Authorized redirect URIs:**
```
https://www.posahora.com/auth/google/callback
```

### Paso 3: Obtener Credenciales

Guardar estos valores (se mostrarán solo una vez):
- `GOOGLE_CLIENT_ID` = `XXXXX.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET` = `GOCSPX-XXXXX`

### Paso 4: Variables de Entorno

**Backend (Render - posahora.onrender.com):**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `MONGO_URL` | `mongodb+srv://...` | Conexión a MongoDB Atlas |
| `DB_NAME` | `facturacion_db` | Nombre de la base de datos |
| `SECRET_KEY` | `tu-clave-secreta-segura` | Clave para JWT (cambiar en producción) |
| `CORS_ORIGINS` | `https://www.posahora.com,https://posahora.com` | Dominios permitidos |
| `GOOGLE_CLIENT_ID` | `530102316862-...` | Client ID de Google |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Client Secret de Google |
| `GOOGLE_REDIRECT_URI` | `https://www.posahora.com/auth/google/callback` | URI de redirección |

**Frontend (Netlify/Vercel - www.posahora.com):**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `REACT_APP_BACKEND_URL` | `https://posahora.onrender.com` | URL del backend |
| `REACT_APP_GOOGLE_CLIENT_ID` | `530102316862-...` | Client ID de Google (público) |

### Archivos Involucrados

| Archivo | Función |
|---------|---------|
| `backend/server.py` | Endpoint `POST /api/auth/google` |
| `frontend/src/pages/Login.js` | Botón "Continuar con Google" |
| `frontend/src/pages/Register.js` | Botón "Registrarse con Google" |
| `frontend/src/pages/GoogleCallback.js` | Maneja callback de Google |
| `frontend/src/App.js` | Ruta `/auth/google/callback` |

### Formulario de Registro (Usuarios Nuevos)

Cuando un usuario nuevo se autentica con Google, se muestra:

```
┌─────────────────────────────────────────────┐
│                                             │
│        [Foto de perfil de Google]           │
│                                             │
│           ¡Bienvenido!                      │
│           Juan Pérez                        │
│           juan@gmail.com                    │
│                                             │
│  Para completar tu registro, ingresa       │
│  el nombre de tu negocio y una contraseña  │
│                                             │
│  Nombre del Negocio: [________________]     │
│                                             │
│  Contraseña: [________________]             │
│  (Mínimo 6 caracteres)                      │
│                                             │
│  Confirmar Contraseña: [________________]   │
│                                             │
│  [        Crear Cuenta        ]             │
│                                             │
│  Cancelar y volver al inicio                │
│                                             │
└─────────────────────────────────────────────┘
```

### Notas Importantes

1. **El `GOOGLE_CLIENT_SECRET` NUNCA debe exponerse en el frontend**
   - Solo se usa en el backend para intercambiar el código por tokens

2. **La URI de redirección debe coincidir exactamente**
   - Si en Google Cloud está `https://www.posahora.com/auth/google/callback`
   - El frontend debe redirigir a exactamente esa URL

3. **El código de autorización es de un solo uso**
   - Google invalida el código después de usarlo una vez
   - Si falla, el usuario debe volver a autenticarse

4. **Verificar dominio en Google Search Console (opcional pero recomendado)**
   - Ayuda a mostrar el nombre de la app en lugar de solo el dominio

---

## Flujo de TPV y Cajas

### Conceptos Clave

| Concepto | Descripción |
|----------|-------------|
| **Organización** | La empresa/negocio (ej: "Mi Restaurante") |
| **Tienda** | Sucursal física con `codigo_establecimiento` (ej: 001) |
| **TPV** | Terminal Punto de Venta con `punto_emision` (ej: 001, 002) |
| **Caja** | Sesión de trabajo de un usuario en un TPV |

### Numeración de Facturas (Formato SRI Ecuador)

```
   001    -    002    -    000000015
    │          │              │
    │          │              └── Secuencial (9 dígitos)
    │          │
    │          └── Punto de Emisión (del TPV)
    │
    └── Código Establecimiento (de la Tienda)
```

### Flujo de Apertura de Caja

```
┌─────────────────────────────────────────────────────────────────┐
│                    ABRIR CAJA                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Usuario accede al POS                                           │
│              ↓                                                   │
│  ¿Tiene caja abierta?                                           │
│       /          \                                               │
│     SÍ            NO                                             │
│      ↓             ↓                                             │
│  Usar caja     Mostrar diálogo                                   │
│  existente     "Abrir Caja"                                      │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────┐                 │
│  │                                             │                 │
│  │      ABRIR CAJA PARA VENDER                 │                 │
│  │                                             │                 │
│  │  TPV: [Dropdown de TPVs disponibles  ▼]     │                 │
│  │       - Caja 1 (libre)                      │                 │
│  │       - Caja 2 (libre)                      │                 │
│  │       - Caja 3 (ocupada) ← deshabilitada    │                 │
│  │                                             │                 │
│  │  Monto inicial: [$________]                 │                 │
│  │                                             │                 │
│  │  [Cancelar]    [Abrir Caja y Comenzar]      │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│                    │                                             │
│                    ▼                                             │
│  POST /api/tpv/abrir-caja                                       │
│  {tpv_id, monto_inicial}                                        │
│                    │                                             │
│                    ▼                                             │
│  Backend:                                                        │
│  1. ¿Se proporcionó TPV?                                        │
│     - SÍ: Usar ese TPV, marcarlo como ocupado                   │
│     - NO: Buscar TPV disponible                                 │
│                                                                  │
│  2. ¿Hay TPVs en la organización?                               │
│     - NO (primera vez): Crear "Caja 1" automáticamente          │
│     - SÍ: ¿Hay alguno libre?                                    │
│           - SÍ: Asignarlo                                       │
│           - NO: Error "No hay TPVs disponibles.                 │
│                 Ve a Configuración → Dispositivos TPV"          │
│                                                                  │
│  3. Crear registro de caja con:                                 │
│     - tpv_id, tpv_nombre                                        │
│     - codigo_establecimiento, punto_emision                     │
│     - monto_inicial                                             │
│     - usuario_id, fecha_apertura                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Cierre de Caja

```
┌─────────────────────────────────────────────────────────────────┐
│                    CERRAR CAJA                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASO 1: Ingresar efectivo contado                              │
│  ┌─────────────────────────────────────────────┐                 │
│  │                                             │                 │
│  │      CERRAR CAJA                            │                 │
│  │                                             │                 │
│  │  Resumen de la sesión:                      │                 │
│  │  ─────────────────────                      │                 │
│  │  Monto inicial:        $100.00              │                 │
│  │  Total ventas:         $450.00              │                 │
│  │  Número de ventas:     15                   │                 │
│  │  ─────────────────────                      │                 │
│  │  Monto esperado:       $550.00              │                 │
│  │                                             │                 │
│  │  Efectivo contado: [$________]              │                 │
│  │                                             │                 │
│  │  [Cancelar]         [Cerrar Caja]           │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│                         │                                        │
│                         ▼                                        │
│  PASO 2: Ver resumen y decidir acción                           │
│  ┌─────────────────────────────────────────────┐                 │
│  │                                             │                 │
│  │  [CheckCircle] Caja Cerrada Correctamente   │                 │
│  │                                             │                 │
│  │  Caja: Caja 1                               │                 │
│  │  Cajero: Juan Pérez                         │                 │
│  │  TPV: Caja 1                                │                 │
│  │  Apertura: 22/01/2026, 10:00                │                 │
│  │  Cierre: 22/01/2026, 18:00                  │                 │
│  │  ─────────────────────────────────────────  │                 │
│  │  Ventas por Método de Pago:                 │                 │
│  │    Efectivo (10):        $320.00            │                 │
│  │    Tarjeta (5):          $130.00            │                 │
│  │  ─────────────────────────────────────────  │                 │
│  │  Base de Caja:           $100.00            │                 │
│  │  Ventas (15):            $450.00            │                 │
│  │  TOTAL ESPERADO:         $550.00            │                 │
│  │  ─────────────────────────────────────────  │                 │
│  │  Efectivo Contado:       $550.00            │                 │
│  │  Diferencia:             +$0.00  (verde)    │                 │
│  │  ─────────────────────────────────────────  │                 │
│  │                                             │                 │
│  │  [ArrowLeft Volver]    [Printer Imprimir]   │                 │
│  │                                             │                 │
│  │              [Cerrar]                       │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  Opciones:                                                       │
│  - [Volver]: Regresa a la pantalla anterior (navigate(-1))      │
│  - [Imprimir]: Abre ventana de impresión con el ticket          │
│  - [Cerrar]: Cierra el diálogo y permanece en la pantalla       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Acciones del sistema al cerrar:**
1. Actualizar estado de caja → "cerrada"
2. Guardar fecha_cierre, efectivo_contado, diferencia
3. Liberar TPV (ocupado: false)
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pantalla Principal del POS

### Layout Desktop (≥768px)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [☰]  🔍 Buscar productos...                    [👤 Cliente] [⋮ Menú]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                               │                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │  ┌─────────────────────┐ │
│  │     │ │     │ │     │ │     │ │     │    │  │      TICKET         │ │
│  │ 🍔  │ │ 🍟  │ │ 🥤  │ │ 🍕  │ │ 🌮  │    │  ├─────────────────────┤ │
│  │     │ │     │ │     │ │     │ │     │    │  │                     │ │
│  │$5.99│ │$2.99│ │$1.99│ │$8.99│ │$6.99│    │  │ 2x Hamburguesa $11.98│ │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘    │  │ 1x Papas       $2.99│ │
│                                               │  │ 1x Refresco    $1.99│ │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │  │                     │ │
│  │     │ │     │ │     │ │     │ │     │    │  ├─────────────────────┤ │
│  │ 🍗  │ │ 🥗  │ │ 🍰  │ │ ☕  │ │ 🧃  │    │  │ Subtotal:    $16.96│ │
│  │     │ │     │ │     │ │     │ │     │    │  │ IVA (12%):    $2.04│ │
│  │$7.99│ │$6.99│ │$4.99│ │$2.49│ │$1.79│    │  │ ─────────────────── │ │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘    │  │ TOTAL:       $19.00│ │
│                                               │  │                     │ │
│                                               │  │ [GUARDAR] [COBRAR]  │ │
│                                               │  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  [Todos] [Bebidas] [Comida] [Postres] [Snacks]  ← Categorías           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layout Móvil (<768px)

```
┌───────────────────────────────────┐
│ [☰]  [Ticket 3]  [👤] [⋮]        │  ← Header con badge de items
├───────────────────────────────────┤
│                                   │
│ 🔍 Buscar productos...            │
│                                   │
├───────────────────────────────────┤
│                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐         │
│  │ 🍔  │ │ 🍟  │ │ 🥤  │         │
│  │$5.99│ │$2.99│ │$1.99│         │
│  └─────┘ └─────┘ └─────┘         │
│                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐         │
│  │ 🍕  │ │ 🌮  │ │ 🍗  │         │
│  │$8.99│ │$6.99│ │$7.99│         │
│  └─────┘ └─────┘ └─────┘         │
│                                   │
├───────────────────────────────────┤
│ [TICKETS ABIERTOS]                │  ← Solo si función activa
├───────────────────────────────────┤
│ [Todos] [Bebidas] [Comida] →      │  ← Scroll horizontal
└───────────────────────────────────┘
│                                   │
│  ┌───────────────────────────────┐│
│  │  🛒  Ver Ticket (3)           ││  ← Botón flotante
│  │      $19.00                   ││
│  └───────────────────────────────┘│
└───────────────────────────────────┘
```

### Componentes de la Pantalla

#### 1. Header
```javascript
// Estructura del header
<header className="bg-blue-600 text-white px-4 py-3">
  <button onClick={toggleMenu}>☰</button>
  
  {/* Mobile: Badge con cantidad */}
  <button ref={ticketButtonRef} className="md:hidden">
    Ticket {cart.length > 0 && <span className="badge">{cart.length}</span>}
  </button>
  
  {/* Desktop: Solo texto */}
  <span className="hidden md:block">Ticket</span>
  
  <button onClick={openClienteDialog}>👤</button>
  <button onClick={toggleOptionsMenu}>⋮</button>
</header>
```

#### 2. Menú de Opciones (⋮)
```
┌─────────────────────────────────┐
│ Despejar ticket        🗑️      │  ← Vacía el carrito
│ Dividir ticket         ✂️      │  ← Divide items a otro ticket
│ Combinar tickets       🔗      │  ← Une varios tickets
│ Añadir descuento       🏷️      │  ← Solo si hay descuentos configurados
│ Sincronizar            🔄      │  ← Recarga datos del servidor
└─────────────────────────────────┘
```

#### 3. Sidebar de Navegación (☰)

El menú lateral tiene las mismas opciones para todos los roles, con "Backoffice" visible solo para administradores.

**Estructura del menú:**

| Opción | Icono | Todos | Solo Admin/Propietario |
|--------|-------|-------|------------------------|
| Punto de Venta | ShoppingCart | ✓ | ✓ |
| Recibos | FileText | ✓ | ✓ |
| Caja | Wallet | ✓ | ✓ |
| Backoffice | Briefcase | ✗ | ✓ |

**Nota sobre iconos:** Se utilizan iconos simples de la librería `lucide-react`, no gráficos ni emojis.

**Vista para Cajero/Mesero:**
```
┌─────────────────────────────────┐
│ Menú                      [X]   │
├─────────────────────────────────┤
│                                 │
│ [ShoppingCart] Punto de Venta   │  ← Resaltado (actual)
│ [FileText] Recibos              │
│ [Wallet] Caja                   │
│                                 │
└─────────────────────────────────┘
```

**Vista para Administrador/Propietario:**
```
┌─────────────────────────────────┐
│ Menú                      [X]   │
├─────────────────────────────────┤
│                                 │
│ [ShoppingCart] Punto de Venta   │  ← Resaltado (actual)
│ [FileText] Recibos              │
│ [Wallet] Caja                   │
│ ─────────────────────────────── │
│ [Briefcase] Backoffice          │  ← Acceso al sistema completo
│                                 │
└─────────────────────────────────┘
```

**Destino de cada opción:**
- **Punto de Venta** → `/pos` (pantalla actual del POS)
- **Recibos** → `/reportes` (historial de ventas/recibos)
- **Caja** → `/caja` (gestión de apertura/cierre de caja)
- **Backoffice** → `/dashboard` (acceso al sistema administrativo completo)

---

## Gestión del Carrito/Ticket

### Añadir Producto al Carrito

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUJO: AÑADIR PRODUCTO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Usuario toca producto                                           │
│              ↓                                                   │
│  ¿Producto tiene modificadores activos?                         │
│       /              \                                           │
│     SÍ                NO                                         │
│      ↓                 ↓                                         │
│  Abrir diálogo      Añadir directo                              │
│  de modificadores   al carrito                                   │
│      ↓                 │                                         │
│  Usuario selecciona    │                                         │
│  modificadores         │                                         │
│      ↓                 │                                         │
│  Click "Añadir"        │                                         │
│      ↓                 │                                         │
│  ┌─────────────────────┴───────────────────────┐                 │
│  │                                             │                 │
│  │  ¿Producto ya en carrito (mismos mods)?    │                 │
│  │       /              \                      │                 │
│  │     SÍ                NO                    │                 │
│  │      ↓                 ↓                    │                 │
│  │  Incrementar        Añadir nuevo           │                 │
│  │  cantidad           item al carrito        │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│              ↓                                                   │
│  ANIMACIÓN: Producto vuela hacia el botón "Ticket"              │
│  (Ver sección Animaciones)                                       │
│              ↓                                                   │
│  Actualizar totales                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Diálogo de Modificadores

```
┌─────────────────────────────────────────────────────────────────┐
│                    HAMBURGUESA CLÁSICA                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Precio base: $5.99                                              │
│                                                                  │
│  EXTRAS:                                                         │
│  ┌─────────────────────────────────────────────┐                 │
│  │ [✓] Queso extra            +$0.50           │                 │
│  │ [ ] Tocino                 +$1.00           │                 │
│  │ [✓] Huevo                  +$0.75           │                 │
│  │ [ ] Doble carne            +$2.00           │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  SALSAS:                                                         │
│  ┌─────────────────────────────────────────────┐                 │
│  │ [✓] Ketchup                Gratis           │                 │
│  │ [✓] Mayonesa               Gratis           │                 │
│  │ [ ] BBQ                    +$0.25           │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  ─────────────────────────────────────────────                   │
│  Total: $7.24                                                    │
│                                                                  │
│  [Cancelar]              [Añadir al Ticket]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Estructura del Item en Carrito

```javascript
{
  producto_id: "uuid-123",
  nombre: "Hamburguesa Clásica",
  cantidad: 2,
  precio: 5.99,           // Precio unitario base
  precio_con_mods: 7.24,  // Precio con modificadores
  subtotal: 14.48,        // precio_con_mods * cantidad
  modificadores: [
    { id: "mod-1", nombre: "Queso extra", precio: 0.50 },
    { id: "mod-2", nombre: "Huevo", precio: 0.75 }
  ]
}
```

### Controles del Carrito

```
┌─────────────────────────────────────────────────────────────────┐
│  ITEM EN EL CARRITO                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [-]  2  [+]   Hamburguesa Clásica              $14.48   🗑️ │ │
│  │              + Queso extra, Huevo                           │ │
│  │              $7.24 c/u                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Acciones:                                                       │
│  [-] → Disminuir cantidad (si llega a 0, elimina)               │
│  [+] → Aumentar cantidad                                         │
│  🗑️ → Eliminar item del carrito                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Resumen del Ticket

```
┌─────────────────────────────────────────────────────────────────┐
│  RESUMEN DEL TICKET                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Subtotal:                                         $45.00        │
│                                                                  │
│  Descuentos aplicados:                                           │
│  ┌─────────────────────────────────────────────┐                 │
│  │ 🏷️ Promoción 10%           -$4.50      [X]  │  ← Click X     │
│  │ 🏷️ Descuento empleado      -$2.00      [X]  │    para quitar │
│  └─────────────────────────────────────────────┘                 │
│  Total descuentos:                                 -$6.50        │
│                                                                  │
│  Subtotal con descuento:                          $38.50        │
│                                                                  │
│  Impuestos:                                                      │
│  ┌─────────────────────────────────────────────┐                 │
│  │ IVA (12%):                          +$4.62  │                 │
│  │ Propina sugerida (10%):             +$3.85  │                 │
│  └─────────────────────────────────────────────┘                 │
│  Total impuestos:                                 +$8.47        │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  TOTAL:                                           $46.97        │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  [  GUARDAR  ]                    [  COBRAR $46.97  ]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sistema de Mesas

### Activación de la Función

```
Configuración → Funciones → Tickets Abiertos: [ON]
                          → Mesas por Mesero:  [ON] (opcional)
```

### Flujo de Guardar en Mesa

```
┌─────────────────────────────────────────────────────────────────┐
│                  GUARDAR TICKET EN MESA                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Usuario click en [GUARDAR]                                      │
│              ↓                                                   │
│  ¿Carrito tiene items?                                          │
│       /          \                                               │
│     NO            SÍ                                             │
│      ↓             ↓                                             │
│  Error:        Abrir diálogo                                     │
│  "Carrito      "Guardar Ticket"                                  │
│   vacío"                                                         │
│                    ↓                                             │
│  ┌─────────────────────────────────────────────┐                 │
│  │                                             │                 │
│  │      GUARDAR TICKET                         │                 │
│  │                                             │                 │
│  │  [Mesa ▼] [Personalizado]  ← Tabs          │                 │
│  │                                             │                 │
│  │  MESAS DISPONIBLES:                         │                 │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │                 │
│  │  │  1  │ │  2  │ │  3  │ │  4  │          │                 │
│  │  │ 🟢  │ │ 🟢  │ │ 🔴  │ │ 🟢  │          │                 │
│  │  └─────┘ └─────┘ └─────┘ └─────┘          │                 │
│  │                  ↑                          │                 │
│  │            Ocupada (deshabilitada)          │                 │
│  │                                             │                 │
│  │  [Cancelar]        [Guardar en Mesa 1]      │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│              ↓                                                   │
│  POST /api/tickets-abiertos-pos                                 │
│  {nombre: "Mesa 1", items: [...], subtotal}                     │
│              ↓                                                   │
│  Limpiar carrito actual                                          │
│  Toast: "Ticket guardado en Mesa 1"                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Diálogo de Tickets Abiertos

```
┌─────────────────────────────────────────────────────────────────┐
│                    TICKETS ABIERTOS                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Mesa 1                         [Mi mesa]     ← Badge si es │ │
│  │  22/01/2026, 14:30                           propio        │ │
│  │  👤 Mesero Juan                  ← Quien creó              │ │
│  │  ─────────────────────────────────────────                  │ │
│  │  2x Hamburguesa               $11.98                        │ │
│  │  1x Papas                     $2.99                         │ │
│  │  ─────────────────────────────────────────                  │ │
│  │  Total: $14.97                3 items                       │ │
│  │                                                             │ │
│  │  [Continuar]              [Eliminar]                        │ │
│  │       ↑                        ↑                            │ │
│  │  Solo si puede_editar    Solo si puede_editar              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Mesa 5                                                     │ │
│  │  22/01/2026, 14:45                                          │ │
│  │  👤 Mesero Pedro                                            │ │
│  │  ─────────────────────────────────────────                  │ │
│  │  🔒 Solo Mesero Pedro puede editar                          │ │
│  │       ↑                                                     │ │
│  │  Cuando "Mesas por mesero" está activo                     │ │
│  │  y el ticket es de otro mesero                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Permisos de Mesas (cuando "Mesas por mesero" está activo)

| Rol | Ve todas | Puede editar |
|-----|----------|--------------|
| **Propietario** | ✅ | ✅ Todas |
| **Administrador** | ✅ | ✅ Todas |
| **Cajero** | ✅ | ✅ Todas (para cobrar) |
| **Mesero** | ✅ | ⚠️ Solo las suyas |

### Dividir Ticket

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIVIDIR TICKET                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Selecciona los productos a mover:                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [✓] 1x Hamburguesa              $5.99    [Cantidad: 1 ▼]   │ │
│  │ [ ] 2x Papas                    $5.98    [Cantidad: _ ]    │ │
│  │ [✓] 1x Refresco                 $1.99    [Cantidad: 1 ▼]   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Nombre del nuevo ticket: [Mesa 1B___________]                   │
│                                                                  │
│  [Cancelar]                            [Dividir]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Resultado:
- Ticket original: queda con los items no seleccionados
- Nuevo ticket: se crea con los items seleccionados
```

### Combinar Tickets

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMBINAR TICKETS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Selecciona los tickets a combinar:                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [✓] Mesa 1        $14.97       3 productos                  │ │
│  │ [✓] Mesa 1B       $7.98        2 productos                  │ │
│  │ [ ] Mesa 2        $22.50       4 productos                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Se combinarán en: Mesa 1 (el primero seleccionado)             │
│  Total combinado: $22.95                                         │
│                                                                  │
│  [Cancelar]                            [Combinar]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Resultado:
- Todos los items se mueven al primer ticket seleccionado
- Los otros tickets se eliminan
```

---

## Proceso de Cobro

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESO DE COBRO                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Usuario click en [COBRAR $46.97]                                │
│              ↓                                                   │
│  ¿Hay caja abierta?                                             │
│       /          \                                               │
│     NO            SÍ                                             │
│      ↓             ↓                                             │
│  Mostrar       Abrir diálogo                                     │
│  diálogo       de cobro                                          │
│  "Abrir Caja"                                                    │
│                    ↓                                             │
│  ┌─────────────────────────────────────────────┐                 │
│  │                                             │                 │
│  │      COBRAR $46.97                          │                 │
│  │                                             │                 │
│  │  Método de pago:                            │                 │
│  │  ┌────────┐ ┌────────┐ ┌────────┐          │                 │
│  │  │Efectivo│ │Tarjeta │ │Transfer│          │                 │
│  │  │   ✓    │ │        │ │        │          │                 │
│  │  └────────┘ └────────┘ └────────┘          │                 │
│  │                                             │                 │
│  │  (Si es efectivo)                           │                 │
│  │  Efectivo recibido: [$50.00_____]          │                 │
│  │                                             │                 │
│  │  Cambio a devolver: $3.03                   │                 │
│  │                     ↑                       │                 │
│  │              Verde si es ≥ 0                │                 │
│  │              Rojo si es < 0                 │                 │
│  │                                             │                 │
│  │  [Cancelar]        [Confirmar Pago]         │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│              ↓                                                   │
│  POST /api/facturas                                             │
│  {items, subtotal, descuentos, impuestos, total,                │
│   cliente_id, metodo_pago_id, tipo_pedido_id}                   │
│              ↓                                                   │
│  Backend genera número de factura:                               │
│  001-002-000000015                                               │
│              ↓                                                   │
│  ¿Venía de ticket guardado?                                     │
│       /          \                                               │
│     SÍ            NO                                             │
│      ↓             ↓                                             │
│  Eliminar      Continuar                                         │
│  ticket                                                          │
│              ↓                                                   │
│  Limpiar carrito                                                 │
│  Toast: "Factura 001-002-000000015 creada"                      │
│              ↓                                                   │
│  ¿Imprimir automáticamente?                                     │
│  (Si está configurado)                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Impresión de Recibo

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECIBO DE VENTA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    [LOGO]                                        │
│                                                                  │
│              MI RESTAURANTE                                      │
│          Dirección de la tienda                                  │
│             Tel: 123-456-789                                     │
│                                                                  │
│  ═══════════════════════════════════════════                    │
│  FACTURA: 001-002-000000015                                      │
│  Fecha: 22/01/2026 14:35                                         │
│  Cajero: Juan Pérez                                              │
│  ═══════════════════════════════════════════                    │
│                                                                  │
│  Cliente: María García                                           │
│  Cédula: 1234567890                                              │
│                                                                  │
│  ───────────────────────────────────────────                    │
│  Cant  Descripción              Precio                           │
│  ───────────────────────────────────────────                    │
│  2     Hamburguesa Clásica      $11.98                          │
│        + Queso extra                                             │
│  1     Papas Medianas           $2.99                           │
│  1     Refresco Grande          $1.99                           │
│  ───────────────────────────────────────────                    │
│                                                                  │
│  Subtotal:                      $16.96                          │
│  Descuento (10%):               -$1.70                          │
│  IVA (12%):                     +$1.83                          │
│  ═══════════════════════════════════════════                    │
│  TOTAL:                         $17.09                          │
│  ═══════════════════════════════════════════                    │
│                                                                  │
│  Método de pago: Efectivo                                        │
│  Recibido: $20.00                                                │
│  Cambio: $2.91                                                   │
│                                                                  │
│  ───────────────────────────────────────────                    │
│            ¡Gracias por su compra!                               │
│  ───────────────────────────────────────────                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Clientes

### Flujo de Selección de Cliente

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELECCIONAR CLIENTE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Click en botón [👤] del header                                  │
│              ↓                                                   │
│  ┌─────────────────────────────────────────────┐                 │
│  │                                             │                 │
│  │      BUSCAR CLIENTE                         │                 │
│  │                                             │                 │
│  │  Cédula/RUC: [_______________] [Buscar]    │                 │
│  │                                             │                 │
│  │  ─────────────────────────────────────────  │                 │
│  │                                             │                 │
│  │  [+ Crear Nuevo Cliente]                    │                 │
│  │                                             │                 │
│  │  [Consumidor Final]   ← Cliente genérico   │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  Si encuentra cliente → lo selecciona automáticamente            │
│  Si no encuentra → muestra mensaje y opción de crear             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Formulario Crear Cliente

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREAR NUEVO CLIENTE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Nombre completo*: [________________________]                    │
│                                                                  │
│  Cédula/RUC*:     [________________________]                    │
│                                                                  │
│  Teléfono:        [________________________]                    │
│                                                                  │
│  Email:           [________________________]                    │
│                                                                  │
│  Dirección:       [________________________]                    │
│                                                                  │
│                                                                  │
│  [Cancelar]              [Crear y Seleccionar]                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Indicador de Cliente Seleccionado

```
Header cuando hay cliente:
┌─────────────────────────────────────────────────────────────────┐
│ [☰]  Ticket                          [👤●] [⋮]                  │
│                                        ↑                         │
│                               Punto amarillo indica              │
│                               cliente seleccionado               │
└─────────────────────────────────────────────────────────────────┘

En el carrito (desktop):
┌─────────────────────────────────────────────────────────────────┐
│ Cliente: María García (1234567890)        [X]                    │
│                                            ↑                     │
│                                    Click para quitar             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Descuentos

### Configuración de Descuentos

```
Configuración → Descuentos → [+ Nuevo Descuento]

┌─────────────────────────────────────────────────────────────────┐
│                    CREAR DESCUENTO                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Nombre*:        [Promoción 10%______________]                   │
│                                                                  │
│  Tipo*:          [Porcentaje ▼]                                 │
│                  ├─ Porcentaje                                   │
│                  └─ Monto fijo                                   │
│                                                                  │
│  Valor*:         [10________]                                    │
│                                                                  │
│  Activo:         [✓]                                            │
│                                                                  │
│  [Cancelar]                         [Guardar]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Aplicar Descuento en POS

```
Menu (⋮) → "Añadir descuento"
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AÑADIR DESCUENTO                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Seleccionar descuento:                                          │
│  ┌─────────────────────────────────────────────┐                 │
│  │ [Seleccionar...                         ▼]  │                 │
│  │  ├─ Promoción 10%                           │                 │
│  │  ├─ Descuento empleado ($5)                 │                 │
│  │  └─ Happy Hour 20%                          │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  Motivo (opcional): [_________________________]                  │
│                                                                  │
│  Descuento a aplicar: -$4.50 (sobre $45.00)                     │
│                                                                  │
│  [Cancelar]                      [Aplicar Descuento]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Impuestos

### Configuración de Impuestos

```
Configuración → Impuestos → [+ Nuevo Impuesto]

┌─────────────────────────────────────────────────────────────────┐
│                    CREAR IMPUESTO                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Nombre*:        [IVA____________________]                       │
│                                                                  │
│  Porcentaje*:    [12________] %                                  │
│                                                                  │
│  Tipo*:          [Agregado ▼]                                   │
│                  ├─ Agregado (se suma al subtotal)               │
│                  └─ Incluido (ya está en el precio)              │
│                                                                  │
│  Activo:         [✓]                                            │
│                                                                  │
│  [Cancelar]                         [Guardar]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cálculo de Impuestos

```javascript
// Impuesto AGREGADO (se suma al subtotal)
subtotal = 100.00
impuesto_agregado = subtotal * 0.12 = 12.00
total = 100.00 + 12.00 = 112.00

// Impuesto INCLUIDO (ya está en el precio)
precio_con_impuesto = 100.00
base = 100.00 / 1.12 = 89.29
impuesto_incluido = 100.00 - 89.29 = 10.71
// El total sigue siendo 100.00 pero se muestra el desglose
```

---

## Animaciones y UX

### Animación "Fly to Cart" (Producto vuela al ticket)

```javascript
// Cuando usuario toca un producto en MÓVIL:

1. Obtener posición del producto tocado
2. Obtener posición del botón "Ticket" en el header
3. Crear elemento flotante con imagen del producto
4. Animar de posición inicial → posición del botón
5. Durante la animación: scale down + fade out
6. Al terminar: eliminar elemento, actualizar carrito

// CSS de la animación:
.flying-product {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform: scale(0.3);
  opacity: 0;
}

// Estados de la animación:
Inicio:  { x: producto.x, y: producto.y, scale: 1, opacity: 1 }
    ↓
Fin:     { x: ticket.x, y: ticket.y, scale: 0.3, opacity: 0 }
    ↓
Badge del ticket hace "bounce" brevemente
```

### Implementación de la Animación

```javascript
const handleProductoClick = (producto, event) => {
  // Solo en móvil
  if (window.innerWidth >= 768) {
    addToCart(producto);
    return;
  }
  
  // Obtener posición del producto
  const rect = event.currentTarget.getBoundingClientRect();
  const productPos = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  // Obtener posición del botón ticket
  const ticketButton = ticketButtonRef.current;
  const ticketRect = ticketButton.getBoundingClientRect();
  const ticketPos = {
    x: ticketRect.left + ticketRect.width / 2,
    y: ticketRect.top + ticketRect.height / 2
  };
  
  // Crear y animar elemento flotante
  setFlyingProduct({
    imagen: producto.imagen,
    nombre: producto.nombre,
    startX: productPos.x,
    startY: productPos.y,
    endX: ticketPos.x,
    endY: ticketPos.y
  });
  
  // Añadir al carrito después de la animación
  setTimeout(() => {
    addToCart(producto);
    setFlyingProduct(null);
  }, 500);
};
```

### Otras Animaciones

```css
/* Hover en productos */
.product-card {
  transition: all 0.2s ease;
}
.product-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-color: #3b82f6;
}

/* Efecto al presionar */
.product-card:active {
  transform: scale(0.95);
}

/* Badge bounce al añadir producto */
@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}
.badge-bounce {
  animation: bounce 0.3s ease;
}

/* Entrada de items en carrito */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.cart-item-enter {
  animation: slideIn 0.3s ease;
}

/* Botón flotante del carrito (móvil) */
.floating-cart-button {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 40;
  transition: transform 0.2s ease;
}
.floating-cart-button:active {
  transform: scale(0.98);
}
```

---

## Diseño Responsive

### Breakpoints

```css
/* Mobile first */
/* xs: 0px - 639px    → Teléfonos */
/* sm: 640px - 767px  → Teléfonos grandes */
/* md: 768px - 1023px → Tablets */
/* lg: 1024px - 1279px → Laptops */
/* xl: 1280px+        → Desktop */
```

### Diferencias por Dispositivo

| Elemento | Mobile (<768px) | Tablet/Desktop (≥768px) |
|----------|-----------------|-------------------------|
| **Carrito** | Overlay fullscreen | Panel lateral fijo |
| **Ver carrito** | Botón flotante | Siempre visible |
| **Grid productos** | 3 columnas | 4-6 columnas |
| **Header** | Badge en "Ticket" | Texto "Ticket" |
| **Categorías** | Scroll horizontal | Scroll horizontal |
| **Tickets abiertos** | Botón separado | En sidebar |
| **Animación fly** | Activa | Desactivada |

### Vista del Carrito en Móvil

```
┌───────────────────────────────────┐
│ ← Volver            TICKET        │
├───────────────────────────────────┤
│                                   │
│  Tipo de pedido: [Para llevar ▼]  │  ← Solo si función activa
│                                   │
│  Cliente: María García       [X]  │
│                                   │
├───────────────────────────────────┤
│                                   │
│  [-] 2 [+] Hamburguesa    $11.98 🗑│
│           + Queso extra           │
│                                   │
│  [-] 1 [+] Papas          $2.99  🗑│
│                                   │
│  [-] 1 [+] Refresco       $1.99  🗑│
│                                   │
├───────────────────────────────────┤
│                                   │
│  Subtotal:            $16.96      │
│  IVA (12%):           +$2.04      │
│  ────────────────────────────     │
│  TOTAL:               $19.00      │
│                                   │
├───────────────────────────────────┤
│                                   │
│  [GUARDAR]     [COBRAR $19.00]    │
│                                   │
└───────────────────────────────────┘
```

---

## Roles y Permisos

### Matriz de Permisos

| Acción | Propietario | Admin | Cajero | Mesero |
|--------|-------------|-------|--------|--------|
| Ver POS | ✅ | ✅ | ✅ | ✅ |
| Facturar | ✅ | ✅ | ✅ | ❌ |
| Abrir/Cerrar caja | ✅ | ✅ | ✅ | ❌ |
| Crear tickets | ✅ | ✅ | ✅ | ✅ |
| Editar cualquier ticket | ✅ | ✅ | ✅ | ❌* |
| Aplicar descuentos | ✅ | ✅ | ✅ | ❌ |
| Ver Back Office | ✅ | ✅ | ❌ | ❌ |
| Configuración | ✅ | ✅ | ❌ | ❌ |
| Gestionar empleados | ✅ | ✅ | ❌ | ❌ |

*Meseros solo pueden editar sus propias mesas si "Mesas por mesero" está activo

### Navegación por Rol

```javascript
// Menú lateral (sidebar)
const menuItems = [
  { 
    label: "Back Office", 
    path: "/dashboard", 
    roles: ["propietario", "administrador"] 
  },
  { 
    label: "Punto de Venta", 
    path: "/pos", 
    roles: ["propietario", "administrador", "cajero", "mesero"] 
  },
  { 
    label: "Caja", 
    path: "/caja", 
    roles: ["propietario", "administrador", "cajero"] 
  }
];
```

---

## API Endpoints

### Autenticación

```
POST /api/auth/login-pin
Body: { codigo_tienda: string, pin: string }
Response: { access_token, usuario, tienda }

GET /api/tienda/verificar/{codigo}
Response: { valido: bool, tienda_nombre, organizacion_nombre }
```

### Productos

```
GET /api/productos
Response: [{ id, nombre, precio, imagen, categoria, stock, ... }]
```

### Carrito/Facturas

```
POST /api/facturas
Body: {
  items: [{ producto_id, nombre, cantidad, precio, subtotal, modificadores }],
  subtotal: number,
  descuento: number,
  descuentos_detalle: [{ tipo, valor, motivo, monto }],
  impuesto: number,
  desglose_impuestos: [{ nombre, porcentaje, monto }],
  total: number,
  cliente_id: string | null,
  metodo_pago_id: string,
  tipo_pedido_id: string | null
}
Response: { id, numero, ... }
```

### Caja/TPV

```
GET /api/caja/activa
Response: { id, numero, monto_inicial, monto_ventas, ... } | null

POST /api/tpv/abrir-caja
Body: { tpv_id?: string, monto_inicial: number }
Response: { id, numero, tpv_nombre, ... }

POST /api/caja/cerrar
Body: { efectivo_contado: number }
Response: { message, diferencia }

GET /api/tpv/disponibles
Response: [{ id, nombre, punto_emision, ocupado }]
```

### Tickets Abiertos

```
GET /api/tickets-abiertos-pos
Response: [{ 
  id, nombre, items, subtotal, 
  vendedor_id, vendedor_nombre,
  puede_editar, es_propio,
  fecha_creacion 
}]

POST /api/tickets-abiertos-pos
Body: { nombre, items, subtotal, cliente_id?, comentarios? }
Response: { id, nombre, ... }

PUT /api/tickets-abiertos-pos/{id}
Body: { nombre, items, subtotal, ... }

DELETE /api/tickets-abiertos-pos/{id}
```

### Clientes

```
GET /api/clientes/buscar/{cedula}
Response: { id, nombre, cedula_ruc, telefono, email, direccion }

POST /api/clientes
Body: { nombre, cedula_ruc, telefono?, email?, direccion? }
Response: { id, ... }
```

### Configuración

```
GET /api/funciones
Response: {
  cierres_caja: bool,
  tickets_abiertos: bool,
  mesas_por_mesero: bool,
  tipo_pedido: bool,
  venta_con_stock: bool,
  ...
}

GET /api/metodos-pago
Response: [{ id, nombre, activo }]

GET /api/tipos-pedido
Response: [{ id, nombre, activo }]

GET /api/descuentos
Response: [{ id, nombre, tipo, valor, activo }]

GET /api/impuestos
Response: [{ id, nombre, porcentaje, tipo, activo }]

GET /api/modificadores
Response: [{ id, nombre, opciones: [{ nombre, precio }] }]
```

---

## Modelos de Datos

### Usuario
```javascript
{
  _id: "uuid",
  username: "cajero1",
  hashed_password: "...",
  rol: "cajero" | "mesero" | "administrador" | "propietario",
  nombre: "Juan Pérez",
  organizacion_id: "uuid",
  activo: true,
  pin: "1234",
  pin_activo: true
}
```

### Organización
```javascript
{
  _id: "uuid",
  nombre: "Mi Restaurante",
  codigo_tienda: "1RAT-1017",  // Código para login POS
  plan: "premium",
  configuracion: { moneda: "USD" }
}
```

### Tienda
```javascript
{
  id: "uuid",
  nombre: "Sucursal Centro",
  codigo_establecimiento: "001",
  direccion: "Av. Principal 123",
  telefono: "123-456-789",
  organizacion_id: "uuid",
  activo: true
}
```

### TPV
```javascript
{
  id: "uuid",
  nombre: "Caja 1",
  punto_emision: "001",
  tienda_id: "uuid",
  organizacion_id: "uuid",
  activo: true,
  ocupado: false,
  ocupado_por: null,
  ocupado_por_nombre: null
}
```

### Caja
```javascript
{
  _id: "uuid",
  numero: "Caja 1",
  usuario_id: "uuid",
  usuario_nombre: "Juan Pérez",
  organizacion_id: "uuid",
  monto_inicial: 100.00,
  monto_ventas: 450.00,
  total_ventas: 15,
  fecha_apertura: "2026-01-22T10:00:00Z",
  fecha_cierre: null,
  estado: "abierta" | "cerrada",
  tpv_id: "uuid",
  tpv_nombre: "Caja 1",
  tienda_id: "uuid",
  codigo_establecimiento: "001",
  punto_emision: "001"
}
```

### Factura
```javascript
{
  id: "uuid",
  numero: "001-001-000000015",
  items: [
    {
      producto_id: "uuid",
      nombre: "Hamburguesa",
      cantidad: 2,
      precio: 5.99,
      subtotal: 11.98,
      modificadores: [{ nombre: "Queso extra", precio: 0.50 }]
    }
  ],
  subtotal: 16.96,
  descuento: 1.70,
  descuentos: [{ tipo: "porcentaje", valor: 10, motivo: "Promoción", monto: 1.70 }],
  impuesto: 1.83,
  desglose_impuestos: [{ nombre: "IVA", porcentaje: 12, monto: 1.83 }],
  total: 17.09,
  cliente_id: "uuid",
  cliente_nombre: "María García",
  vendedor: "uuid",
  vendedor_nombre: "Juan Pérez",
  caja_id: "uuid",
  metodo_pago: "Efectivo",
  tipo_pedido: "Para llevar",
  fecha: "2026-01-22T14:35:00Z",
  organizacion_id: "uuid"
}
```

### Ticket Abierto
```javascript
{
  id: "uuid",
  nombre: "Mesa 5",
  items: [...],
  subtotal: 45.00,
  vendedor_id: "uuid",
  vendedor_nombre: "Pedro Mesero",
  organizacion_id: "uuid",
  caja_id: "uuid",
  cliente_id: null,
  cliente_nombre: null,
  comentarios: null,
  fecha_creacion: "2026-01-22T14:30:00Z",
  ultimo_vendedor_id: "uuid",
  ultimo_vendedor_nombre: "Juan Cajero",
  ultima_modificacion: "2026-01-22T14:45:00Z"
}
```

---

## Checklist de Implementación

### Pantallas Requeridas
- [x] Login por PIN (código tienda + teclado numérico)
- [x] Login con Google OAuth
- [x] POS principal (productos + carrito)
- [x] Carrito móvil (overlay)
- [x] Diálogo apertura de caja
- [x] Diálogo cierre de caja con resumen
- [x] Diálogo de cobro
- [x] Diálogo selección cliente
- [x] Diálogo crear cliente
- [x] Diálogo modificadores de producto
- [x] Diálogo guardar en mesa
- [x] Diálogo tickets abiertos
- [x] Diálogo dividir ticket
- [x] Diálogo combinar tickets
- [x] Diálogo añadir descuento

### Funcionalidades Core
- [x] Añadir productos al carrito
- [x] Modificar cantidades (+/-)
- [x] Eliminar items
- [x] Buscar productos
- [x] Filtrar por categoría
- [x] Escanear código de barras
- [x] Aplicar descuentos
- [x] Calcular impuestos
- [x] Procesar cobro
- [x] Generar número de factura (formato SRI)
- [x] Imprimir recibo

### Gestión de Mesas
- [x] Guardar ticket en mesa
- [x] Cargar ticket de mesa
- [x] Dividir ticket
- [x] Combinar tickets
- [x] Permisos por rol (mesas por mesero)

### UX/Animaciones
- [x] Fly-to-cart animation
- [x] Hover effects en productos
- [x] Badge bounce al añadir
- [x] Slide-in de items en carrito
- [x] Feedback táctil (active states)

---

## Variables de Entorno

### Backend (.env)

```env
# Base de datos
MONGO_URL="mongodb+srv://usuario:password@cluster.mongodb.net"
DB_NAME="facturacion_db"

# Seguridad
SECRET_KEY="tu-clave-secreta-muy-segura-cambiar-en-produccion"
CORS_ORIGINS="https://www.posahora.com,https://posahora.com"

# Google OAuth
GOOGLE_CLIENT_ID="530102316862-xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
GOOGLE_REDIRECT_URI="https://www.posahora.com/auth/google/callback"
```

### Frontend (.env)

```env
# URL del backend
REACT_APP_BACKEND_URL="https://posahora.onrender.com"

# Google OAuth (solo client_id, es público)
REACT_APP_GOOGLE_CLIENT_ID="530102316862-xxxxx.apps.googleusercontent.com"
```

### Notas sobre Variables

| Variable | Sensible | Dónde se usa |
|----------|----------|--------------|
| `MONGO_URL` | Sí | Solo backend |
| `SECRET_KEY` | Sí | Solo backend (JWT) |
| `GOOGLE_CLIENT_SECRET` | Sí | Solo backend |
| `GOOGLE_CLIENT_ID` | No | Backend y Frontend |
| `REACT_APP_BACKEND_URL` | No | Solo frontend |

---

## Conexiones Frontend ↔ Backend

### Diagrama de Conexiones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA DE CONEXIONES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────┐                                   │
│  │         FRONTEND (React)              │                                   │
│  │     https://www.posahora.com          │                                   │
│  │                                        │                                   │
│  │  .env:                                 │                                   │
│  │  REACT_APP_BACKEND_URL=               │                                   │
│  │    https://posahora.onrender.com      │                                   │
│  │  REACT_APP_GOOGLE_CLIENT_ID=          │                                   │
│  │    530102316862-xxx...                │                                   │
│  └──────────────────┬───────────────────┘                                   │
│                     │                                                        │
│                     │ HTTPS (API calls)                                      │
│                     │ Authorization: Bearer {JWT}                            │
│                     ▼                                                        │
│  ┌──────────────────────────────────────┐                                   │
│  │         BACKEND (FastAPI)             │                                   │
│  │   https://posahora.onrender.com       │                                   │
│  │                                        │                                   │
│  │  .env:                                 │                                   │
│  │  MONGO_URL=mongodb+srv://...          │                                   │
│  │  CORS_ORIGINS=https://www.posahora.com│                                   │
│  │  GOOGLE_CLIENT_ID=530102316862-xxx... │                                   │
│  │  GOOGLE_CLIENT_SECRET=GOCSPX-xxx...   │                                   │
│  │  GOOGLE_REDIRECT_URI=                 │                                   │
│  │    https://www.posahora.com/          │                                   │
│  │    auth/google/callback               │                                   │
│  └──────────────────┬───────────────────┘                                   │
│                     │                                                        │
│                     │ MongoDB Driver                                         │
│                     ▼                                                        │
│  ┌──────────────────────────────────────┐                                   │
│  │         MONGODB (Atlas)               │                                   │
│  │   mongodb+srv://cluster.mongodb.net   │                                   │
│  └──────────────────────────────────────┘                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuración de URLs por Entorno

**Desarrollo (Local):**
```
Frontend:  http://localhost:3000
Backend:   http://localhost:8001
MongoDB:   mongodb://localhost:27017
```

**Desarrollo (Emergent Preview):**
```
Frontend:  https://smartpos-XX.preview.emergentagent.com
Backend:   https://smartpos-XX.preview.emergentagent.com/api (proxy)
MongoDB:   mongodb://localhost:27017 (dentro del pod)
```

**Producción:**
```
Frontend:  https://www.posahora.com (Netlify/Vercel)
Backend:   https://posahora.onrender.com (Render)
MongoDB:   mongodb+srv://usuario:pass@cluster.mongodb.net (Atlas)
```

### Configuración CORS

El backend debe permitir requests del frontend. En `server.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Variable de entorno CORS_ORIGINS:**
```
# Desarrollo
CORS_ORIGINS=*

# Producción (separar por comas, sin espacios)
CORS_ORIGINS=https://www.posahora.com,https://posahora.com
```

### Endpoints API - Tabla de Referencia

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| **Autenticación** |
| POST | `/api/login` | Login usuario/contraseña | No |
| POST | `/api/auth/login-pin` | Login por PIN | No |
| POST | `/api/auth/google` | Login/Registro con Google | No |
| POST | `/api/auth/register` | Registro manual | No |
| POST | `/api/auth/logout` | Cerrar sesión | Sí |
| GET | `/api/me` | Usuario actual | Sí |
| GET | `/api/tienda/verificar/{codigo}` | Verificar código tienda | No |
| **Productos** |
| GET | `/api/productos` | Listar productos | Sí |
| POST | `/api/productos` | Crear producto | Sí |
| PUT | `/api/productos/{id}` | Actualizar producto | Sí |
| DELETE | `/api/productos/{id}` | Eliminar producto | Sí |
| POST | `/api/productos/{id}/upload-image` | Subir imagen | Sí |
| **Categorías** |
| GET | `/api/categorias` | Listar categorías | Sí |
| POST | `/api/categorias` | Crear categoría | Sí |
| **Clientes** |
| GET | `/api/clientes` | Listar clientes | Sí |
| POST | `/api/clientes` | Crear cliente | Sí |
| GET | `/api/clientes/buscar/{cedula}` | Buscar por cédula | Sí |
| **Facturas** |
| GET | `/api/facturas` | Listar facturas | Sí |
| POST | `/api/facturas` | Crear factura | Sí |
| GET | `/api/facturas/{id}` | Detalle factura | Sí |
| **Caja/TPV** |
| GET | `/api/caja/activa` | Caja activa del usuario | Sí |
| POST | `/api/tpv/abrir-caja` | Abrir caja | Sí |
| POST | `/api/caja/cerrar` | Cerrar caja | Sí |
| GET | `/api/tpv/disponibles` | TPVs disponibles | Sí |
| GET | `/api/tpv` | Listar TPVs | Sí |
| POST | `/api/tpv` | Crear TPV | Sí |
| **Tickets Abiertos** |
| GET | `/api/tickets-abiertos-pos` | Listar tickets | Sí |
| POST | `/api/tickets-abiertos-pos` | Guardar ticket | Sí |
| PUT | `/api/tickets-abiertos-pos/{id}` | Actualizar ticket | Sí |
| DELETE | `/api/tickets-abiertos-pos/{id}` | Eliminar ticket | Sí |
| **Configuración** |
| GET | `/api/funciones` | Configuración funciones | Sí |
| PUT | `/api/funciones` | Actualizar funciones | Sí |
| GET | `/api/metodos-pago` | Métodos de pago | Sí |
| GET | `/api/impuestos` | Impuestos | Sí |
| GET | `/api/descuentos` | Descuentos | Sí |
| GET | `/api/ticket-config` | Config. recibo | Sí |
| POST | `/api/config/upload-logo` | Subir logo | Sí |
| **Reportes** |
| GET | `/api/reporte/ventas` | Reporte de ventas | Sí |
| GET | `/api/reporte/productos` | Productos más vendidos | Sí |

### Headers de Autenticación

Todas las peticiones autenticadas deben incluir:

```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

Ejemplo en React:
```javascript
const API_URL = process.env.REACT_APP_BACKEND_URL;

const fetchProductos = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/productos`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
```

### Flujo de Autenticación Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUJO DE AUTENTICACIÓN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. LOGIN (cualquier método)                                    │
│     POST /api/login                                             │
│     POST /api/auth/login-pin                                    │
│     POST /api/auth/google                                       │
│                      │                                           │
│                      ▼                                           │
│  2. RESPUESTA con JWT                                           │
│     {                                                            │
│       "access_token": "eyJhbGciOiJIUzI1NiIs...",               │
│       "token_type": "bearer",                                   │
│       "user": { id, nombre, email, rol, organizacion_id }       │
│     }                                                            │
│                      │                                           │
│                      ▼                                           │
│  3. FRONTEND guarda en localStorage                             │
│     localStorage.setItem('token', access_token)                 │
│     localStorage.setItem('user', JSON.stringify(user))          │
│                      │                                           │
│                      ▼                                           │
│  4. PETICIONES AUTENTICADAS                                     │
│     GET /api/productos                                          │
│     Headers: { Authorization: "Bearer eyJhbGciOi..." }          │
│                      │                                           │
│                      ▼                                           │
│  5. BACKEND valida JWT                                          │
│     - Verifica firma con SECRET_KEY                             │
│     - Verifica expiración (24 horas)                            │
│     - Extrae: user_id, rol, organizacion_id                     │
│                      │                                           │
│                      ▼                                           │
│  6. RESPUESTA filtrada por organizacion_id                      │
│     (Multi-tenancy: cada org ve solo sus datos)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Manejo de Errores HTTP

| Código | Significado | Acción en Frontend |
|--------|-------------|-------------------|
| 200 | Éxito | Procesar respuesta |
| 201 | Creado | Procesar respuesta |
| 400 | Bad Request | Mostrar error.detail |
| 401 | No autenticado | Redirigir a /login |
| 403 | Sin permisos | Mostrar mensaje |
| 404 | No encontrado | Mostrar mensaje |
| 500 | Error servidor | Mostrar mensaje genérico |

Ejemplo de manejo en React:
```javascript
try {
  const response = await axios.post(`${API_URL}/api/facturas`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  toast.success('Factura creada');
} catch (error) {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    navigate('/login');
  } else {
    toast.error(error.response?.data?.detail || 'Error al crear factura');
  }
}
```

---

## Despliegue

### Opción 1: Render (Backend) + Netlify (Frontend)

**Backend en Render:**
1. Crear nuevo Web Service
2. Conectar repositorio de GitHub
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Añadir variables de entorno

**Frontend en Netlify:**
1. Crear nuevo sitio
2. Conectar repositorio de GitHub
3. Build command: `npm run build`
4. Publish directory: `build`
5. Añadir variables de entorno (REACT_APP_*)

### Opción 2: Railway (Full Stack)

Railway permite desplegar backend y frontend juntos con base de datos incluida.

### Opción 3: VPS (DigitalOcean, Linode, etc.)

Para control total, usar Docker Compose:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongo:27017
      - DB_NAME=facturacion_db
    depends_on:
      - mongo
  
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_BACKEND_URL=https://api.posahora.com
  
  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

---

**Última actualización:** 23 de Enero de 2026
**Versión:** 1.1
