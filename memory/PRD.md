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

### Completadas (15 Enero 2026)

- [x] **Bug Fix: Errores de React Hooks en páginas responsivas**
  - **Problema:** Las páginas `/productos` y `/facturas` mostraban error "Rendered more hooks than during the previous render"
  - **Causa:** Variables `useState` declaradas después de retornos condicionales (`if (loading) return ...`)
  - **Solución:** Movidos los hooks `showMobileMenu` y `showDetail` al inicio de los componentes, antes de cualquier return

- [x] **Verificación de responsividad móvil completa**
  - `/reportes`: Menú colapsable azul con botón CSV funcional ✓
  - `/productos`: Menú lateral colapsable con secciones de productos, categorías, modificadores, descuentos ✓
  - `/facturas`: Lista de recibos adaptada con vista compacta en móvil ✓
  - `/configuracion`: Menú colapsable con todas las secciones de configuración ✓

- [x] **Selectores de gráficos extendidos a todos los reportes**
  - **Ventas por artículo:** Añadidos selectores de tipo de gráfico (Área/Bar) y agrupación (Días/Semanas)
  - **Ventas por categoría:** Añadido nuevo gráfico de tendencia con selectores funcionales (Área/Bar, Días/Semanas)
  - Mantiene consistencia con el estilo de "Resumen de ventas"

- [x] **Subir logo de organización para recibo**
  - Nueva sección "Logo del Negocio" en Configuración → Recibo
  - Permite subir imagen JPG, PNG, GIF o WebP (máx. 2MB)
  - Preview del logo subido con opción de eliminar
  - Endpoint backend `/api/config/upload-logo` para guardar logos en `/uploads/logos/`

- [x] **Escaneo de código de barras en creación de productos**
  - Botón "Escanear" junto al campo de código de barras en el diálogo de nuevo producto
  - Soporta múltiples formatos: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, etc.
  - Sonido de confirmación (beep) al detectar un código
  - Feedback visual con indicador de cámara activa

- [x] **Exportar gráficos como imagen**
  - Nuevo botón en cada gráfico de reportes para exportar como PNG
  - Usa html2canvas para captura de alta calidad
  - Nombre de archivo incluye tipo de reporte y fecha

### Completadas (14 Enero 2026)

- [x] **Bug Fix: Página de Configuración de Recibo en blanco**
  - **Problema:** La ruta `/configuracion/recibo` mostraba una página en blanco
  - **Causa:** La ruta con parámetro no estaba definida en React Router
  - **Solución:** Añadida ruta `/configuracion/:seccion` en App.js y actualizado ConfiguracionNew.js para leer el parámetro de la URL
  - **Backend Fix:** El endpoint GET `/api/config` no devolvía el campo `imprimir_ticket` - corregido

- [x] **Nueva opción: Imprimir ticket de venta automáticamente**
  - Checkbox en Configuración → Recibo → Opciones Avanzadas
  - Permite activar/desactivar la impresión automática del ticket de venta
  - Persistido en MongoDB en la colección `configuraciones`

### Completadas (13 Enero 2026)

- [x] **Menú de Navegación por Rol:**
  - **Propietarios/Administradores:** Menú completo con Dashboard, Punto de Venta, Ingresos, Productos, Clientes, y Caja
  - **Cajeros/Meseros:** Menú reducido con solo Punto de Venta y Caja
  - Los cajeros y meseros ahora pueden acceder a la página de Caja para hacer cierre de caja

- [x] **Nuevo Header Unificado para TPV (Desktop y Móvil):**
  - **Menú hamburguesa (☰)** a la izquierda - Abre sidebar de navegación
  - **"Ticket"** en el centro con contador de artículos
  - **Iconos a la derecha:** Cliente (👤) + Menú de opciones (⋮ 3 puntos verticales)
  - **Menú de navegación** diferenciado por rol
  - **Menú de opciones del ticket** con: Despejar, Dividir, Combinar, Sincronizar

- [x] **Indicador de Cajero:**
  - Se muestra en la **esquina inferior izquierda** de todas las pantallas
  - Formato: "Cajero: [nombre del TPV/caja]"
  - Diseño con fondo blanco semi-transparente y sombra

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
- [x] ~~Extender selectores de tipo de gráfico (Área/Barra) y agrupación (Días/Semanas) a reportes de "Ventas por artículo" y "Ventas por categoría"~~ ✓ Completado 15 Enero 2026
- [x] ~~Subir logo de organización para recibo~~ ✓ Completado 15 Enero 2026
- [x] ~~Mejorar escaneo de código de barras~~ ✓ Completado 15 Enero 2026
- [x] ~~Exportar gráficos como imagen~~ ✓ Completado 15 Enero 2026
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
- `/app/test_reports/iteration_5.json` - Tests del nuevo header unificado y cajero indicator - 100% passed
- `/app/test_reports/iteration_4.json` - Tests de UI del TPV (diálogo de cobro, botones billetes, tema azul) - 100% passed
- `/app/test_reports/iteration_3.json` - Tests de funciones del menú del TPV (Dividir, Combinar, Despejar, Guardar) - 100% passed
- `/app/test_reports/iteration_2.json` - Tests de DateRangePicker y ConfigFunciones
- `/app/tests/test_funciones_api.py` - Pytest para API de funciones
