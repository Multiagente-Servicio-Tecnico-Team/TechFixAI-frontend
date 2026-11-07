# Feature Specification: Gestión de asientos contables en el taller

**Feature Branch**: `[003-asientos-contables]`

**Created**: 2026-11-02

**Status**: Ready for implementation

**Input**: User description: "Definir la gestión de asientos contables para el frontend, consistente con el backend y manteniendo las interfaces y el diseño existentes."

## User Scenarios & Testing

### User Story 1 - Registrar un asiento contable (Priority: P1)

Una persona administradora del taller registra una operación con fecha, concepto, detalle, categoría y líneas de debe/haber. Antes de enviarla puede revisar el resumen y confirmar la creación. El asiento queda confirmado al guardarse, por lo que la interfaz debe dejar claro que luego no se podrá editar ni borrar.

**Why this priority**: El registro operativo es el propósito principal de la función y permite dejar evidencia contable desde el taller.

**Independent Test**: Con una sesión ADMIN y categorías disponibles, completar dos o más líneas balanceadas, revisar los totales y confirmar. El asiento aparece una sola vez en la lista con su correlativo y estado confirmado.

**Acceptance Scenarios**:

1. **Given** una persona ADMIN autenticada, **When** abre el registro, **Then** puede elegir una categoría activa, indicar fecha, concepto y detalle, y capturar dos o más líneas con código/nombre de cuenta, descripción opcional y debe o haber.
2. **Given** líneas válidas y balanceadas, **When** la persona revisa el resumen, **Then** ve los totales de debe y haber en soles y puede confirmar la operación con una acción explícita.
3. **Given** un asiento confirmado, **When** el guardado termina, **Then** la interfaz muestra el correlativo, fecha, concepto, total, responsable y estado confirmado, y permite abrir el detalle.
4. **Given** líneas desbalanceadas, importes inválidos o campos obligatorios incompletos, **When** intenta confirmar, **Then** se indican los campos o líneas que debe corregir y no se muestra una confirmación exitosa.
5. **Given** un fallo de red o un resultado incierto durante el guardado, **When** reintenta la misma operación, **Then** se conserva la referencia de ese intento y no se duplica el asiento.

---

### User Story 2 - Consultar y revisar asientos (Priority: P1)

Una persona administradora consulta los asientos existentes, filtra la lista y abre un detalle legible para revisar las líneas, totales, responsable, fechas y trazabilidad.

**Why this priority**: El personal necesita encontrar y verificar registros para administrar el historial y decidir si una operación requiere corrección.

**Independent Test**: Con asientos de distintas fechas, categorías y estados, localizar uno con filtros, avanzar entre resultados paginados y comprobar que su detalle coincide con los datos guardados.

**Acceptance Scenarios**:

1. **Given** asientos existentes, **When** la persona abre Contabilidad, **Then** ve un listado ordenado con correlativo, fecha de operación, concepto, categoría, monto, estado y responsable.
2. **Given** el listado, **When** aplica fecha desde/hasta, categoría, estado o correlativo, **Then** ve solo coincidencias y puede recorrer los resultados sin perder la orientación.
3. **Given** que no hay asientos o ningún filtro coincide, **When** el listado termina de cargar, **Then** se presenta un estado vacío claro y una salida para registrar un asiento o limpiar filtros.
4. **Given** una fila del listado, **When** la persona abre su detalle, **Then** ve encabezado, moneda PEN, fecha de operación, fecha de registro/actualización, categoría, responsable, concepto, detalle, líneas ordenadas y totales de debe/haber.
5. **Given** un asiento revertido o una reversión, **When** la persona revisa el detalle, **Then** puede identificar el estado, vínculo con el asiento relacionado, fecha y razón de reversión, y los eventos de auditoría disponibles.
6. **Given** una carga o consulta fallida, **When** se muestra el error, **Then** la persona recibe un mensaje comprensible y puede reintentar sin ver trazas, SQL ni información sensible.

---

### User Story 3 - Revertir un asiento confirmado (Priority: P2)

Una persona administradora corrige un asiento confirmado registrando una reversión vinculada con fecha y razón. La interfaz explica que la operación creará un nuevo asiento compensatorio y no modificará ni eliminará el original.

**Why this priority**: La reversión conserva la historia verificable y permite corregir sin alterar un registro confirmado.

**Independent Test**: Desde el detalle de un asiento confirmado, completar fecha y razón, revisar la confirmación, ejecutar la reversión y verificar el estado del original, el nuevo correlativo y el enlace entre ambos.

**Acceptance Scenarios**:

1. **Given** un asiento confirmado sin reversión, **When** la persona elige Revertir, **Then** recibe una explicación y un formulario con fecha y razón obligatorias antes de confirmar.
2. **Given** una reversión válida, **When** la persona confirma, **Then** aparece el nuevo asiento inverso, el original figura como revertido y ambos detalles enlazan al otro registro.
3. **Given** un asiento ya revertido, **When** la persona vuelve a abrir su detalle, **Then** la acción de reversión no está disponible y se muestra la referencia a la reversión existente.
4. **Given** que otra solicitud ya revirtió el asiento, **When** esta pantalla recibe un conflicto, **Then** informa que el registro cambió y permite actualizar el detalle sin presentar una segunda reversión como exitosa.

### Edge Cases

- Un usuario ADMIN puede abrir y usar la pantalla; TECHNICIAN y CUSTOMER no deben ver la opción ni acceder mediante una ruta directa.
- Si TECHNICIAN o CUSTOMER intenta abrir la ruta contable directamente, la interfaz muestra «Solo administradores pueden acceder a Contabilidad» y permite volver al panel del taller, sin solicitar ni mostrar datos contables.
- El backend puede responder `401` si expiró la sesión y `403` si la cuenta no tiene autorización; no se presenta información contable en esos casos.
- El listado puede estar vacío, la paginación puede quedar fuera de rango tras aplicar un filtro o un asiento puede dejar de estar disponible al abrirlo.
- Una línea no puede tener debe y haber positivos a la vez ni ambos en cero. Cada asiento requiere al menos dos líneas y sus totales deben balancear exactamente a dos decimales.
- Un reintento tras agotarse el tiempo de espera debe corresponder a la misma operación; una modificación del formulario inicia una operación nueva.
- La categoría usada por un asiento histórico puede dejar de estar disponible para nuevos registros, pero debe seguir visible en ese asiento.
- El asiento se confirma inmediatamente al guardarse: no existe borrador, edición posterior ni borrado desde la interfaz.
- Una persona puede cancelar el formulario de reversión antes de confirmar; hacerlo no cambia el original.
- La información debe seguir siendo legible y operable por teclado en anchos móviles y en tema claro u oscuro.

## Requirements

### Functional Requirements

- **FR-001**: La experiencia debe estar disponible únicamente para una persona con rol `ADMIN`; una cuenta `TECHNICIAN` o `CUSTOMER` no puede consultar ni operar información contable. El control visual no reemplaza la autorización del servidor.
- **FR-002**: El acceso a Contabilidad debe integrarse en la navegación existente del taller, aparecer solo para `ADMIN` y mantener las rutas protegidas para visita directa.
- **FR-003**: La lista debe presentar correlativo, fecha de operación, concepto, categoría, importe resumen en PEN, estado y responsable.
- **FR-004**: La persona debe poder filtrar por rango de fechas, categoría, estado y correlativo, y recorrer resultados paginados con los límites y el orden definidos por el contrato backend.
- **FR-005**: La vista de detalle debe presentar todos los datos disponibles para la revisión: encabezado, moneda, fecha de operación, fechas de registro/actualización, concepto, detalle, categoría, responsable, líneas ordenadas, debe, haber, totales, estado, historial y vínculo de reversión cuando exista.
- **FR-006**: La persona debe poder iniciar un asiento con fecha, concepto, detalle, categoría y al menos dos líneas; cada línea contiene código, nombre, descripción opcional y un importe en debe o haber.
- **FR-007**: La interfaz debe calcular y presentar los totales de debe y haber con precisión de dos decimales, impedir la confirmación si falta información o no existe balance y dejar que el servidor valide el resultado final.
- **FR-008**: Antes de enviar un asiento, la persona debe revisar un resumen y confirmar explícitamente que el asiento se registrará como confirmado y no podrá editarse ni borrarse.
- **FR-009**: Tras un alta satisfactoria, la interfaz debe mostrar el correlativo y estado confirmados y ofrecer el acceso al detalle del registro.
- **FR-010**: Cada envío de alta debe conservar la misma referencia al reintentarse sin cambios tras una respuesta incierta; la interfaz no debe crear duplicados por doble clic o reintento.
- **FR-011**: La persona debe poder solicitar una reversión de un asiento confirmado ingresando fecha y razón obligatorias, revisar una advertencia y confirmar antes de enviarla.
- **FR-012**: Al completar una reversión, la interfaz debe presentar el nuevo asiento y el estado/vínculos actualizados del original; no debe ofrecer edición o borrado físico.
- **FR-013**: La interfaz debe representar estados de carga, vacío, error y reintento para lista, detalle, categorías, alta y reversión sin perder entradas recuperables del formulario.
- **FR-014**: Los importes se deben mostrar en soles como cantidades monetarias exactas y no usar formato que oculte diferencias de balance.
- **FR-015**: Los errores de sesión, permisos, validación, conflicto, recurso inexistente y disponibilidad se deben presentar con mensajes apropiados para la persona, sin trazas, secretos ni información de otras cuentas.
- **FR-016**: La experiencia debe reutilizar la identidad visual Banco, sus estilos, tokens, controles y diálogos existentes; no debe crear una interfaz visual independiente del taller.
- **FR-017**: Las vistas deben funcionar con teclado, foco visible, etiquetas accesibles y estructura legible por tecnologías de asistencia. En listas móvil, los datos deben reorganizarse sin desplazamiento horizontal.
- **FR-018**: La UI debe reflejar que las categorías y códigos de cuenta son datos internos y que el producto no valida un catálogo PCGE, genera libros PLE ni los presenta a SUNAT.
- **FR-019**: El frontend debe consumir el contrato contable canónico del backend. Si el contrato cambia, se actualiza esta especificación local antes de ajustar la experiencia; el backend permanece como fuente de verdad para reglas, autorización y datos.

### Key Entities

- **Asiento contable**: Registro confirmado con correlativo, fecha de operación, concepto, detalle, categoría, moneda, estado, totales, responsable y fechas de auditoría.
- **Línea contable**: Cuenta y descripción con un importe de debe o haber que forma parte del asiento.
- **Categoría contable**: Clasificación controlada que se usa en nuevos asientos y permanece visible en registros históricos.
- **Responsable**: Administrador identificado por la sesión que registró o revirtió una operación.
- **Reversa**: Nuevo asiento compensatorio asociado al asiento original, con fecha, razón, responsable y eventos relacionados.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de usuarios sin rol ADMIN quedan fuera de las pantallas contables, y el backend rechaza sus solicitudes de lectura o escritura sin exponer datos contables.
- **SC-002**: El 100% de asientos enviados desde la interfaz contiene al menos dos líneas y muestra totales de debe/haber iguales a dos decimales; un asiento inválido no se confirma en la UI.
- **SC-003**: Una persona ADMIN puede completar el alta y abrir el detalle resultante sin volver a capturar los datos del asiento.
- **SC-004**: Un reintento de la misma alta no produce asientos duplicados; el resultado presentado corresponde al asiento previamente aceptado.
- **SC-005**: El 100% de las reversiones se presenta como un registro enlazado nuevo y deja visible el original con estado revertido.
- **SC-006**: La lista, formulario y detalle no requieren desplazamiento horizontal a anchos de 360, 390, 768 y 1024 px.
- **SC-007**: Todos los campos, filtros, acciones y diálogos son alcanzables por teclado y muestran foco visible; errores y cambios de estado se anuncian a tecnologías de asistencia.

## Assumptions

- Esta especificación cubre solo la experiencia web del frontend. La especificación y el contrato del backend son canónicos para roles, reglas contables, estados, importes, errores y persistencia.
- El repositorio backend implementa el registro interno contable solo para `ADMIN`, confirmación al crear, balance debe/haber, categorías internas, consultas y reversión manual; la UI debe mantener esas decisiones.
- La sesión vigente ya existe y viaja mediante la cookie HttpOnly compartida por el taller; no se solicitan credenciales contables separadas ni se guarda un token en el navegador.
- Las cuentas de taller actuales agrupan `ADMIN` y `TECHNICIAN` bajo la etiqueta visual `staff`. Para mostrar la función solo a ADMIN, el frontend debe conservar la distinción de rol que entrega el backend sin almacenar secretos.
- La vista se integra en el contexto `/taller` y el sistema visual Banco; no cambia el portal del cliente, el flujo de chat, inventario ni tickets.
- La versión inicial no incluye borradores, edición, eliminación, exportación contable, contabilización automática de pagos, PLE ni presentación a SUNAT.
- La validación manual de código/denominación de cuenta contra PCGE queda fuera de alcance; los valores se muestran tal como los registra el ADMIN.
- Fuente canónica de requisitos backend: [spec de asientos contables](../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/003-asientos-contables/spec.md).
- Contrato HTTP canónico: [OpenAPI de asientos contables](../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/003-asientos-contables/contracts/accounting.openapi.yaml).
