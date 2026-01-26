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

### Completadas (26 Enero 2026)

- [x] **Sistema de Facturación Electrónica SRI Ecuador - FUNCIONANDO**
  - **Nuevo Backend (backend-fe):** Servicio FastAPI separado en puerto 8002 para facturación electrónica
  - **Multi-tenancy:** Todas las peticiones requieren header `X-Tenant-ID` (usa organizacion_id del POS)
  - **Proxy desde Backend Principal:** Rutas `/api/fe/*` se redirigen automáticamente al backend-fe
  - **Configuración del Emisor:** RUC, razón social, nombre comercial, dirección, establecimiento, punto de emisión, ambiente (pruebas/producción)
  - **Certificado Digital:** Subida y validación de certificado .p12, encriptación de contraseña en BD - **FUNCIONANDO CON CERTIFICADO REAL**
  - **Generación de XML:** Formato SRI v2.1.0 para Facturas (01) y Notas de Crédito (04)
  - **Firma XAdES-BES:** Firma digital del XML según especificación SRI (usando cryptography library)
  - **Cliente SOAP:** Comunicación con webservices del SRI (RecepcionComprobantesOffline, AutorizacionComprobantesOffline)
  - **Clave de Acceso:** Generación de 49 dígitos con módulo 11
  - **Secuenciales Atómicos:** Uso de MongoDB `findOneAndUpdate` para garantizar unicidad
  - **Generación PDF RIDE:** Representación impresa del documento electrónico
  - **Frontend:** Nuevas páginas `/configuracion/facturacion` y `/documentos-electronicos`
  - **Toggle en Funciones:** Opción para activar/desactivar facturación electrónica con botón de configuración

- [x] **Fix Bug - Carga de Certificado .p12**
  - Corregido error de compatibilidad con cryptography library (atributos `not_valid_before` vs `not_valid_before_utc`)
  - Migrado de pyOpenSSL a cryptography directamente para mejor compatibilidad

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
- [ ] Lógica interna de "Función de reloj" (UI de fichaje)
- [ ] Lógica interna de "Impresoras de cocina"
- [ ] Lógica interna de "Pantalla para clientes"

### P2 - Futuras
- [ ] Búsqueda por rango de montos en recibos
- [ ] Enviar recibo por email

## Credenciales de Prueba
- **Usuario:** admin
- **Contraseña:** admin*88

## Test Reports
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
