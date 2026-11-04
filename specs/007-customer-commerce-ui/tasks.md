# Tasks: Integración frontend de clientes y comercio

**Input**: Diseño en `specs/007-customer-commerce-ui/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`).

**Prerequisito de integración**: Antes de validar el portal extremo a extremo, el backend debe crear y resolver el perfil `customers` vinculado a la cuenta en registro/sesión. El frontend no enviará `customer_id` ni usará el ID de `users` como sustituto. El contrato revisado también requiere que estén disponibles las rutas de clientes, cotizaciones, pagos y ventas del backend 007.

**Tests**: Incluidos porque la especificación define escenarios de aceptación y criterios de prueba independientes. Escribirlos antes de la implementación de cada historia.

## Formato

Cada tarea usa checkbox, ID secuencial, marcador `[P]` solo si puede realizarse en paralelo, etiqueta de historia en tareas de historia y una ruta concreta.

## Phase 1: Setup

**Purpose**: Preparar fixtures compartidos para probar DTOs y respuestas de la API sin depender de datos productivos.

- [X] T001 Crear fixtures reutilizables de customer, ticket, cotización, pago y venta en `tests/unit/fixtures/customerCommerce.js`

## Phase 2: Foundational

**Purpose**: Definir proyecciones compartidas de DTO, etiquetas localizadas y normalización de cotizaciones múltiples antes de construir vistas y APIs.

- [X] T002 [P] Añadir pruebas de normalización de tipos, estados, `quotes[]` y fallback legacy `quote` en `tests/unit/customer-commerce-domain.test.js`
- [X] T003 Implementar normalizadores puros de clientes, tickets, cotizaciones, pagos y ventas en `src/domain/customerCommerce.js`

**Checkpoint**: La normalización conserva códigos canónicos, distingue estado de oferta/pago/venta y admite varias cotizaciones de servicio.

## Phase 3: User Story 1 - Acceder con una cuenta del portal (Priority: P1)

**Goal**: Mantener `users` como identidad de autenticación y consumir el perfil comercial únicamente mediante la sesión resuelta por el backend.

**Independent Test**: Registro e inicio de sesión conservan el flujo/cookie actual, no solicitan ni almacenan `customer_id`, y una sesión sin perfil comercial muestra un error recuperable sin fallback a IDs o datos de demostración.

### Tests

- [X] T004 [P] [US1] Verificar que registro/login envían solo campos de cuenta y no persisten customer ID en `tests/unit/auth-api.test.js`
- [X] T005 [P] [US1] Verificar registro, acceso y retorno seguro de sesión vencida en `tests/integration/register.test.jsx` y `tests/integration/login.test.jsx`
- [X] T006 [P] [US1] Verificar que el portal presenta un estado recuperable cuando el backend no resuelve el perfil comercial en `tests/integration/portal-commerce.test.jsx`

### Implementation

- [X] T007 [US1] Mantener el DTO de registro limitado a cuenta y evitar guardar customer ID o credenciales en `src/features/auth/authApi.js` y `src/features/auth/Register.jsx`
- [X] T008 [US1] Manejar sesión CUSTOMER sin perfil comercial resuelto con error recuperable y sin sustituirla por `user.id` en `src/state/session.js` y `src/features/tickets/Tickets.jsx`
- [X] T009 [US1] Conservar retorno seguro al login ante expiración de sesión en rutas del portal en `src/features/auth/RequireRole.jsx`

**Checkpoint**: Registro y login continúan usando la cuenta existente; el frontend no inventa ni persiste una identidad comercial.

## Phase 4: User Story 2 - Consultar tickets y cotizaciones propios (Priority: P1)

**Goal**: El cliente consulta sus tickets de servicio, cotizaciones, pagos y ventas desde endpoints derivados de la sesión; aceptación y pago se muestran como estados separados.

**Independent Test**: Con dos sesiones CUSTOMER, cada una ve únicamente sus registros; la lista admite tickets con cero o varias cotizaciones y una venta aceptada sigue mostrando pago pendiente hasta confirmación backend.

### Tests

- [X] T010 [P] [US2] Probar endpoints portal, cookies, errores 401/403/404/409, reintentos e idempotencia en `tests/unit/commerce-api.test.js`
- [X] T011 [P] [US2] Probar lista de tickets vacía, cotizaciones múltiples, quotes de venta separadas y aislamiento por sesión en `tests/integration/portal-commerce.test.jsx`
- [X] T012 [P] [US2] Probar aceptación de cotización y visualización diferenciada de estados de oferta, pago y venta en `tests/integration/customer-quotes.test.jsx`

### Implementation

- [X] T013 [US2] Implementar cliente portal para tickets, cotizaciones, aceptación con clave idempotente, pagos y ventas en `src/features/commerce/commerceApi.js`
- [X] T014 [US2] Normalizar `quotes[]` y compatibilidad con `quote` legacy en el listado “Mis Tickets” en `src/features/tickets/Tickets.jsx`
- [X] T015 [US2] Adaptar chat para enlazar el `quote_id` persistido y reflejar el estado confirmado por backend sin mutación optimista en `src/features/chat/chatApi.js` y `src/features/chat/LiveChat.jsx`
- [X] T016 [US2] Crear vista de cotizaciones propias con detalle, líneas, total, vencimiento y aceptación disponible en `src/features/commerce/CustomerQuotes.jsx`
- [X] T017 [US2] Crear vista de pagos y ventas propias con líneas snapshot y estados confirmados en `src/features/commerce/CustomerOrders.jsx`
- [X] T018 [US2] Añadir rutas protegidas de cotizaciones y compras del cliente en `src/app/App.jsx`
- [X] T019 [US2] Añadir navegación portal a “Mis cotizaciones” y “Mis compras” conservando el diseño Banco en `src/app/layouts/PortalLayout.jsx`
- [X] T020 [US2] Traducir etiquetas de estado/tipo sin modificar códigos enviados o recibidos en `src/domain/customerCommerce.js`

**Checkpoint**: Un cliente solo ve los recursos que devuelve su sesión; aceptar una oferta no se comunica como pago confirmado.

## Phase 5: User Story 3 - Gestionar clientes y cotizaciones de servicio (Priority: P1)

**Goal**: ADMIN busca o registra clientes comerciales manuales sin cuenta, los selecciona al crear tickets y conserva todas las cotizaciones de servicio.

**Independent Test**: ADMIN busca y selecciona un perfil existente; crea otro manual sin cuenta, le asocia ticket y registra una o más cotizaciones de servicio con el ADMIN como autor informado por backend.

### Tests

- [X] T021 [P] [US3] Probar búsqueda paginada, alta/edición de customer y manejo de errores en `tests/unit/customers-api.test.js`
- [X] T022 [P] [US3] Probar búsqueda ambigua, creación de customer manual y acceso ADMIN-only en `tests/integration/admin-customers.test.jsx`
- [X] T023 [P] [US3] Probar selección/creación de customer y payload/snapshot al crear ticket en `tests/integration/admin-ticket-create.test.jsx`
- [X] T024 [P] [US3] Probar creación e historial de múltiples cotizaciones de servicio en `tests/integration/admin-ticket-detail.test.jsx`

### Implementation

- [X] T025 [US3] Implementar API de clientes ADMIN con búsqueda paginada `search`, origen, CRUD y errores tipados en `src/features/customers/customersApi.js`
- [X] T026 [US3] Crear panel de gestión de clientes con búsqueda, paginación, alta/edición manual y estado `account_linked` solo informativo en `src/features/customers/CustomerManager.jsx`
- [X] T027 [US3] Crear selector de customer que exige selección explícita ante coincidencias ambiguas en `src/features/customers/CustomerPicker.jsx`
- [X] T028 [US3] Adaptar alta de ticket para seleccionar o crear customer y enviar solo el ID confirmado más snapshots requeridos en `src/features/workshop/NewTicket.jsx` y `src/features/workshop/ticketsApi.js`
- [X] T029 [US3] Añadir cliente de cotizaciones de servicio para el ticket seleccionado con `spare_part_id` numérico en `src/features/workshop/ticketsApi.js`
- [X] T030 [US3] Permitir crear y consultar el historial completo de cotizaciones de servicio desde el detalle del ticket en `src/features/workshop/TicketDetail.jsx`
- [X] T031 [US3] Añadir rutas ADMIN de clientes y sus controles de rol en `src/app/App.jsx`
- [X] T032 [US3] Añadir acceso de ADMIN a clientes comerciales en la navegación del taller en `src/app/layouts/StaffLayout.jsx`

**Checkpoint**: Un cliente manual puede atenderse sin credenciales; el portal no puede consultar perfiles ni tickets mediante IDs enviados libremente.

## Phase 6: User Story 4 - Gestionar cotizaciones de venta, pagos y compras (Priority: P2)

**Goal**: ADMIN administra ofertas de venta y confirma pagos externos; clientes consultan sus ofertas y ventas. La aceptación no marca el pago ni crea localmente una venta.

**Independent Test**: Crear cotización de venta sin ticket con líneas de inventario, aceptarla y verificar reserva/pago pendiente; ADMIN confirma el pago y la respuesta backend crea la venta visible al cliente.

### Tests

- [X] T033 [P] [US4] Probar cotización de venta ADMIN, IDs numéricos de inventario, aceptación manual, confirmación de pago y errores de conflicto en `tests/unit/commerce-api.test.js`
- [X] T034 [P] [US4] Probar flujo ADMIN de crear cotización, revisar aceptación y confirmar pago solo con rol ADMIN en `tests/integration/admin-commerce.test.jsx`
- [X] T035 [P] [US4] Probar que CUSTOMER ve sus cotizaciones y ventas, pero nunca controles de confirmación de pago en `tests/integration/customer-quotes.test.jsx`

### Implementation

- [X] T036 [US4] Extender API comercial con listado/detalle ADMIN, creación de ventas, aceptación manual, cancelación y confirmación idempotente de pago en `src/features/commerce/commerceApi.js`
- [X] T037 [US4] Crear formulario de cotización de venta independiente del ticket, con customer explícito, vencimiento y artículos por ID numérico estable en `src/features/commerce/SalesQuoteForm.jsx`
- [X] T038 [US4] Crear panel ADMIN de ofertas, pagos y ventas con estados independientes y acciones permitidas por backend en `src/features/commerce/AdminCommerce.jsx`
- [X] T039 [US4] Añadir rutas ADMIN-only de cotizaciones de venta, pagos y ventas en `src/app/App.jsx`
- [X] T040 [US4] Añadir navegación ADMIN al área comercial conservando los controles y patrones visuales existentes en `src/app/layouts/StaffLayout.jsx`
- [X] T041 [US4] Mostrar en el portal las ventas creadas por backend y mantener separada la oferta aceptada del pago/venta en `src/features/commerce/CustomerOrders.jsx`

**Checkpoint**: ADMIN confirma pagos; el navegador no crea ventas ni actualiza existencias, y las ventas nunca aparecen como tickets de reparación.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificar seguridad de rutas, accesibilidad, adaptación visual y los flujos de error documentados.

- [X] T042 [P] Añadir pruebas de navegación y denegación por rol para rutas CUSTOMER, TECHNICIAN y ADMIN en `tests/integration/customer-commerce-access.test.jsx`
- [X] T043 [P] Ajustar navegación, formularios, tablas y estados vacíos al diseño Banco y a 360, 390, 768 y 1024 px en `src/shared/styles/customer-commerce.css`
- [X] T044 [P] Actualizar índice funcional del frontend con rutas portal y ADMIN incorporadas en `features.md`
- [X] T045 Documentar prerrequisitos de backend y pasos de validación manual postimplementación en `specs/007-customer-commerce-ui/quickstart.md`
- [X] T046 Ejecutar `npm test` y `npm run build` y registrar los resultados de validación en `specs/007-customer-commerce-ui/quickstart.md`

## Dependencias y orden de ejecución

### Dependencias entre fases

- Setup (Phase 1) precede a las pruebas que usan sus fixtures.
- Foundational (Phase 2) precede a las cuatro historias porque centraliza normalización y traducción de estados.
- US1 y US2 dependen del prerrequisito de perfil comercial del backend para aceptación E2E; los componentes frontend pueden implementarse con contratos simulados, sin enviar IDs comerciales.
- US3 depende del contrato de customers/tickets/cotizaciones de servicio backend 007 y de las APIs existentes de tickets/inventario.
- US4 depende de los contratos backend de cotizaciones de venta, pagos, ventas y de IDs estables de inventario.
- Polish depende de las historias que se quieran entregar. Completar pruebas/build en el entorno descrito en `quickstart.md`.

### Dependencias entre historias

- US1 (P1): sin dependencia de otras historias; depende de Setup/Foundational.
- US2 (P1): depende de US1 para rutas protegidas y estado de sesión; E2E además depende del perfil customer resuelto en backend.
- US3 (P1): independiente del portal después de Foundational; depende de los contratos ADMIN y selección de customer.
- US4 (P2): depende de US2 para la presentación portal de ofertas/ventas y de US3 para selector/API de customers. El formulario de venta no crea tickets.

### Oportunidades de paralelización

- T002 y T001 pueden desarrollarse en paralelo; la suite usa el fixture desde que T001 esté listo.
- Dentro de las historias, las pruebas de API y las pruebas de interfaz en archivos distintos pueden prepararse en paralelo.
- US3 puede desarrollarse en paralelo con US1/US2 una vez acordadas las interfaces de dominio y APIs.
- US4 comparte `commerceApi.js`, `CustomerQuotes.jsx` y navegación con US2; coordinar esos archivos antes de paralelizar cambios. T037 puede avanzar en paralelo con APIs de cliente si se acuerdan los DTOs.
- No paralelizar tareas que escriben el mismo archivo, especialmente `App.jsx`, `StaffLayout.jsx`, `commerceApi.js` o `CustomerOrders.jsx`.

## Estrategia de implementación

### MVP

1. Completar Setup y Foundational.
2. Completar US1 para mantener el flujo de acceso seguro.
3. Completar US2 para consultar los recursos propios y estados del cliente, usando contrato simulado hasta que el backend resuelva customers en sesión.
4. Validar US2 extremo a extremo solo después del prerrequisito backend.

### Entrega incremental

1. US1: registro/login de cuenta sin identidad comercial local.
2. US2: portal propio de tickets, cotizaciones, pagos y ventas.
3. US3: gestión ADMIN de customers y cotizaciones de servicio.
4. US4: gestión comercial de ventas y confirmación ADMIN de pagos.
5. Polish: roles, accesibilidad, responsive, pruebas y build.

## Criterios de prueba independientes

- US1: registro/login conserva cookie y no hay customer ID en formulario, payload ni almacenamiento; perfil no resuelto genera error recuperable.
- US2: sesiones de dos CUSTOMER no mezclan tickets/cotizaciones/pagos/ventas; acepta una cotización solo tras respuesta backend y conserva pago pendiente.
- US3: ADMIN busca y selecciona; crea cliente manual sin cuenta y ticket/cotización vinculados; historial muestra múltiples cotizaciones; sin autorización no se muestran datos.
- US4: cotización de venta sin ticket usa IDs numéricos; aceptación no completa pago; solo ADMIN confirma; venta aparece según respuesta backend.
- Polish: roles denegados, errores recuperables, accesibilidad y anchos 360/390/768/1024 px; `npm test` y `npm run build` pasan.

## Validación de formato

Todas las tareas usan `- [X] T###`, añaden `[P]` solo para trabajo paralelizable, incluyen `[US#]` en fases de historia y citan al menos una ruta concreta.
