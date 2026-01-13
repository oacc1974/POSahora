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

## Funcionalidades Implementadas

### Completadas (13 Enero 2026)

- [x] **Rediseño completo del TPV:**
  - **Nueva pantalla de cobro** con panel dual (Recibo izquierda, Pago derecha)
  - **Botones de billetes dinámicos** calculados según el total
  - **Cálculo de cambio** automático cuando el efectivo recibido es mayor
  - **Sin opción de enviar correo** en la pantalla de cobro
  - **Tema azul** en toda la UI (headers, botones, acentos)
  - **Sidebar oculto por defecto** - solo visible con menú hamburguesa
  - **Menú hamburguesa funcional** con opciones: Despejar, Dividir, Combinar, Sincronizar
  - **Botón TICKETS/GUARDAR dinámico** cambia según estado del carrito (desktop y móvil)
  - **Contador de artículos** suma cantidades totales en la barra inferior móvil

- [x] **Corrección de Funciones del Menú del TPV:**
  - Dividir Ticket: Permite mover productos seleccionados a un nuevo ticket
  - Combinar Ticket: Combina tickets abiertos con el ticket actual (bug fix: subtotal ahora se muestra correctamente)
  - Despejar Ticket: Vacía el carrito actual
  - Guardar Ticket: Guarda el carrito como ticket abierto (mesa o personalizado)
  - Lógica de botones GUARDAR/TICKETS: Cambia correctamente según estado del carrito
  - Contador de artículos móvil: Suma cantidades totales (no solo líneas de producto)

- [x] **Selector de Rango de Fechas Personalizado** - DateRangePicker con:
  - Calendario interactivo (react-day-picker)
  - 8 opciones predefinidas: Hoy, Ayer, Esta semana, La semana pasada, Este mes, Mes pasado, Últimos 7 días, Últimos 30 días
  - Navegación con flechas prev/next
  - Botones CANCELAR/HECHO

- [x] **3 Nuevas Funciones en Configuración:**
  - Función de reloj (registro entrada/salida empleados)
  - Impresoras de cocina (envío pedidos a cocina)
  - Pantalla para clientes (display secundario)

- [x] **Gráficos con Recharts corregidos:**
  - Resumen de ventas: AreaChart verde con gradiente
  - Ventas por artículo: LineChart azul con puntos
  - Ventas por categoría: BarChart con colores variados
  - Todos usando ResponsiveContainer, Tooltip, ejes formateados

### Anteriormente Completadas
- [x] Autenticación manual + Google OAuth
- [x] Gestión de Tiendas y TPV (CRUD completo)
- [x] Flujo de caja con selección de TPV
- [x] Facturación SRI con numeración secuencial
- [x] Validación única de clientes por cédula/RUC
- [x] Rol "Mesero" implementado

## Backlog

### P1 - Próximas
- [ ] Extender selectores de tipo de gráfico (Área/Barra) y agrupación (Días/Semanas) a reportes de "Ventas por artículo" y "Ventas por categoría"
- [ ] Lógica interna de "Función de reloj" (UI de fichaje)
- [ ] Lógica interna de "Impresoras de cocina"
- [ ] Lógica interna de "Pantalla para clientes"

### P2 - Futuras
- [ ] Subir logo de organización para recibo
- [ ] Escaneo de código de barras mejorado

## Credenciales de Prueba
- **Usuario:** admin
- **Contraseña:** admin*88

## Test Reports
- `/app/test_reports/iteration_3.json` - Tests de funciones del menú del TPV (Dividir, Combinar, Despejar, Guardar) - 100% passed
- `/app/test_reports/iteration_2.json` - Tests de DateRangePicker y ConfigFunciones
- `/app/tests/test_funciones_api.py` - Pytest para API de funciones
