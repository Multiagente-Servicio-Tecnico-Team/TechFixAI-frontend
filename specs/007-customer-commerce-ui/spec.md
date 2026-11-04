# Feature Specification: Integración frontend de clientes y comercio

**Feature Branch**: `007-customer-commerce-ui`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Usa speckit-specify para el frontend; quiero que funcione de acuerdo con los cambios de users, customers y las demás tablas/rutas que los usan, incluidos login, registro y los flujos relacionados."

## User Scenarios & Testing

### User Story 1 - Acceder con una cuenta del portal (Priority: P1)

Como cliente del portal, quiero registrarme e iniciar sesión con mi cuenta habitual para usar mis tickets, cotizaciones y compras sin tener que crear una segunda cuenta comercial.

**Why this priority**: `users` conserva credenciales, roles y sesiones. El perfil comercial asociado en `customers` representa a quién pertenece la actividad, pero no reemplaza el inicio de sesión.

**Independent Test**: Registrar una cuenta, iniciar sesión y comprobar que el portal puede cargar los datos del perfil comercial enlazado sin pedir ni enviar su identificador; repetir con una cuenta existente y con una sesión vencida.

**Acceptance Scenarios**:

1. **Given** una persona aún no tiene cuenta, **When** completa el registro actual, **Then** se crea una cuenta CUSTOMER y el frontend abre el portal con la sesión devuelta por el backend, sin pedirle una contraseña ni un ID de cliente adicional.
2. **Given** una cuenta CUSTOMER existente, **When** inicia sesión, **Then** el frontend conserva el flujo de autenticación actual y las solicitudes posteriores usan la cookie de sesión.
3. **Given** una sesión válida, **When** el cliente recarga el portal, **Then** puede continuar accediendo a sus datos comerciales sin que el navegador use un `customer_id` almacenado como identidad.
4. **Given** la cuenta no tiene un perfil comercial enlazado o el backend no puede resolverlo, **When** intenta abrir tickets o cotizaciones, **Then** ve un mensaje recuperable y no se muestran datos de demostración como datos reales.
5. **Given** una cuenta manual no tiene credenciales, **When** un ADMIN la registra como cliente comercial, **Then** el frontend no ofrece crear una contraseña o sesión para esa persona.

### User Story 2 - Consultar tickets y cotizaciones propios (Priority: P1)

Como cliente autenticado, quiero consultar los tickets de servicio y las cotizaciones asociadas, para distinguir el seguimiento del taller de las ofertas de productos.

**Why this priority**: Los tickets siguen representando trabajo de servicio. Las cotizaciones de venta pueden existir sin ticket y ambas clases de registro pertenecen al perfil comercial.

**Independent Test**: Con dos perfiles portal, crear ticket de servicio con y sin cotización, más una cotización de venta sin ticket; cada sesión ve solo sus registros y sus estados/valores coinciden con el backend.

**Acceptance Scenarios**:

1. **Given** un cliente con tickets de servicio, **When** abre “Mis tickets”, **Then** ve el historial recibido del backend, incluyendo equipo, estado, fecha y cotizaciones de servicio disponibles.
2. **Given** un cliente no tiene tickets, **When** abre “Mis tickets”, **Then** ve un estado vacío y una acción para iniciar una consulta; no ve una cotización de venta presentada como ticket.
3. **Given** el cliente tiene cotizaciones de servicio y de venta, **When** abre sus cotizaciones, **Then** puede distinguir el tipo, el ticket asociado si existe, las líneas, el total y el estado de oferta.
4. **Given** una cotización está pendiente, **When** el cliente acepta o rechaza usando la acción disponible, **Then** el estado mostrado procede de la respuesta del backend y la aceptación de una venta no se presenta como pago confirmado.
5. **Given** el cliente intenta abrir un ticket, cotización, pago o venta perteneciente a otra persona, **When** consulta el recurso, **Then** no obtiene ni presenta sus datos.

### User Story 3 - Gestionar clientes y cotizaciones de servicio (Priority: P1)

Como ADMIN, quiero elegir un cliente comercial existente o registrar una persona atendida presencialmente sin cuenta, para crear tickets de servicio y sus cotizaciones sin perder el vínculo con el cliente.

**Why this priority**: El taller necesita conservar el historial de atención presencial sin fabricar cuentas de acceso y mantener la separación entre cliente y ADMIN responsable.

**Independent Test**: Buscar y seleccionar un cliente existente; luego registrar un cliente manual sin cuenta, crearle un ticket y añadirle una cotización de servicio. El ticket queda asociado al perfil correcto y registra al ADMIN como autor.

**Acceptance Scenarios**:

1. **Given** que ADMIN abre el alta de ticket, **When** busca por nombre, correo o teléfono, **Then** puede escoger un cliente comercial existente y confirmar los datos de contacto que se guardarán en el registro.
2. **Given** que el cliente presencial aún no existe, **When** ADMIN registra sus datos comerciales, **Then** se crea un cliente manual sin cuenta `users` y queda disponible para asociarlo al ticket.
3. **Given** un cliente manual o del portal seleccionado, **When** ADMIN crea un ticket, **Then** el ticket queda asociado al perfil seleccionado, conserva los datos de contacto registrados y muestra al ADMIN autenticado como autor cuando el backend lo informa.
4. **Given** un cliente de portal y un cliente manual comparten correo o teléfono, **When** ADMIN realiza una búsqueda, **Then** la interfaz permite seleccionar el registro correcto y no combina ni enlaza perfiles automáticamente.
5. **Given** un ticket de servicio sin cotizaciones, **When** ADMIN crea una cotización desde su detalle, **Then** queda asociada al ticket y cliente seleccionados y se muestra tras la confirmación del backend.
6. **Given** el ticket ya tiene una cotización, **When** ADMIN crea otra cotización de servicio, **Then** la interfaz conserva ambas en el historial y no reemplaza los datos de la anterior.
7. **Given** el backend rechaza la búsqueda, creación de cliente, ticket o cotización, **When** ADMIN vuelve a intentarlo, **Then** se conserva la entrada corregible y no se muestra éxito ni un registro local ficticio.

### User Story 4 - Gestionar cotizaciones de venta, pagos y compras (Priority: P2)

Como cliente, quiero revisar mis ofertas y ventas; como ADMIN, quiero revisar las ofertas aceptadas y confirmar los pagos recibidos para completar la venta.

**Why this priority**: El comercio de productos usa cotizaciones y pedidos/ventas; no debe abrir tickets de reparación ni confundir aceptación de oferta con pago.

**Independent Test**: Crear una cotización de venta sin ticket, aceptarla como su cliente, comprobar que el pago sigue pendiente, confirmarlo como ADMIN y verificar que el cliente ve la venta y su historial.

**Acceptance Scenarios**:

1. **Given** una cotización de venta presentada desde el chat o creada por ADMIN, **When** el cliente consulta sus ofertas, **Then** ve el identificador, las líneas, cantidades, precios, total, vencimiento y estado devueltos por el backend.
2. **Given** una oferta pendiente propia, **When** el cliente la acepta, **Then** la interfaz refleja la aceptación y el estado de pago continúa pendiente hasta que ADMIN lo confirme.
3. **Given** una oferta expirada, cancelada o sin stock reservable, **When** el cliente intenta aceptarla, **Then** la interfaz presenta el conflicto y no la marca como aceptada localmente.
4. **Given** un pago externo pendiente, **When** ADMIN confirma el cobro y su método/referencia, **Then** se muestra el resultado de la respuesta del backend; CUSTOMER no ve controles para confirmar pagos.
5. **Given** el pago ya fue confirmado, **When** el cliente abre sus compras/ventas, **Then** ve la venta relacionada con la cotización y sus líneas; el frontend no crea pedidos ni descuenta stock localmente.
6. **Given** una cotización de venta no tiene ticket, **When** se muestra en el portal o el área ADMIN, **Then** permanece en la sección comercial y nunca se representa como ticket del taller.

### Edge Cases

- El backend no crea o no resuelve el perfil `customers` para una cuenta portal recién registrada; mostrar el problema y no inventar un perfil en el navegador.
- La cookie vence durante una lectura o escritura; borrar el estado local sensible y solicitar inicio de sesión, conservando una ruta de retorno segura.
- La sesión pertenece a cliente, técnico o administrador; mostrar únicamente las vistas que correspondan al rol y respetar la denegación del backend.
- Dos clientes tienen datos de contacto iguales; no fusionar ni elegir automáticamente el primer resultado ambiguo.
- La respuesta incluye un estado de oferta, pago o pedido distinto; mostrar cada dimensión por separado y conservar el código que envía/recibe el contrato.
- La aceptación de una cotización se reintenta después de perder la respuesta; conservar la misma clave de idempotencia durante ese reintento y reemplazar el estado con la respuesta recuperada.
- El cliente no tiene perfil asociado o el perfil está inactivo; comunicar el bloqueo de manera recuperable y no tratar la cuenta de acceso como si fuera el perfil comercial.
- El backend no está configurado, devuelve datos incompletos o falla; mostrar estado no configurado/error y evitar datos demo en vistas conectadas.
- Una cuenta manual se vinculará posteriormente a una cuenta del portal; no hacerlo por coincidencia de correo o teléfono ni presentar un vínculo como completado sin confirmación del backend.

## Requirements

### Functional Requirements

- **FR-001**: El inicio de sesión, registro, cierre de sesión y recuperación de contraseña deben seguir autenticando cuentas `users` mediante el flujo actual; un perfil `customers` no tendrá contraseña, sesión ni rol propios.
- **FR-002**: El registro del portal debe mantener los campos y validaciones actuales de cuenta. Tras un registro exitoso, el cliente debe poder acceder al portal sin crear una segunda cuenta comercial ni escribir un identificador interno.
- **FR-003**: La identidad del cliente debe provenir de su sesión vigente; la interfaz no debe enviar ni reutilizar identificadores internos para elegir qué datos personales consulta el cliente.
- **FR-004**: El frontend no debe conservar contraseñas, credenciales de sesión ni identificadores de perfil comercial en el navegador; la sesión autenticada y el backend controlan la identidad y propiedad de los datos.
- **FR-005**: El frontend debe manejar tickets de servicio como registros del taller y cotizaciones de venta como registros comerciales independientes; una compra no debe presentarse como un ticket de reparación.
- **FR-006**: El portal debe consultar y presentar los tickets, cotizaciones de servicio, cotizaciones de venta, pagos y ventas del cliente desde las operaciones propias del backend, con estados de carga, vacío, error y reintento.
- **FR-007**: El portal debe mostrar los estados de oferta, pago y pedido/venta por separado; aceptar una cotización no debe presentarse como pago completado ni como venta pagada.
- **FR-008**: El cliente podrá leer y aceptar únicamente sus propias cotizaciones; repetir una aceptación tras perder la respuesta no debe duplicar operaciones, y los conflictos de vencimiento o inventario deben explicarse sin alterar el estado como si estuviera confirmado.
- **FR-009**: El frontend ADMIN debe buscar y listar perfiles comerciales usando los filtros/paginación disponibles, registrar y actualizar clientes manuales sin crear cuentas de acceso, y mostrar si un perfil está vinculado a una cuenta.
- **FR-010**: El formulario ADMIN de ticket debe permitir seleccionar un perfil comercial existente o registrar uno manual y asociar el ticket al perfil confirmado; los tipos permitidos son los de servicio definidos por el backend.
- **FR-011**: El frontend debe conservar los datos de contacto históricos que solicite el backend en el ticket aunque el perfil comercial cambie después; no debe reemplazarlos retroactivamente con el contacto actual.
- **FR-012**: El detalle ADMIN de un ticket de servicio debe permitir crear cotizaciones de servicio para ese ticket y cliente, y presentar solo las cotizaciones confirmadas por el backend.
- **FR-013**: La vista comercial ADMIN debe consultar cotizaciones de venta y sus detalles, permitir registrar una oferta para el cliente seleccionado y confirmar pagos solo mediante la acción ADMIN que ofrece el backend.
- **FR-014**: El cliente podrá consultar sus pagos y ventas confirmadas, y sus líneas/precios deben mostrarse desde las respuestas del backend sin recalcular importes, confirmar pagos ni modificar inventario en el navegador.
- **FR-015**: La pantalla debe traducir a español las etiquetas de tipos y estados sin alterar los códigos canónicos usados para intercambiar información.
- **FR-016**: Las vistas y acciones ADMIN deben estar protegidas por el rol existente y, ante falta de sesión o permiso, reflejar que el backend no autorizó la operación sin mostrar datos privados.
- **FR-017**: Los fallos del servicio no deben transformarse en registros de demostración, mensajes de éxito ni escrituras optimistas persistidas; los formularios deben conservar la entrada que se pueda corregir.
- **FR-018**: La integración debe conservar el lenguaje visual Banco, componentes, accesibilidad, navegación y comportamiento responsivo que ya usa el frontend.
- **FR-019**: La interfaz no debe enlazar automáticamente un cliente manual a una cuenta portal por coincidencia de correo o teléfono. Un vínculo solo se muestra confirmado después de una operación autorizada y respuesta backend.

### Key Entities

- **Cuenta de acceso (`users`)**: credenciales, rol y sesión con la que la persona inicia sesión en el portal o panel.
- **Cliente comercial (`customers`)**: persona o empresa atendida, con datos comerciales y vínculo opcional a una cuenta; puede existir sin cuenta ni credenciales.
- **Ticket de servicio**: seguimiento de reparación, soporte, armado o garantía ligado a un cliente comercial y con snapshots de contacto.
- **Cotización**: oferta de servicio asociada a un ticket o oferta de venta asociada directamente al cliente, sin ticket de reparación.
- **Pago**: registro cuyo estado es independiente del estado de la cotización; la confirmación de cobro la realiza ADMIN.
- **Venta/pedido**: registro comercial creado por el backend al confirmar el pago de una cotización aceptada.

## Success Criteria

### Measurable Outcomes

- **SC-001**: En el 100 % de los registros e inicios de sesión del portal se mantiene una única cuenta de acceso, y el cliente puede usar sus funciones comerciales sin introducir un ID de customer.
- **SC-002**: En todas las pruebas de aceptación, la sesión de cada cliente muestra cero tickets, cotizaciones, pagos o ventas pertenecientes a otra cuenta.
- **SC-003**: ADMIN puede crear un cliente manual y asociarlo a un ticket sin crear una cuenta `users` ni credenciales.
- **SC-004**: El 100 % de las cotizaciones de venta se presenta fuera del tablero de tickets de servicio y distingue aceptación de pago confirmado.
- **SC-005**: Reintentar una aceptación o consulta tras un error de red no duplica registros ni comunica un cambio que el backend no confirmó.
- **SC-006**: Registro, tickets, cotizaciones y ventas mantienen la identidad visual y funcionan sin desplazamiento horizontal a 360, 390, 768 y 1024 píxeles.

## Assumptions

- El mecanismo de autenticación sigue siendo el existente: el backend administra la sesión de cuenta y la interfaz no almacena credenciales ni tokens.
- `users` y `customers` son entidades distintas. El frontend cliente trabaja a través de su sesión; los identificadores comerciales son datos internos de los contratos y no determinan la identidad del cliente.
- La especificación backend `007-gestion-clientes-comerciales` define la fuente de verdad para los datos, permisos, estados y ownership de clientes, tickets y comercio.
- ADMIN puede mantener perfiles manuales y las vistas portal usan las rutas propias que filtran los registros a partir de la sesión.
- El vínculo de una persona manual con una cuenta futura requiere verificación explícita; no se automatiza por correo/teléfono.
- El estado comercial y sus importes se muestran con los valores confirmados por el servicio; no se decide ni calcula propiedad, precio, disponibilidad, pago o venta en el frontend.
- Se conservan el estilo, navegación y convenciones actuales; el alcance no reimplementa ni modifica tablas, autenticación o API del backend.

## Dependencies

- El backend debe crear o asegurar un perfil `customers` enlazado cuando se registra una cuenta CUSTOMER nueva y resolver dicho perfil desde la sesión antes de atender rutas del portal. La especificación backend 007 define esa relación, pero el código revisado aún no la garantiza en registro/sesión; es un prerrequisito de integración y no se puede resolver enviando IDs desde el frontend.
- Las operaciones, permisos y respuestas para clientes, tickets, cotizaciones, pagos y ventas deben estar aplicadas y disponibles conforme a la especificación backend 007.
- Las funciones administrativas dependen de una cuenta ADMIN autenticada; las funciones personales dependen de una cuenta CUSTOMER con perfil comercial resuelto.
- El módulo de interfaz debe reutilizar la configuración común de URL de backend, las cookies incluidas, componentes del sistema visual y patrones de manejo de errores ya presentes.
