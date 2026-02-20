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
- **Autenticación:** JWT + Google OAuth propio (para despliegue externo)

## Funcionalidades Implementadas

### Completadas (20 Febrero 2026)

- [x] **VISTA DE LISTA PARA PRODUCTOS - COMPLETADO**
  - **Botones de alternar vista:** Toggle entre vista de tarjetas (grid) y vista de lista (tabla) en la página de productos
  - **Vista de lista compacta:** Tabla con columnas Producto, Categoría, Precio, Costo, Stock, Acciones
  - **Mini representación visual:** Cada fila muestra el color/forma o imagen miniatura del producto
  - **Acciones rápidas:** Botones de editar y eliminar en cada fila
  - **Contador:** Muestra "Mostrando X producto(s)" al pie de la tabla
  - **Nuevo campo Costo:** Agregado campo "Costo" al modelo de producto y al formulario (Precio, Costo, Stock en una fila)
  - **Archivos modificados:** `Productos.js`, `server.py`

### Completadas (30 Enero 2026)

- [x] **MEJORAS P0 - IMPRESIÓN Y DATOS DE CLIENTE - COMPLETADO**
  - **Espacio de corte reducido:** Se redujo el espacio extra al final del ticket de impresión (de ~120px+15br a ~40px+3br)
  - **Datos del cliente siempre visibles:** Ahora los tickets reimpresos desde Reportes siempre muestran los datos del cliente
  - **Nuevo endpoint:** `GET /api/clientes/id/{cliente_id}` para buscar cliente por ID
  - **Archivos modificados:** `POS.js`, `Reportes.js`, `server.py`

- [x] **SISTEMA DE SESIONES POR TPV - COMPLETADO**
  - **Flujo nuevo de login:** 1) Código tienda → 2) PIN → 3) Seleccionar TPV → 4) Entrar al POS
  - **Un usuario = Un TPV:** Cada usuario solo puede estar en un TPV a la vez
  - **Sesión PAUSADA:** Si sale sin cerrar caja, el TPV queda reservado hasta que vuelva
  - **Nuevo endpoint:** `POST /api/auth/validar-pin` - Valida PIN y retorna TPVs disponibles
  - **TPV asignado en login:** El TPV se guarda en `sessionStorage` y se usa automáticamente al abrir caja
  - **Panel admin:** Endpoint para ver estado de todos los TPVs y liberar forzadamente
  - **Documentación:** `/app/docs/API_SESIONES_TPV.md` con flujo completo para APK
  - **Archivos modificados:** `LoginPOS.js`, `POS.js`, `server.py`

- [x] **MEJORAS DE IMPRESIÓN DE TICKETS**
  - **Ancho configurable:** 58mm o 80mm en Configuración → Recibo
  - **Espacio para corte:** Espacio adicional al final del ticket (ajustado a preferencia del usuario)
  - **Verificación de popup:** Mensaje amigable si el navegador bloquea la ventana

### Completadas (28 Enero 2026)

- [x] **BUGFIX P0 - Flujo de Guardar Ticket para Meseros - CORREGIDO**
  - **Problema:** Los meseros recibían el error "Debes abrir una caja antes de guardar tickets" al intentar guardar tickets
  - **Causa raíz:** Condición de carrera en el frontend - el estado `cajaActiva` no se configuraba a tiempo para meseros
  - **Solución:** 
    1. Se configura la "caja virtual" inmediatamente en el `useEffect` cuando el usuario es mesero
    2. Se agregó doble verificación del rol en `handleGuardarTicket` usando tanto el estado como `sessionStorage`
  - **Archivos modificados:** `/app/frontend/src/pages/POS.js`
  - **Tests:** 5/5 tests pasados (iteration_9.json)
  - **Verificado:** El mesero puede guardar tickets sin necesidad de abrir caja

- [x] **MÓDULO DE SEGURIDAD PARA EMPLEADOS - COMPLETADO**
  - **6 Perfiles predeterminados del sistema:** Propietario, Administrador, Cajero, Mesero, Supervisor, Cocinero
  - **Perfiles del sistema protegidos:** No se pueden editar ni eliminar
  - **Perfiles personalizados:** El propietario puede crear perfiles con permisos específicos
  - **15 permisos POS:** ver_productos, agregar_ticket, guardar_ticket, recuperar_tickets_propios, recuperar_tickets_otros, cobrar, facturar_electronico, aplicar_descuentos, eliminar_items, anular_ventas, abrir_caja, cerrar_caja_propia, cerrar_caja_otros, dividir_ticket, cambiar_precio
  - **18 permisos Backoffice:** ver_dashboard, ver_reportes, ver_reportes_propios, ver_productos, gestionar_productos, gestionar_categorias, ver_clientes, gestionar_clientes, gestionar_empleados, ver_configuracion, gestionar_configuracion, gestionar_tpv, gestionar_tiendas, gestionar_metodos_pago, gestionar_impuestos, ver_facturacion_electronica, gestionar_facturacion_electronica, gestionar_perfiles
  - **UI rediseñada:** Página `/usuarios` con pestañas "Empleados" y "Perfiles y Permisos"
  - **Asignación de perfiles:** Al crear/editar empleados se puede seleccionar su perfil
  - **Auto-asignación:** Si no se especifica perfil, se asigna automáticamente según el rol
  - **Tests:** 21/21 tests de backend pasados, UI completamente funcional

### Completadas (27 Enero 2026)

- [x] **NOTAS DE CRÉDITO - FUNCIONANDO CORRECTAMENTE**
  - **Bug Fix P0 Solucionado:** Error "FIRMA INVALIDA" corregido
  - **Causa raíz:** El XML se generaba con `pretty_print=True` (saltos de línea) lo que invalidaba la firma digital
  - **Solución:** Cambiado a `pretty_print=False` en `/app/backend-fe/services/xml_generator.py`
  - **Fix adicional:** Se cambió el método de firma para usar el servicio Java (`sign_xml_with_java`) igual que las facturas
  - **Fix de índice:** Se eliminó el índice duplicado `tenant_id_1_doc_number_1` que causaba conflictos
  - **Prueba exitosa:** NC 001-001-000000005 para Oscar Castro - **AUTORIZADA por SRI** ✅
  - **Nota importante:** El SRI NO permite NC para "Consumidor Final" (9999999999999) - Esto es una restricción del SRI, no del sistema
  - **Página de NC:** `/notas-credito` funcionando con listado, estados y acciones
  - **Menú:** Sección "Facturación Electrónica" con submenús "Facturas Electrónicas" y "Notas de Crédito"
  - **Validación frontend:** Mensaje de advertencia cuando se intenta crear NC para Consumidor Final
  - **Validación backend:** HTTP 400 con mensaje claro si se intenta crear NC para Consumidor Final

- [x] **Mejoras en página de Notas de Crédito**
  - **Fix detalle:** Corregido el modal de detalle que mostraba todo en "N/A"
  - **Fix descargas:** Corregidas las funciones de descarga XML y PDF que no funcionaban
  - **Sincronización automática:** Agregada sincronización cada 30 segundos para reintentar documentos pendientes
  - **Motivo correcto:** El motivo ahora se obtiene de `invoice_reference.reason`

- [x] **Tickets diferenciados COBRAR vs FACTURAR**
  - **COBRAR (azul):** Genera "TICKET DE VENTA / COMPROBANTE INTERNO" sin datos del SRI
    - Sin clave de acceso
    - Sin numeración SRI
    - Sin decir "Factura"
    - Incluye leyenda obligatoria: "Este documento NO constituye comprobante tributario"
  - **FACTURAR (verde):** Proceso asíncrono - NO bloquea la venta
    - La venta se registra inmediatamente
    - La FE se procesa en segundo plano
    - El ticket incluye clave de acceso, número de autorización y estado SRI
  - **Fecha en POS:** Se agregó fecha y hora actual en el header (actualiza cada minuto)

- [x] **PDF RIDE con Formato Oficial SRI - COMPLETADO Y PROBADO**
  - **Generador PDF Reimplementado:** Usando reportlab con estructura idéntica al formato oficial del SRI
  - **Secciones del RIDE:**
    - Encabezado con logo (opcional, del POS), razón social, RUC, direcciones, obligado a contabilidad
    - Datos del documento: tipo, número, autorización, fecha/hora autorización, ambiente, emisión
    - Código de barras Code128 con clave de acceso de 49 dígitos
    - Datos del cliente: razón social, identificación, dirección, fecha de emisión
    - Tabla de productos: código principal, cantidad, descripción, precio unitario, descuento, total
    - Totales con desglose completo: SUBTOTAL 15%, 0%, No Objeto IVA, Exento IVA, ICE, IVA 15%, IRBPNR, PROPINA, VALOR TOTAL
    - Forma de pago con códigos SRI
  - **Soporte para Logo:** El logo se obtiene de la configuración del POS si está configurado
  - **Tests:** 13/13 tests pasados para el endpoint de PDF

- [x] **Corrección de Fechas en Lista de Documentos**
  - Las fechas ahora muestran correctamente la fecha de Ecuador (26/01/2026) en lugar de UTC (27/01/2026)
  - Se extrae la fecha de la clave de acceso (formato DDMMAAAA) que ya tiene la fecha correcta de Ecuador

- [x] **Sincronización Automática de Estados SRI**
  - Función que sincroniza automáticamente al cargar la página y cada 30 segundos
  - Botón "Sincronizar SRI" para forzar actualización manual
  - Documentos pendientes ("EN PROCESO") se actualizan a "AUTORIZADO" cuando el SRI los procesa

### Completadas (26 Enero 2026)

- [x] **Sistema de Facturación Electrónica SRI Ecuador - FUNCIONANDO EN PRODUCCIÓN**
  - **Arquitectura de 3 Servicios:**
    1. `backend` (POS): Puerto 8001, proxy para rutas `/api/fe/*`
    2. `backend-fe` (Facturación): Puerto 8002, lógica de FE
    3. `signer-service` (Java): Puerto 8003, firma XAdES-BES con xades4j
  - **Multi-tenancy:** Header `X-Tenant-ID` requerido
  - **Configuración del Emisor:** RUC, razón social, dirección, ambiente (pruebas/producción)
  - **Certificado Digital:** Subida y validación .p12 - **FUNCIONANDO CON CERTIFICADO REAL**
  - **Generación de XML:** Formato SRI v2.1.0 para Facturas (01) y Notas de Crédito (04)
  - **Firma XAdES-BES:** Microservicio Java con xades4j (solución robusta para SRI)
  - **Cliente SOAP:** Comunicación con webservices del SRI
  - **Clave de Acceso:** 49 dígitos con módulo 11
  - **Frontend:** Páginas `/configuracion/facturacion` y `/documentos-electronicos`

- [x] **Fix Bug - "FIRMA INVALIDA"**
  - Solución: Microservicio Java con xades4j para firma XAdES-BES compatible con SRI
  - La firma con Python no era compatible, se creó servicio Java dedicado

- [x] **Fix Bug - "FECHA EMISION EXTEMPORANEA"**
  - Ajuste de zona horaria para usar Ecuador (UTC-5)
  - El SRI valida contra la fecha de Ecuador, no UTC

### Completadas (23 Enero 2026)

- [x] **Google OAuth Propio para Despliegue Externo**
  - Endpoint `POST /api/auth/google` para intercambiar código por token
  - Nuevo componente `GoogleCallback.js` para manejar callback
  - Variables de entorno configurables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - Formulario de registro para usuarios nuevos (nombre del negocio + contraseña)
  - Documentación completa en README_POS_APP.md

- [x] **Mejoras en Cierre de Caja**
  - Diálogo de resumen después del cierre con todos los detalles
  - Botón "Imprimir" para imprimir el resumen
  - Botón "Volver" para regresar a pantalla anterior
  - Botón "Cerrar" para cerrar el diálogo

- [x] **Menú del POS Simplificado**
  - Menú hamburguesa igual para todos los roles
  - Opciones: Punto de Venta, Recibos, Caja
  - "Backoffice" solo visible para Admin/Propietario
  - Iconos simples de lucide-react (sin emojis)

### Completadas (21-22 Enero 2026)

- [x] **Sistema de Login por PIN con Código de Tienda (VERIFICADO)**
  - **Flujo de 2 pasos:** Primero ingresa Código de Tienda, luego PIN
  - Código de tienda se guarda en `localStorage` para no tenerlo que re-ingresar
  - Opción "Cambiar" para usar un código de tienda diferente
  - Pantalla de login con teclado numérico visual
  - También acepta entrada de teclado físico
  - Endpoint `/api/tienda/verificar/{codigo}` para validar código de tienda
  - Endpoint `/api/auth/login-pin` para autenticación por PIN
  - **Bug Fix:** Serialización de ObjectId en respuesta de login (convertir a string)
  - **Bug Fix:** Búsqueda de usuarios compatible con ambos tipos de organizacion_id (ObjectId y string)

- [x] **Sistema de PIN para Empleados**
  - Cajeros y Meseros acceden **obligatoriamente** con PIN de 4 dígitos
  - Propietarios y Administradores pueden **opcionalmente** activar PIN
  - PIN se genera automáticamente al crear cajero/mesero
  - PIN es único por organización (no se puede repetir)
  - Funciones: ver/ocultar PIN, editar PIN, regenerar PIN aleatorio
  - Tarjeta de empleado muestra PIN oculto con botón para revelar

- [x] **Formulario de Empleados mejorado**
  - Para Administradores: muestra campo contraseña + opción de activar PIN
  - Para Cajeros/Meseros: solo campos básicos (nombre, usuario, rol) + mensaje de PIN automático
  - Descripción de roles y permisos

### Completadas (15-16 Enero 2026)

- [x] **Sistema de Descuentos en POS**
  - El logo configurado en Configuración → Recibo ahora aparece en la parte superior del recibo impreso
  - Se muestra tanto en la impresión automática del TPV como en la reimpresión desde Reportes
  - Tamaño máximo: 150px ancho × 80px alto
  - Compatible con formatos JPG, PNG, GIF y WebP

- [x] **Buscador en Productos**
  - Icono de lupa junto al botón "Nuevo Producto"
  - Campo de búsqueda con placeholder "Buscar producto..."
  - Filtra por: nombre, categoría, código de barras, descripción
  - Indicador: "Se encontraron X producto(s) para 'término'"
  - Botón "Limpiar" para resetear la búsqueda

- [x] **Buscador en Clientes**
  - Icono de lupa junto al botón "Nuevo Cliente"
  - Campo de búsqueda con placeholder "Buscar cliente..."
  - Filtra por: nombre, email, teléfono, cédula/RUC, ciudad
  - Indicador: "Se encontraron X cliente(s) para 'término'"
  - Mensaje personalizado si no hay coincidencias

- [x] **Paginación en Reporte de Recibos**
  - Selector de items por página: 10, 20, 50, 100
  - Indicador: "Mostrando X de Y recibos"
  - Navegación completa: Primera, Anterior, Página X de Y, Siguiente, Última
  - Reseteo automático a página 1 al cambiar filtros

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

- [x] **Reembolsos reflejados en reportes**
  - El campo `estado` en facturas indica "completado" o "reembolsado"
  - Dashboard API ahora calcula: ventas brutas, reembolsos, ventas netas
  - **Resumen de ventas**: Muestra Ventas brutas, Reembolsos (negativo rojo), Ventas netas
  - **Ingresos**: Muestra conteo y montos separados de ventas/reembolsos
  - Tabla de Ingresos con indicador visual de estado (verde/rojo) y precio tachado

- [x] **Reorganización de menú de navegación**
  - "Facturas" restaurado en el menú principal
  - Acceso a recibos también disponible en Reportes → Recibos

- [x] **Reporte "Recibos" rediseñado (antes "Ingresos")**
  - Renombrado de "Ingresos" a "Recibos"
  - Tarjetas clickeables para filtrar: Todos, Ventas, Reembolsos
  - Panel lateral con detalle del recibo al hacer clic en una fila
  - Detalle muestra: Total, Info pedido, Artículos, Subtotales, Método de pago
  - Menú de 3 puntos (⋮) con opciones:
    - **Reembolsar**: Abre diálogo con campo para motivo del reembolso
    - **Imprimir**: Abre ventana de impresión con el recibo formateado
  - Filtro visual con borde coloreado en tarjeta seleccionada
  - Corregido endpoint de reembolso (`/api/facturas/{id}/reembolso` con motivo requerido)

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
- [x] ~~Buscador en páginas de Productos y Clientes~~ ✓ Completado 15 Enero 2026
- [x] ~~Paginación en reporte de Recibos~~ ✓ Completado 15 Enero 2026
- [x] ~~Mostrar logo de organización en el recibo impreso~~ ✓ Completado 15 Enero 2026
- [x] ~~Módulo de Seguridad para Empleados (Perfiles y Permisos)~~ ✓ Completado 28 Enero 2026
- [x] ~~Configuración de Impresoras de Cocina~~ ✓ Completado 11 Febrero 2026
- [ ] Crear NC automática al reembolsar venta con factura autorizada (P1)
- [ ] Verificar número de autorización SRI en ticket de POS después de FE asíncrona (P1)
- [ ] Lógica interna de "Función de reloj" (UI de fichaje)
- [ ] Lógica interna de "Pantalla para clientes"
- [ ] Proporcionar ejemplo de código de polling para APK/QZ Tray (P1)

### P2 - Futuras
- [ ] Búsqueda por rango de montos en recibos
- [ ] Enviar recibo por email
- [ ] Convertir aplicación a PWA (Progressive Web App)

## Credenciales de Prueba
- **Usuario:** admin
- **Contraseña:** admin*88

## Test Reports
- `/app/test_reports/iteration_8.json` - Tests del Módulo de Seguridad (Perfiles y Usuarios) - 100% passed (21/21 backend)
- `/app/test_reports/iteration_6.json` - Tests del módulo de Facturación Electrónica - 100% passed (10/10 backend, frontend OK)
- `/app/test_reports/iteration_5.json` - Tests del nuevo header unificado y cajero indicator - 100% passed
- `/app/test_reports/iteration_4.json` - Tests de UI del TPV (diálogo de cobro, botones billetes, tema azul) - 100% passed
- `/app/test_reports/iteration_3.json` - Tests de funciones del menú del TPV (Dividir, Combinar, Despejar, Guardar) - 100% passed
- `/app/test_reports/iteration_2.json` - Tests de DateRangePicker y ConfigFunciones
- `/app/tests/test_funciones_api.py` - Pytest para API de funciones

## Arquitectura de Servicios

```
/app/
├── backend/              # Backend POS principal (puerto 8001)
│   └── server.py         # FastAPI con proxy a backend-fe
├── backend-fe/           # Backend Facturación Electrónica (puerto 8002)
│   ├── server.py         # FastAPI multi-tenant
│   ├── models/           # Modelos Pydantic
│   ├── routes/           # config, documents, health
│   ├── services/         # XML, firma, SOAP, PDF
│   └── utils/            # crypto, validators
└── frontend/             # React 19 (puerto 3000)
    └── src/
        ├── pages/fe/     # ConfiguracionFE, DocumentosElectronicos
        └── services/     # feApi.js
```

## Bases de Datos
- **pos_db:** Base de datos principal del POS
- **fe_db:** Base de datos de facturación electrónica (tenants, stores, configs_fiscal, certificates, documents, document_xml, counters, document_events)

---

## Sistema de Planes de Suscripción SaaS (Implementado 4 Febrero 2026)

### Descripción
Sistema completo para monetizar la aplicación mediante planes de suscripción pagados.

### Planes Disponibles
| Plan | Precio | Facturas | Usuarios | Productos | TPV | Clientes | Historial |
|------|--------|----------|----------|-----------|-----|----------|-----------|
| **Gratis** | $0/mes | 50 | 1 | 50 | 1 | 20 | 7 días |
| **Básico** | $15/mes | 300 | 3 | 200 | 2 | 100 | 30 días |
| **Pro** ⭐ | $35/mes | ∞ | 10 | ∞ | 5 | ∞ | 180 días |
| **Enterprise** | $75/mes | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |

### Funciones por Plan
- **Facturación Electrónica:** Pro, Enterprise
- **Reportes Avanzados:** Básico, Pro, Enterprise
- **Tickets Abiertos:** Pro, Enterprise
- **Multi-Tienda:** Pro, Enterprise
- **Logo en Ticket:** Básico, Pro, Enterprise
- **Exportar Excel:** Pro, Enterprise
- **Soporte Prioritario:** Enterprise

### Componentes Implementados

#### Backend (`/app/backend/server.py`)
- **Colección `planes`:** Define límites y funciones de cada plan
- **Colección `payment_transactions`:** Registro de transacciones de pago
- **Funciones helper:**
  - `get_plan_organizacion()` - Obtiene plan actual
  - `get_uso_actual()` - Calcula uso de recursos
  - `verificar_limite_plan()` - Valida límites antes de crear recursos
  - `verificar_funcion_plan()` - Valida disponibilidad de funciones

#### Endpoints de Planes
- `GET /api/planes` - Planes públicos para landing page
- `GET /api/mi-plan` - Plan y uso actual del usuario
- `GET /api/verificar-limite/{recurso}` - Verificar límite específico

#### Endpoints de Super Admin
- `GET /api/superadmin/dashboard` - Métricas globales
- `GET /api/superadmin/planes` - Todos los planes (incluyendo ocultos)
- `POST /api/superadmin/planes` - Crear plan
- `PUT /api/superadmin/planes/{id}` - Actualizar plan
- `DELETE /api/superadmin/planes/{id}` - Eliminar plan
- `GET /api/superadmin/organizaciones` - Lista de organizaciones
- `PUT /api/superadmin/organizaciones/{id}/plan` - Cambiar plan

#### Endpoints de Suscripción (Stripe)
- `POST /api/suscripcion/crear` - Crear sesión de checkout
- `GET /api/suscripcion/estado/{session_id}` - Verificar estado del pago
- `POST /api/webhook/stripe` - Webhook de Stripe
- `GET /api/mis-pagos` - Historial de pagos

### Frontend

#### Landing Page (`/landing`)
- Hero section con llamada a acción
- Grid de características principales
- Tabla de precios con los 4 planes
- Sección CTA final
- Footer con enlaces

#### Panel Super Admin (`/superadmin`)
- **Dashboard:** Métricas de organizaciones, usuarios, facturas, ingresos
- **Planes:** CRUD completo de planes con funciones y límites
- **Organizaciones:** Lista con uso actual, opción de cambiar plan

#### Mi Plan (`/mi-plan`)
- Información del plan actual con badge de precio
- Barras de progreso de uso de recursos
- Alertas cuando se acercan a los límites
- Grid de funciones disponibles/no disponibles
- Diálogo de upgrade con integración Stripe

#### Página de Éxito (`/suscripcion/exito`)
- Polling automático del estado del pago
- Mensajes de éxito/error/expiración
- Activación automática del plan al pagar

### Validaciones Automáticas
Los siguientes endpoints verifican límites antes de crear recursos:
- `POST /api/productos` - Límite de productos
- `POST /api/usuarios` - Límite de usuarios
- `POST /api/clientes` - Límite de clientes
- `POST /api/tpv` - Límite de TPV
- `POST /api/facturas` - Límite mensual de facturas

### Errores de Límite
Cuando se alcanza un límite, el endpoint devuelve:
```json
{
  "detail": {
    "code": "PLAN_LIMIT",
    "message": "Has alcanzado el límite de productos (50/50) de tu plan Gratis. Actualiza tu plan para continuar."
  }
}
```

### Test Reports
- `/app/test_reports/iteration_11.json` - Tests del Sistema de Planes - 100% passed (20/20 backend, frontend OK)

### Credenciales de Prueba
- **Super Admin:** usuario `admin`, contraseña `admin123`
- **Stripe:** `sk_test_emergent` (clave de prueba)

---

## Sistema de Suscripciones Recurrentes con Stripe (Implementado 11 Febrero 2026)

### Descripción
Sistema de pagos recurrentes mensuales automáticos mediante Stripe Billing.

### Endpoints de Suscripción Recurrente
- `POST /api/suscripcion/crear` - Crea sesión de checkout Stripe
- `GET /api/suscripcion/actual` - Estado actual de la suscripción
- `POST /api/suscripcion/cancelar` - Cancela suscripción (efectiva al final del período)
- `POST /api/suscripcion/reactivar` - Reactiva suscripción antes de que termine
- `POST /api/webhook/stripe` - Maneja eventos del ciclo de vida de Stripe

### Campos en `organizaciones`
- `stripe_customer_id` - ID del cliente en Stripe
- `stripe_subscription_id` - ID de la suscripción en Stripe
- `subscription_status` - Estado: `active`, `canceled`, `past_due`, etc.
- `subscription_end_date` - Fecha de fin del período actual

### Campos en `planes`
- `stripe_price_id` - ID del precio recurrente en Stripe
- `destacado` - Boolean para resaltar plan en landing page

### Comportamiento de Cancelación
- La cancelación NO es inmediata
- El acceso se mantiene hasta el final del período de facturación pagado
- El usuario puede reactivar antes de que termine
- Al final del período, se degrada automáticamente al plan Gratis

---

## Sistema de Impresoras de Cocina (Implementado 11 Febrero 2026)

### Descripción
Sistema híbrido para enviar comandas de pedidos a impresoras de cocina locales desde un servidor en la nube.

### Arquitectura
- **Backend en la nube:** Expone endpoints REST para que clientes locales consulten órdenes pendientes
- **Puente local (APK/QZ Tray):** Aplicación en PC/Android que consulta al backend y envía a impresoras locales
- La configuración de IP/Puerto de impresoras se hace en el cliente local, NO en la web

### Endpoints de Configuración
- `GET /api/funciones` - Obtener configuración de funciones (incluye `impresoras_cocina`)
- `PUT /api/funciones` - Activar/desactivar función de impresoras de cocina
- `GET /api/grupos-impresora` - Listar grupos de impresora
- `POST /api/grupos-impresora` - Crear grupo de impresora
- `PUT /api/grupos-impresora/{id}` - Actualizar grupo
- `DELETE /api/grupos-impresora/{id}` - Eliminar grupo

### Endpoints para Puente de Impresión (APK/QZ Tray)
- `GET /api/impresion/ordenes-pendientes` - Consulta órdenes pendientes de impresión
- (Futuro) Endpoint para marcar órdenes como impresas

### Colección `config_funciones`
```json
{
  "organizacion_id": "uuid",
  "cierres_caja": true,
  "tickets_abiertos": false,
  "tipo_pedido": false,
  "venta_con_stock": true,
  "funcion_reloj": false,
  "impresoras_cocina": true,
  "pantalla_clientes": false,
  "mesas_por_mesero": false,
  "facturacion_electronica": false
}
```

### Colección `grupos_impresora`
```json
{
  "id": "uuid",
  "nombre": "Cocina Principal",
  "categorias": ["uuid-cat-1", "uuid-cat-2"],
  "organizacion_id": "uuid",
  "creado": "2026-02-11T04:27:12Z"
}
```

### Interfaz de Usuario
- **Configuración → Funciones:** Toggle para activar/desactivar impresoras de cocina
- **Configuración → Impresoras de cocina:** (Visible solo cuando está activa) 
  - Lista de grupos de impresora en tabla
  - Crear/Editar grupos con nombre y categorías asignadas
  - Eliminar grupos

### Test Reports
- `/app/test_reports/iteration_12.json` - Tests del Sistema de Funciones e Impresoras de Cocina - 100% passed (13/13 backend, frontend OK)

### Mejoras de Impresión de Cocina (13 Febrero 2026)

#### Formato Mejorado del Ticket de Cocina
- **Nombre del personal:** El ticket ahora muestra tanto el mesero como el cajero que procesó la orden
- **Campo `cajero` agregado:** Las órdenes de ventas directas ahora incluyen el nombre del cajero
- **Lógica inteligente:** Si hay mesero se muestra, si hay cajero se muestra, si ninguno se muestra "Sistema"
- **Archivos modificados:** 
  - `server.py` - Endpoint `/api/impresion/ordenes-pendientes` incluye campo `cajero`
  - `qz-kitchen-direct.html` - Función `formatTicket()` actualizada

#### Instrucciones para QZ Tray Site Manager
- **Nueva sección de ayuda:** En la página `qz-kitchen-direct.html` se agregaron instrucciones paso a paso
- **Resuelve el pop-up "Allow":** Guía para agregar el sitio al Site Manager de QZ Tray y marcarlo como "Trusted"

---

## Tareas Pendientes

### P1 - Alta Prioridad
- [ ] **Flujo de login de mesero inestable** - Reportado como inconsistente
- [ ] **Verificar "Precuenta" para cajeros** - Confirmar funcionamiento

### P2 - Media Prioridad
- [ ] **Apertura de caja registradora** - No se abre al imprimir
- [ ] **Renombrar directorio `backend`** - Mejor estructura de proyecto
- [ ] **Consolidar documentación APK** - Unificar docs para desarrollo futuro

### Backlog / Futuro
- [ ] **Reloj checador** - Control de tiempo para empleados
- [ ] **Convertir a PWA** - Progressive Web App
- [ ] **Búsqueda por rango de monto en Recibos**
- [ ] **Envío de recibo por email**

---

