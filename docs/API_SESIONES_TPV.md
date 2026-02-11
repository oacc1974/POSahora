# API de Sesiones, TPV e Impresión de Cocina - Documentación para APK

**Última actualización:** 11 Febrero 2026

---

## Índice
1. [Flujo de Autenticación POS](#flujo-de-autenticación-pos)
2. [Endpoints de Autenticación](#endpoints-de-autenticación)
3. [Estados de Sesión y TPV](#estados-de-sesión-y-tpv)
4. [Reglas de Negocio](#reglas-de-negocio)
5. [Sistema de Impresoras de Cocina](#sistema-de-impresoras-de-cocina) ⭐ NUEVO
6. [Ejemplo de Implementación APK](#ejemplo-de-implementación-apk)

---

## Flujo de Autenticación POS

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE LOGIN POS                           │
├─────────────────────────────────────────────────────────────────┤
│  1. VERIFICAR TIENDA                                            │
│     GET /api/tienda/verificar/{codigo}                          │
│     → Retorna: nombre tienda, organización                      │
│                                                                 │
│  2. VALIDAR PIN Y OBTENER TPVs                                  │
│     POST /api/auth/validar-pin                                  │
│     → Retorna: usuario, TPVs disponibles, sesión pausada        │
│                                                                 │
│  3. LOGIN COMPLETO CON TPV                                      │
│     POST /api/auth/login-pin                                    │
│     → Retorna: token, session_id, usuario, TPV asignado         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Endpoints de Autenticación

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

**Respuesta exitosa (200) - Sin sesión previa:**
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

**Respuesta con sesión pausada (caja abierta):**
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

**Errores (409 Conflict):**

- `SESSION_ACTIVE`: Usuario tiene sesión activa en otro dispositivo
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
      "dispositivo": "Computadora",
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
  "dispositivo": "APK Android"
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "jwt_token...",
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

**Errores (409 Conflict):**
- `TPV_RESERVED`: TPV reservado por otro usuario con caja abierta
- `TPV_BUSY`: TPV en uso por otro usuario

---

### 4. Cerrar Sesión POS

```http
POST /api/auth/logout-pos
Authorization: Bearer {token}
```

**Respuesta - Sin caja abierta (sesión cerrada):**
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

## Estados de Sesión y TPV

### Estados de Sesión

| Estado | Descripción |
|--------|-------------|
| `activa` | Usuario logueado y trabajando |
| `pausada` | Usuario salió pero tiene caja abierta (TPV reservado) |
| `cerrada` | Sesión terminada correctamente |
| `cerrada_por_admin` | Admin forzó el cierre del TPV |

### Estados de TPV

| Estado | Descripción |
|--------|-------------|
| `disponible` | TPV libre para cualquier usuario |
| `ocupado` | TPV en uso por un usuario activo |
| `pausado` | TPV reservado (usuario salió sin cerrar caja) |

---

## Reglas de Negocio

1. **Un usuario = Un TPV**: Cada usuario solo puede estar en un TPV a la vez
2. **Un TPV = Un usuario**: Cada TPV solo puede tener un usuario activo
3. **Caja abierta = TPV reservado**: Si un usuario sale sin cerrar caja, el TPV queda reservado para él
4. **Solo el mismo usuario puede volver**: Un TPV pausado solo acepta al usuario que dejó la caja abierta
5. **Admin puede liberar TPVs**: El propietario puede forzar el cierre de un TPV ocupado

---

## Endpoints de Administración

### Ver Estado de TPVs (Solo Admin)
```http
GET /api/tpv/estado-sesiones
Authorization: Bearer {token_admin}
```

### Liberar TPV Forzadamente (Solo Admin)
```http
POST /api/tpv/{tpv_id}/liberar
Authorization: Bearer {token_admin}
```

---

## Sistema de Impresoras de Cocina

⭐ **NUEVO - Febrero 2026**

### Arquitectura

El sistema usa una arquitectura **cloud-to-local** donde:
1. El **backend en la nube** almacena las órdenes de impresión pendientes
2. La **APK/QZ Tray local** consulta (polling) las órdenes pendientes
3. La **APK/QZ Tray** envía los datos a las impresoras locales (IP o USB)

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
│   │  (Nube)      │         │  (Local)     │                    │
│   └──────────────┘         └──────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configuración en la Web

El propietario configura desde `Configuración → Funciones`:
1. Activar toggle "Impresoras de cocina"
2. Ir a `Configuración → Impresoras de cocina`
3. Crear "Grupos de Impresora" asociando categorías de productos

**Importante:** La configuración de IP/Puerto de las impresoras se hace EN LA APK LOCAL, no en la web.

---

### Endpoints para la APK

#### 1. Verificar si impresoras de cocina están habilitadas

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
  "impresoras_cocina": true,   // ← VERIFICAR ESTO
  "pantalla_clientes": false,
  "mesas_por_mesero": false,
  "facturacion_electronica": false,
  "tickets_abiertos_count": 0
}
```

Si `impresoras_cocina` es `false`, no mostrar funcionalidad de impresión.

---

#### 2. Obtener grupos de impresora configurados

```http
GET /api/grupos-impresora
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "a5198f78-2b16-4c01-a936-1f03a3194f68",
    "nombre": "Cocina Principal",
    "categorias": ["uuid-categoria-1", "uuid-categoria-2"],
    "categorias_nombres": ["Platos Principales", "Entradas"],
    "organizacion_id": "org_uuid",
    "creado": "2026-02-11T04:27:12Z"
  },
  {
    "id": "b6289g89-3c27-5d12-b047-2g14b4205g79",
    "nombre": "Bar",
    "categorias": ["uuid-categoria-bebidas"],
    "categorias_nombres": ["Bebidas"],
    "organizacion_id": "org_uuid",
    "creado": "2026-02-11T05:00:00Z"
  }
]
```

La APK debe:
1. Obtener esta lista al iniciar
2. Permitir al usuario configurar IP/Puerto para cada grupo
3. Guardar la configuración localmente

---

#### 3. Consultar órdenes pendientes de impresión (POLLING)

```http
GET /api/impresion/ordenes-pendientes
Authorization: Bearer {token}
```

**Respuesta (estructura por grupos):**
```json
{
  "grupos": [
    {
      "grupo_id": "a5198f78-2b16-4c01-a936-1f03a3194f68",
      "grupo_nombre": "Cocina Principal",
      "ordenes": [
        {
          "ticket_id": "ticket_uuid",
          "numero": 123,
          "mesa": "Mesa 5",
          "mesero": "Juan Pérez",
          "notas": "Cliente VIP",
          "creado": "2026-02-11T12:30:00Z",
          "items": [
            {
              "producto_id": "prod_uuid",
              "nombre": "Hamburguesa Clásica",
              "cantidad": 2,
              "notas": "Sin cebolla",
              "modificadores": []
            },
            {
              "producto_id": "prod_uuid2",
              "nombre": "Papas Fritas",
              "cantidad": 1,
              "notas": "",
              "modificadores": []
            }
          ]
        }
      ]
    },
    {
      "grupo_id": "b6289g89-3c27-5d12-b047-2g14b4205g79",
      "grupo_nombre": "Bar",
      "ordenes": [
        {
          "ticket_id": "ticket_uuid2",
          "numero": 124,
          "mesa": "Barra",
          "mesero": "María López",
          "notas": null,
          "creado": "2026-02-11T12:35:00Z",
          "items": [
            {
              "producto_id": "bebida_uuid",
              "nombre": "Cerveza Artesanal",
              "cantidad": 3,
              "notas": "",
              "modificadores": []
            }
          ]
        }
      ]
    }
  ],
  "timestamp": "2026-02-11T12:30:05Z"
}
```

**Respuesta vacía (sin órdenes pendientes):**
```json
{
  "grupos": [],
  "timestamp": "2026-02-11T12:30:05Z"
}
```

**Frecuencia de polling recomendada:** Cada 3-5 segundos

---

#### 4. Marcar orden como impresa

```http
POST /api/impresion/marcar-impresa/{orden_id}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "message": "Orden marcada como impresa",
  "orden_id": "orden_uuid"
}
```

---

### Flujo de Impresión en la APK

```
┌─────────────────────────────────────────────────────────────────┐
│              FLUJO DE IMPRESIÓN EN APK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AL INICIAR LA APK:                                          │
│     - Verificar que impresoras_cocina esté activo               │
│     - Obtener lista de grupos de impresora                      │
│     - Cargar configuración local de IPs/Puertos                 │
│                                                                 │
│  2. CONFIGURACIÓN (pantalla de ajustes):                        │
│     - Mostrar lista de grupos                                   │
│     - Permitir configurar IP/Puerto para cada grupo             │
│     - Opción de prueba de impresora                            │
│     - Guardar configuración localmente                          │
│                                                                 │
│  3. SERVICIO DE POLLING (en background):                        │
│     - Cada 3-5 segundos: GET /api/impresion/ordenes-pendientes  │
│     - Si hay órdenes nuevas:                                    │
│       a. Buscar configuración de impresora para el grupo        │
│       b. Enviar comanda a la impresora                         │
│       c. POST /api/impresion/marcar-impresa/{orden_id}         │
│                                                                 │
│  4. FORMATO DE COMANDA:                                         │
│     ┌────────────────────────────┐                             │
│     │   *** COCINA ***           │                             │
│     │                            │                             │
│     │   Mesa: Mesa 5             │                             │
│     │   Mesero: Juan Pérez       │                             │
│     │   Hora: 12:30              │                             │
│     │   Tipo: Para cenar aquí    │                             │
│     │                            │                             │
│     │   2x Hamburguesa Clásica   │                             │
│     │      → Sin cebolla         │                             │
│     │   1x Papas Fritas          │                             │
│     │                            │                             │
│     │   #001-001-000000123       │                             │
│     └────────────────────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Ejemplo de Código de Polling (JavaScript/React Native)

```javascript
// KitchenPrintService.js

class KitchenPrintService {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.printerConfigs = {}; // { grupoId: { ip, port } }
    this.pollingInterval = null;
  }

  // Cargar configuración de impresoras desde storage local
  async loadPrinterConfigs() {
    const saved = await AsyncStorage.getItem('printer_configs');
    if (saved) {
      this.printerConfigs = JSON.parse(saved);
    }
  }

  // Guardar configuración de impresora para un grupo
  async savePrinterConfig(grupoId, ip, port) {
    this.printerConfigs[grupoId] = { ip, port };
    await AsyncStorage.setItem('printer_configs', JSON.stringify(this.printerConfigs));
  }

  // Verificar si impresoras de cocina están activas
  async isKitchenPrintingEnabled() {
    const response = await fetch(`${this.apiUrl}/api/funciones`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    const data = await response.json();
    return data.impresoras_cocina === true;
  }

  // Obtener grupos de impresora
  async getPrinterGroups() {
    const response = await fetch(`${this.apiUrl}/api/grupos-impresora`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  // Consultar órdenes pendientes (agrupadas por grupo de impresora)
  async getPendingOrders() {
    const response = await fetch(`${this.apiUrl}/api/impresion/ordenes-pendientes`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  // Marcar ticket como impreso
  async markAsPrinted(ticketId) {
    await fetch(`${this.apiUrl}/api/impresion/marcar-impresa/${ticketId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
  }

  // Enviar a impresora térmica (implementar según tu librería)
  async printToThermal(ip, port, content) {
    // Usar librería como react-native-thermal-printer
    // o enviar por socket TCP al puerto de la impresora
    console.log(`Imprimiendo en ${ip}:${port}`, content);
  }

  // Formatear comanda para impresión
  formatKitchenTicket(grupoNombre, orden) {
    let text = '';
    text += `*** ${grupoNombre.toUpperCase()} ***\n`;
    text += '\n';
    if (orden.mesa) {
      text += `Mesa: ${orden.mesa}\n`;
    }
    if (orden.mesero) {
      text += `Mesero: ${orden.mesero}\n`;
    }
    text += `Hora: ${new Date(orden.creado).toLocaleTimeString()}\n`;
    if (orden.notas) {
      text += `Notas: ${orden.notas}\n`;
    }
    text += '\n';
    
    for (const item of orden.items) {
      text += `${item.cantidad}x ${item.nombre}\n`;
      if (item.notas) {
        text += `   → ${item.notas}\n`;
      }
      if (item.modificadores && item.modificadores.length > 0) {
        for (const mod of item.modificadores) {
          text += `   + ${mod}\n`;
        }
      }
    }
    
    text += '\n';
    text += `#${orden.numero}\n`;
    text += '\n\n\n'; // Espacio para corte
    
    return text;
  }

  // Procesar órdenes de un grupo
  async processGrupo(grupo) {
    const config = this.printerConfigs[grupo.grupo_id];
    
    if (!config) {
      console.warn(`No hay impresora configurada para ${grupo.grupo_nombre}`);
      return;
    }

    for (const orden of grupo.ordenes) {
      try {
        const content = this.formatKitchenTicket(grupo.grupo_nombre, orden);
        await this.printToThermal(config.ip, config.port, content);
        await this.markAsPrinted(orden.ticket_id);
        console.log(`Ticket ${orden.ticket_id} impreso en ${grupo.grupo_nombre}`);
      } catch (error) {
        console.error(`Error imprimiendo ticket ${orden.ticket_id}:`, error);
      }
    }
  }

  // Iniciar servicio de polling
  startPolling(intervalMs = 3000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const { grupos } = await this.getPendingOrders();
        
        for (const grupo of grupos) {
          if (grupo.ordenes && grupo.ordenes.length > 0) {
            await this.processGrupo(grupo);
          }
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, intervalMs);

    console.log(`Polling iniciado cada ${intervalMs}ms`);
  }

  // Detener servicio de polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('Polling detenido');
  }
}

// Uso en la APK:
const printService = new KitchenPrintService(
  'https://tu-dominio.com',
  'jwt_token_aqui'
);

// Al iniciar la app
await printService.loadPrinterConfigs();
const enabled = await printService.isKitchenPrintingEnabled();
if (enabled) {
  printService.startPolling(3000);
}
```

---

### Ejemplo para QZ Tray (Windows/Mac)

```javascript
// Para usar con QZ Tray en PC Windows/Mac
// Requiere qz-tray instalado: https://qz.io/

const API_URL = 'https://tu-api.com';
let token = 'tu_jwt_token';

// Configuración de impresoras por grupo
// El usuario configura esto en la interfaz local
const printerConfigs = {
  'grupo_cocina_id': 'EPSON TM-T20II',
  'grupo_bar_id': 'Star TSP100'
};

async function setupQZTray() {
  // Conectar a QZ Tray
  await qz.websocket.connect();
  
  // Función para imprimir en una impresora específica
  async function printToKitchen(printerName, content) {
    const config = qz.configs.create(printerName);
    const data = [
      { type: 'raw', format: 'plain', data: content }
    ];
    await qz.print(config, data);
  }
  
  // Formatear ticket de cocina
  function formatTicket(grupoNombre, orden) {
    let text = '';
    text += `*** ${grupoNombre.toUpperCase()} ***\n`;
    text += '\n';
    if (orden.mesa) text += `Mesa: ${orden.mesa}\n`;
    if (orden.mesero) text += `Mesero: ${orden.mesero}\n`;
    text += `Hora: ${new Date(orden.creado).toLocaleTimeString()}\n`;
    if (orden.notas) text += `Notas: ${orden.notas}\n`;
    text += '\n';
    
    for (const item of orden.items) {
      text += `${item.cantidad}x ${item.nombre}\n`;
      if (item.notas) text += `   -> ${item.notas}\n`;
    }
    
    text += '\n';
    text += `#${orden.numero}\n`;
    text += '\n\n\n';
    
    return text;
  }
  
  // Polling al servidor
  setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/api/impresion/ordenes-pendientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const { grupos } = await response.json();
      
      for (const grupo of grupos) {
        const printerName = printerConfigs[grupo.grupo_id];
        if (!printerName) {
          console.warn(`Sin impresora para grupo: ${grupo.grupo_nombre}`);
          continue;
        }
        
        for (const orden of grupo.ordenes) {
          const ticket = formatTicket(grupo.grupo_nombre, orden);
          await printToKitchen(printerName, ticket);
          
          // Marcar como impresa
          await fetch(`${API_URL}/api/impresion/marcar-impresa/${orden.ticket_id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          console.log(`Impreso ticket ${orden.ticket_id} en ${printerName}`);
        }
      }
    } catch (error) {
      console.error('Error en polling:', error);
    }
  }, 3000);
}

// Iniciar cuando la página cargue
setupQZTray();
```

---

## Ejemplo Completo de Implementación APK

```javascript
// app.js - Ejemplo completo

// =====================
// 1. AUTENTICACIÓN
// =====================

// 1.1 Verificar tienda
const tienda = await fetch(`${API}/api/tienda/verificar/${codigo}`);

// 1.2 Validar PIN y obtener TPVs
const validacion = await fetch(`${API}/api/auth/validar-pin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin, codigo_tienda })
});

// 1.3 Si hay sesión pausada, ir directo al TPV reservado
if (validacion.sesion_pausada) {
  selectedTpvId = validacion.sesion_pausada.tpv_id;
} else {
  // Mostrar selector de TPV al usuario
  const tpvs = validacion.tpvs_disponibles;
  selectedTpvId = await showTpvSelector(tpvs);
}

// 1.4 Login con TPV seleccionado
const login = await fetch(`${API}/api/auth/login-pin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    pin, 
    codigo_tienda, 
    tpv_id: selectedTpvId,
    dispositivo: 'APK Android v1.0'
  })
});

// 1.5 Guardar credenciales
const { access_token, session_id, tpv } = login;
await AsyncStorage.setItem('token', access_token);
await AsyncStorage.setItem('session_id', session_id);
await AsyncStorage.setItem('tpv_asignado', JSON.stringify(tpv));

// =====================
// 2. IMPRESIÓN DE COCINA
// =====================

// 2.1 Verificar si está habilitada
const funciones = await fetch(`${API}/api/funciones`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const { impresoras_cocina } = await funciones.json();

if (impresoras_cocina) {
  // 2.2 Cargar grupos de impresora
  const grupos = await fetch(`${API}/api/grupos-impresora`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  
  // 2.3 Iniciar servicio de polling
  const printService = new KitchenPrintService(API, access_token);
  await printService.loadPrinterConfigs();
  printService.startPolling(3000);
}
```

---

## Notas Importantes para la APK

1. **Token de autenticación:** Usar `access_token` (no `token`) del login
2. **Guardar session_id:** Necesario para verificar si la sesión sigue activa
3. **Guardar tpv_asignado:** El TPV ya viene asignado, no pedir al abrir caja
4. **Manejar código 409:** Mostrar diálogo de conflicto de sesión
5. **Logout automático:** Si `GET /api/auth/verificar-sesion` retorna `valida: false`, cerrar sesión local
6. **Polling de impresión:** Solo iniciar si `impresoras_cocina` está activo
7. **Configuración de impresoras:** Las IPs y puertos se configuran y guardan localmente en la APK
8. **Reconexión:** Si el polling falla, reintentar con backoff exponencial

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 11 Feb 2026 | Añadida documentación de Sistema de Impresoras de Cocina |
| 30 Ene 2026 | Documento inicial con flujo de autenticación y sesiones |
