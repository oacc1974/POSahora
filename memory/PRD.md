# Sistema POS - Product Requirements Document

## Problema Original
Sistema de Punto de Venta (POS) multi-tenant con las siguientes características principales:
- **Roles y Multi-tenancy:** Propietario gestiona empleados (Admin, Cajero, Mesero), productos, clientes y facturas aislados por organización
- **Autenticación:** Registro manual (usuario/contraseña) y Google OAuth
- **Gestión de Tiendas (Sucursales):** CRUD con código de establecimiento para facturación SRI
- **Gestión de Dispositivos TPV:** Nombre, punto de emisión, asociado a tienda, estado activo/ocupado
- **Flujo de Caja:** Apertura/cierre de caja con selección de TPV disponible
- **Facturación SRI:** Formato `código_establecimiento`-`punto_emisión`-`número_secuencial`
- **Reportes Avanzados:** Filtros por fecha, cajero, tienda, TPV con gráficos

## Stack Tecnológico
- **Frontend:** React 19, TailwindCSS, Shadcn/UI, Recharts
- **Backend:** FastAPI, Motor (async MongoDB)
- **Base de Datos:** MongoDB
- **Autenticación:** JWT + Google OAuth (emergentintegrations)

## Arquitectura de Código
```
/app/
├── backend/
│   └── server.py          # FastAPI monolito (~2500 líneas)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DateRangePicker.js   # Selector de rango de fechas
│       │   └── ui/                  # Shadcn components
│       └── pages/
│           ├── Reportes.js          # Reportes con DateRangePicker
│           ├── Dashboard.js         # Dashboard con filtros
│           ├── POS.js               # Punto de venta
│           └── config/
│               ├── ConfigFunciones.js   # 7 funciones del sistema
│               ├── ConfigTiendas.js     # CRUD Tiendas
│               └── ConfigTPV.js         # CRUD TPV
└── memory/
    └── PRD.md
```

## Funcionalidades Implementadas

### Completadas (13 Enero 2026)
- [x] **Selector de Rango de Fechas Personalizado** - DateRangePicker con:
  - Calendario interactivo (react-day-picker)
  - 8 opciones predefinidas: Hoy, Ayer, Esta semana, La semana pasada, Este mes, Mes pasado, Últimos 7 días, Últimos 30 días
  - Navegación con flechas prev/next
  - Botones CANCELAR/HECHO
  - Integrado en página de Reportes

- [x] **3 Nuevas Funciones en Configuración:**
  - Función de reloj (registro entrada/salida empleados)
  - Impresoras de cocina (envío pedidos a cocina)
  - Pantalla para clientes (display secundario)
  - Backend actualizado con GET/PUT /api/funciones

### Anteriormente Completadas
- [x] Autenticación manual + Google OAuth
- [x] Gestión de Tiendas (CRUD completo)
- [x] Gestión de TPV (CRUD completo)
- [x] Flujo de caja con selección de TPV
- [x] Facturación SRI con numeración secuencial
- [x] Validación única de clientes por cédula/RUC
- [x] Rol "Mesero" implementado
- [x] Página de Reportes con gráficos (Recharts)
- [x] Filtros en Dashboard

## Backlog (Próximas Tareas)

### P1 - Próximas
- [ ] Completar lógica de "Función de reloj" (UI de fichaje)
- [ ] Completar lógica de "Impresoras de cocina" (integración impresoras)
- [ ] Completar lógica de "Pantalla para clientes" (display secundario)

### P2 - Futuras
- [ ] Subir logo de organización para recibo
- [ ] Mejorar escaneo de código de barras con cámara móvil

### P3 - Backlog
- [ ] Sistema de reembolsos
- [ ] Múltiples métodos de pago por factura
- [ ] Reportes exportables (PDF/Excel)

## Colecciones MongoDB
- `organizaciones` - Multi-tenant container
- `usuarios` - Empleados con roles
- `tiendas` - Sucursales con código_establecimiento
- `tpvs` - Dispositivos de punto de venta
- `cajas` - Sesiones de caja (apertura/cierre)
- `facturas` - Ventas con numeración SRI
- `productos` - Catálogo de productos
- `clientes` - Base de clientes
- `funciones_config` - Configuración de funciones por organización

## Credenciales de Prueba
- **Usuario:** admin
- **Contraseña:** admin*88
- **Rol:** Propietario

## Integraciones de Terceros
- **Google Auth:** emergentintegrations library
- **Recharts:** Gráficos en reportes

## Test Reports
- `/app/test_reports/iteration_2.json` - Tests de DateRangePicker y ConfigFunciones
- `/app/tests/test_funciones_api.py` - Pytest para API de funciones
