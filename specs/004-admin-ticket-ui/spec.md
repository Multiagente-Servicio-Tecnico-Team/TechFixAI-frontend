# Feature Specification: Conexión del panel de tickets

**Feature Branch**: `feature/spec-kit`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Usa speckit-specify para definir e implementar la conexión correcta del frontend con las interfaces de tickets del backend; antes de planificar revisa las pantallas y el contrato existentes."

## User Scenarios & Testing

### User Story 1 - Consultar el tablero real del taller (Priority: P1)

Como administrador del taller, quiero consultar tickets persistidos en el backend, buscar y filtrar la cola, para organizar el trabajo sin depender de los datos de demostración del navegador.

**Why this priority**: El tablero es la vista de entrada y permite confirmar que el frontend y el backend comparten los mismos tickets.

**Independent Test**: Con una sesión ADMIN y tickets de varios tipos, estados y orígenes, abrir el tablero, combinar búsqueda y filtros y recorrer todas las páginas; los registros y el total coinciden con el conjunto filtrado del servicio.

**Acceptance Scenarios**:

1. **Given** una sesión ADMIN válida, **When** abre el tablero, **Then** ve tickets obtenidos del listado administrativo con identificador, fecha, contacto, equipo, detalle, tipo, estado, origen, adelanto y cotización cuando existan.
2. **Given** un conjunto que supera una página, **When** busca y combina estado, tipo y origen, **Then** ve el resultado filtrado sin duplicados y puede exportar todas sus páginas.
3. **Given** tickets heredados cuyo origen no se conoce, **When** aparecen en el tablero, **Then** se muestran con una etiqueta neutral de origen desconocido y no se clasifican como manuales ni en línea.
4. **Given** una respuesta de error o sesión vencida, **When** falla la carga, **Then** la interfaz informa el problema, ofrece reintentar y no reemplaza los datos con una lista ficticia.

---

### User Story 2 - Registrar un ticket manual (Priority: P1)

Como administrador, quiero crear un ticket presencial desde el formulario actual, para guardar el contacto, el equipo, el tipo de solicitud y el adelanto en el servicio compartido.

**Why this priority**: La creación manual es el flujo principal del formulario existente y debe persistir antes de que el ticket aparezca en la cola.

**Independent Test**: Enviar un formulario válido sin cuenta de cliente; comprobar que la tarjeta usa el ticket devuelto por el backend, conserva su código y que el detalle puede abrirse con ese identificador.

**Acceptance Scenarios**:

1. **Given** datos válidos de nombre y teléfono, **When** el administrador crea un ticket, **Then** el frontend envía `contact_name`, `contact_phone`, correo opcional, `title`, `failure_description` y `request_type`; navega al detalle solo después de recibir el ticket creado.
2. **Given** un adelanto, **When** se envía el formulario, **Then** el importe viaja como cadena decimal y el método se traduce a `YAPE_PLIN`, `CASH` o `CARD`; si no hay importe, no se envía un método.
3. **Given** errores de validación del servidor, **When** la creación falla, **Then** se conserva el formulario, se informa el error seguro y no se crea una tarjeta optimista.
4. **Given** creación exitosa, **When** el backend devuelve código, estado y origen, **Then** la interfaz presenta esos valores devueltos en vez de generar un código local.

---

### User Story 3 - Revisar y actualizar un ticket (Priority: P1)

Como administrador, quiero abrir el detalle real y actualizar su estado, para conservar el historial de trabajo y mostrar al equipo la información persistida.

**Why this priority**: El detalle y la actualización de estado son necesarios para que el tablero represente el ciclo de atención real.

**Independent Test**: Abrir un ticket manual y otro en línea, cambiar estado y campos permitidos, guardar, recargar y verificar que la respuesta del backend y la cronología de auditoría se reflejen en pantalla.

**Acceptance Scenarios**:

1. **Given** un ticket que existe, **When** el administrador abre su detalle, **Then** ve contacto, tipo, estado, origen, fechas, adelanto, cotización, pago disponible y eventos de auditoría.
2. **Given** cambios válidos, **When** el administrador guarda, **Then** el frontend envía un PATCH parcial con códigos canónicos y actualiza la pantalla con la respuesta persistida.
3. **Given** que el administrador cancela un ticket, **When** guarda `CANCELLED`, **Then** el ticket permanece disponible como cancelado; la interfaz no ofrece borrado físico.
4. **Given** el ticket no existe o el usuario no tiene autorización, **When** consulta o actualiza, **Then** la interfaz presenta el estado correspondiente sin mostrar datos de demostración.

---

### User Story 4 - Consultar una cotización existente (Priority: P2)

Como administrador, quiero consultar la cotización pendiente o aceptada que ya está asociada al ticket, para conocer el total sin confundirlo con el adelanto recibido.

**Why this priority**: El detalle debe reflejar la información persistida disponible y distinguir correctamente el adelanto del total cotizado.

**Independent Test**: Abrir un ticket con cotización y otro sin cotización; comprobar que el primero muestra total/estado recibidos del servicio, y que el adelanto permanece separado.

**Acceptance Scenarios**:

1. **Given** un ticket con cotización, **When** el administrador abre el detalle, **Then** ve el importe total y estado recibidos del backend, separados del adelanto y sin recálculo local.
2. **Given** un ticket sin cotización, **When** el administrador abre el detalle, **Then** la interfaz indica que aún no hay cotización y no presenta un importe ficticio.

## Edge Cases

- Cookie vencida (401), rol insuficiente (403), ticket inexistente (404), conflicto (409), datos inválidos (422), servicio no disponible (503) o pérdida de red durante lectura/escritura.
- Respuesta paginada vacía, cambios de filtros mientras hay una solicitud en curso y exportación de un conjunto mayor al límite por página.
- Tickets heredados con `origin = null`, contacto obtenido de la cuenta y campos opcionales ausentes.
- Importe decimal como cadena, sin redondeo binario; el adelanto y el total de una cotización se presentan como importes distintos.
- Doble clic o reintento de creación: evitar envíos simultáneos en la misma pantalla y no inventar una respuesta cuando el resultado de red sea incierto.
- El backend admite 10 estados canónicos y 5 tipos de solicitud; la pantalla mantiene las etiquetas en español, pero envía los códigos originales.

## Requirements

### Functional Requirements

- **FR-001**: El sistema MUST conectar el tablero, la creación y el detalle administrativos a las rutas protegidas por ADMIN del contrato canónico del backend.
- **FR-002**: El sistema MUST conservar la identidad de sesión en cookie HttpOnly mediante solicitudes con credenciales incluidas; no enviará identidad del ADMIN en el cuerpo.
- **FR-003**: El sistema MUST consumir la lista administrativa paginada y conservar búsqueda, filtros combinables y orden estable; la exportación recorre todas las páginas del resultado filtrado.
- **FR-004**: El sistema MUST mostrar los cinco tipos canónicos: `REPAIR`, `SALE`, `PC_BUILD`, `SUPPORT` y `WARRANTY_CLAIM`, con etiquetas en español, y enviar el código canónico.
- **FR-005**: El sistema MUST mostrar los diez estados canónicos con etiquetas en español y enviar el código original al modificar el estado.
- **FR-006**: El sistema MUST distinguir orígenes `MANUAL` y `ONLINE`; el valor histórico nulo se muestra como desconocido.
- **FR-007**: El sistema MUST enviar altas manuales con contacto, equipo/título, detalle, tipo y adelanto opcional según el contrato; el código y estado inicial proceden de la respuesta backend.
- **FR-008**: El sistema MUST consultar el detalle por el identificador backend, permitir cambiar el estado desde el control existente, mostrar cotización/pago/auditoría disponibles y reflejar el PATCH devuelto por el servicio; los demás datos permanecen de solo lectura en esta feature.
- **FR-009**: El sistema MUST representar importes del contrato como decimales exactos y mantener visualmente separado adelanto de cotización total.
- **FR-010**: El sistema MUST permitir cancelación mediante estado `CANCELLED` y no ofrecer borrado físico.
- **FR-011**: El sistema MUST presentar estados de carga, vacío, no configurado, error recuperable, falta de sesión y permisos insuficientes; un fallo de API no se oculta como éxito ni sustituye registros reales por demo.
- **FR-012**: El sistema MUST mantener rutas de tickets y navegación administrativa accesibles solo para cuentas ADMIN cuando se consume el backend administrativo; cuentas TECHNICIAN no deben poder ejecutar operaciones ADMIN.
- **FR-013**: El sistema MUST preservar el diseño Banco, los componentes compartidos, el comportamiento responsivo y la navegación existente del taller.
- **FR-014**: El sistema MUST mostrar los datos de la cotización que entregue el detalle backend cuando exista; en esta feature el frontend no crea ni modifica cotizaciones.

### Key Entities

- **Ticket administrativo**: código, fecha, contacto, equipo, detalle, tipo, estado, origen, adelanto, cotización y estado de pago disponible.
- **Tipo y estado canónicos**: códigos del backend con etiquetas traducidas solo para presentación.
- **Cotización**: total calculado por backend, estado, método de mano de obra y líneas vinculadas al ticket; no reemplaza el adelanto.
- **Evento de auditoría**: actor, evento, campos modificados y fecha devueltos por el detalle administrativo.

## Success Criteria

### Measurable Outcomes

- **SC-001**: En el 100% de los casos de aceptación, la cola visible coincide con la respuesta paginada filtrada del backend, sin duplicados ni elementos inventados localmente.
- **SC-002**: Un administrador puede crear un ticket válido y abrir el identificador devuelto sin recargar la aplicación ni perder campos del contrato.
- **SC-003**: Al guardar un cambio, una lectura posterior refleja el mismo estado/campos y muestra el evento de auditoría correspondiente.
- **SC-004**: Todos los tipos y estados del contrato se pueden identificar en español y se envían con el código canónico correcto.
- **SC-005**: Las rutas administrativas no quedan disponibles para TECHNICIAN ni CUSTOMER y la sesión continúa viajando solo mediante cookie segura.
- **SC-006**: Las pantallas conservan las verificaciones responsivas existentes en anchos 360, 390, 768 y 1024 px sin desbordamiento horizontal.

## Assumptions

- El OpenAPI `specs/004-gestion-admin-tickets/contracts/admin-tickets.openapi.yaml` del backend es la fuente de verdad para rutas, campos, límites, respuestas y roles.
- El tablero, el formulario de alta y el detalle del taller son las únicas pantallas de tickets que se conectan en esta feature. La vista de tickets del cliente continúa consumiendo `/api/customer/tickets` y no se mezcla con el panel ADMIN.
- Los códigos de tipo y estado permanecen en inglés en los límites HTTP; las traducciones solo se usan en la interfaz.
- Las funciones pueden conservar modo demo únicamente cuando la API no está configurada; una solicitud fallida al backend no activa fallback de demostración.
- La ruta administrativa se habilita para `ADMIN`; el personal `TECHNICIAN` conserva las otras áreas permitidas del taller y no recibe acceso implícito a operaciones administrativas.
- El backend debe aplicar `004_admin_ticket_management.sql` a una base de datos autorizada antes de probar extremo a extremo. La aplicación de esa migración está pendiente en el repositorio backend.
- La API de inventario que el frontend ya espera no está implementada en el backend revisado. Por ello, esta feature no crea cotizaciones; una futura interfaz de creación requerirá primero un contrato backend para consultar inventario e IDs canónicos.
