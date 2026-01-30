# API de Sesiones y TPV - Documentación

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

## Endpoints

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
  "dispositivo": "Computadora"
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

## Estados de Sesión

| Estado | Descripción |
|--------|-------------|
| `activa` | Usuario logueado y trabajando |
| `pausada` | Usuario salió pero tiene caja abierta (TPV reservado) |
| `cerrada` | Sesión terminada correctamente |
| `cerrada_por_admin` | Admin forzó el cierre del TPV |

---

## Estados de TPV

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

## Ejemplo de Implementación (APK/Mobile)

```javascript
// 1. Verificar tienda
const tienda = await fetch(`${API}/api/tienda/verificar/${codigo}`);

// 2. Validar PIN y obtener TPVs
const validacion = await fetch(`${API}/api/auth/validar-pin`, {
  method: 'POST',
  body: JSON.stringify({ pin, codigo_tienda })
});

// 3. Mostrar selector de TPV al usuario
const tpvs = validacion.tpvs_disponibles;
// Si sesion_pausada != null, ir directo al TPV reservado

// 4. Login con TPV seleccionado
const login = await fetch(`${API}/api/auth/login-pin`, {
  method: 'POST',
  body: JSON.stringify({ 
    pin, 
    codigo_tienda, 
    tpv_id: selectedTpv.id,
    dispositivo: 'APK Android'
  })
});

// 5. Guardar token y session_id
localStorage.setItem('token', login.access_token);
localStorage.setItem('session_id', login.session_id);
localStorage.setItem('tpv_asignado', JSON.stringify(login.tpv));
```

---

## Notas para APK

1. **Guardar session_id**: Necesario para verificar si la sesión sigue activa
2. **Guardar tpv_asignado**: El TPV ya viene asignado, no pedir al abrir caja
3. **Manejar código 409**: Mostrar diálogo de conflicto de sesión
4. **Logout automático**: Si `GET /api/auth/verificar-sesion` retorna `valida: false`, cerrar sesión local
