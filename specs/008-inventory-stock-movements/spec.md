# Feature Specification: Movimientos de stock del inventario

**Feature Branch**: `[008-inventory-stock-movements]`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Crear el Specify frontend para consumir los cambios backend de trazabilidad del inventario, manteniendo las interfaces y el estilo visual existentes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar existencias iniciales (Priority: P1)

Como integrante autorizado del taller, quiero registrar el conteo inicial y su motivo al crear un repuesto para que el saldo no aparezca sin explicación.

**Why this priority**: La apertura permite que el catálogo actual empiece a usar el historial desde el primer día sin representar el saldo como un campo libre.

**Independent Test**: Crear un repuesto sin existencias y completar una apertura con cantidad positiva y motivo; el artículo debe mostrar el saldo confirmado y su apertura en el historial.

**Acceptance Scenarios**:

1. **Given** un ADMIN o TECHNICIAN crea un artículo y registra un conteo inicial positivo, **When** confirma el alta y la apertura, **Then** el artículo aparece con el saldo confirmado y un movimiento de apertura con motivo y actor.
2. **Given** el conteo inicial es cero, **When** el personal crea el artículo, **Then** queda con cero existencias y no se presenta un movimiento ficticio.
3. **Given** falla la apertura después de crear el artículo, **When** la interfaz recibe el error, **Then** informa que el artículo existe con saldo cero o permite completar la apertura, sin mostrar como confirmado el conteo no guardado.

---

### User Story 2 - Ajustar al conteo físico (Priority: P1)

Como integrante autorizado del taller, quiero registrar el conteo físico y explicar el motivo para conciliar las existencias reales con el sistema.

**Why this priority**: Mantiene la disponibilidad confiable y deja evidencia comprensible cuando se encuentra una diferencia.

**Independent Test**: Abrir un artículo, registrar un conteo distinto con motivo y confirmar que el saldo de la tarjeta cambia solo después de recibir la respuesta exitosa.

**Acceptance Scenarios**:

1. **Given** el artículo tiene un saldo diferente del conteo físico, **When** el personal envía el conteo y un motivo, **Then** la vista muestra el saldo confirmado y comunica el ajuste registrado.
2. **Given** el conteo coincide con el saldo actual, **When** el personal confirma, **Then** la interfaz comunica que no hubo variación y no crea una fila ficticia en el historial.
3. **Given** el backend rechaza la disminución por unidades reservadas, **When** llega el conflicto, **Then** se conserva el saldo mostrado anteriormente y se informa que debe resolverse la reserva.
4. **Given** se pierde la respuesta de una solicitud, **When** el personal reintenta la misma acción, **Then** la interfaz reutiliza la clave de esa operación y no aplica dos veces el ajuste.

---

### User Story 3 - Consultar el historial de existencias (Priority: P2)

Como integrante autorizado del taller, quiero consultar los movimientos de un repuesto para entender cuándo y por qué cambió su saldo.

**Why this priority**: La auditoría de cambios es el valor principal de la nueva trazabilidad y ayuda a resolver diferencias de inventario.

**Independent Test**: Abrir el historial desde un repuesto y comprobar que aparecen sus aperturas, ajustes, recepciones y ventas con saldos, fechas y responsable.

**Acceptance Scenarios**:

1. **Given** existen movimientos del artículo, **When** el personal abre su historial, **Then** ve los más recientes primero con tipo, cantidad, saldo anterior, saldo posterior, fecha, actor, motivo y origen cuando existan.
2. **Given** hay más resultados que caben en una página, **When** avanza o vuelve una página, **Then** no se repiten ni se omiten movimientos entre páginas.
3. **Given** el personal filtra por tipo o fechas, **When** aplica los filtros, **Then** se muestran solo los movimientos coincidentes y puede limpiar los filtros.
4. **Given** un movimiento es anterior al corte de trazabilidad, **When** aparece en el historial, **Then** se identifica como legado anterior al corte sin presentarlo como un ajuste actual.
5. **Given** un artículo fue retirado del catálogo, **When** el personal llega a su historial desde una referencia disponible, **Then** la historia continúa accesible y el artículo se identifica como inactivo.

---

### User Story 4 - Retirar un repuesto sin confundirlo con borrar su historial (Priority: P2)

Como integrante autorizado del taller, quiero retirar un repuesto del catálogo activo con una confirmación clara para no seleccionarlo en operaciones futuras.

**Why this priority**: El personal debe poder mantener el catálogo sin interpretar el retiro como la eliminación de evidencia histórica.

**Independent Test**: Retirar un repuesto con historial, comprobar que desaparece del listado activo y que el historial aún puede consultarse.

**Acceptance Scenarios**:

1. **Given** el artículo puede retirarse, **When** el personal confirma la acción, **Then** deja de aparecer entre los artículos activos y la interfaz dice que fue retirado del catálogo.
2. **Given** el artículo tiene historial, **When** se retira, **Then** la interfaz no afirma que los movimientos fueron borrados y su detalle histórico permanece accesible.
3. **Given** la operación es rechazada por una reserva u otra referencia, **When** llega el conflicto, **Then** el artículo permanece visible y la interfaz explica que no pudo retirarse.

### Edge Cases

- El usuario pierde la sesión antes de abrir, ajustar o consultar: se indica que debe iniciar sesión de nuevo y no se confirma una operación pendiente.
- Un usuario CUSTOMER intenta abrir la sección: no ve controles ni datos internos de inventario.
- El artículo deja de estar activo o no existe antes de completar una operación: se comunica que ya no está disponible y se ofrece recargar la lista.
- El motivo está vacío o excede el límite admitido: se marca el campo y no se envía la solicitud.
- El usuario hace doble clic o reintenta tras una falla de red: una misma intención conserva su clave de idempotencia; una nueva edición genera una clave nueva.
- El historial está vacío: se presenta un estado vacío, no un error ni filas de demostración.
- La API no está disponible: se muestra un error recuperable y el modo conectado no sustituye el inventario real por datos demo.
- Un filtro de fechas tiene inicio posterior al fin: se informa la validación y no se presenta un resultado como válido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La sección de inventario MUST conservar el diseño visual, la navegación, los filtros y los patrones de formulario actuales del área Taller.
- **FR-002**: La interfaz MUST separar los datos de catálogo (identificador, nombre, categoría, descripción, precio y umbral) de las operaciones que cambian existencias.
- **FR-003**: Al crear un artículo, la interfaz MUST iniciar el saldo en cero. Si el personal informa una cantidad inicial positiva, MUST requerir un motivo y confirmar la apertura antes de presentar ese saldo como guardado.
- **FR-004**: La edición ordinaria MUST permitir cambiar los datos de catálogo sin enviar `current_stock` como una modificación ordinaria del artículo.
- **FR-005**: La interfaz MUST permitir un ajuste desde el artículo mediante conteo físico y motivo obligatorio; MUST mostrar errores de campo sin borrar los datos ingresados.
- **FR-006**: La interfaz MUST actualizar saldo y vista de inventario solo tras una respuesta exitosa del backend; ante error, MUST conservar el saldo anterior.
- **FR-007**: Cada intención de apertura o ajuste MUST usar una clave idempotente estable en sus reintentos y una clave nueva para una operación distinta.
- **FR-008**: La interfaz MUST permitir abrir un historial asociado a cada repuesto, con paginación, filtro por tipo y rango de fechas, orden más reciente primero y estados de carga, vacío y error.
- **FR-009**: Cada movimiento visible MUST mostrar cantidad variada, saldo anterior y posterior, fecha, tipo, motivo y responsable cuando el backend los entregue; MUST mostrar su origen cuando esté asociado a una recepción o venta.
- **FR-010**: Los registros anteriores al corte MUST distinguirse como historia legado, sin atribuirles un motivo o responsable que el backend no tenga.
- **FR-011**: Retirar un artículo MUST requerir confirmación y la interfaz MUST describir el resultado como retiro del catálogo activo, sin asegurar que se borró su historial.
- **FR-012**: Las operaciones de inventario e historial MUST seguir disponibles solo para personal ADMIN o TECHNICIAN según la sesión vigente; CUSTOMER no debe acceder.
- **FR-013**: Las respuestas 401, 403, 404, conflictos 409, validaciones 422 y errores 503 MUST comunicarse con mensajes en español claros y recuperables, sin mostrar trazas ni detalles internos.
- **FR-014**: En modo API, los fallos de red o respuestas inválidas MUST conservar el estado actual y no reemplazar información por datos de demostración.
- **FR-015**: La integración MUST usar el contrato backend existente de movimientos como fuente de verdad, sin redefinir la semántica de conteo, reservas, saldos, actor o idempotencia.
- **FR-016**: La interfaz MUST ser navegable por teclado, anunciar estados de carga/error y mantener el diseño responsivo existente en 360, 390, 768 y 1024 píxeles.
- **FR-017**: En desarrollo sin URL API configurada, MUST conservarse el modo de demostración existente sin afirmar que los cambios demo fueron guardados en el backend.

### Backend Integration Boundary

El contrato canónico de esta integración está en `../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/008-trazabilidad-movimientos-inventario/contracts/inventory-movements.openapi.yaml`. Esta especificación frontend consume sus operaciones de apertura, ajuste y consulta de historial; el CRUD de catálogo sigue el contrato de `specs/005-api-inventario/contracts/inventory.openapi.yaml`.

El contrato backend acepta temporalmente `current_stock` opcional en altas y ediciones por compatibilidad con la UI actual. La nueva interfaz MUST dejar de enviarlo: alta comienza en cero, los conteos se registran por la operación correspondiente y las ediciones de catálogo no deben producir movimientos de stock accidentales.

### Key Entities *(include if feature involves data)*

- **Repuesto**: artículo activo o retirado, identificado por su ID estable y SKU, con saldo vigente que se muestra como resultado del backend.
- **Movimiento de inventario**: evidencia de una apertura, ajuste, recepción o venta, con cantidad, saldos anterior/posterior, fecha, tipo, actor, motivo y origen disponible.
- **Conteo físico**: saldo contado por el personal y motivo ingresados para una apertura o ajuste; no es una sustitución libre del saldo persistido.
- **Clave de operación**: identificador que permite reintentar una misma apertura o ajuste sin duplicar su efecto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El personal puede completar una apertura positiva o un ajuste válido en menos de 90 segundos con los campos y confirmaciones requeridos.
- **SC-002**: El 100 % de las operaciones de stock mostradas como confirmadas refleja el saldo devuelto por el servicio; los errores no se presentan como éxito.
- **SC-003**: El personal puede localizar un movimiento reciente por tipo o fecha en menos de 30 segundos.
- **SC-004**: Un reintento de la misma apertura o ajuste no produce en la interfaz una segunda variación del saldo.
- **SC-005**: La UI presenta historial legado como anterior al corte y no inventa motivos ni responsables ausentes.
- **SC-006**: Las vistas de inventario, operación de stock e historial siguen utilizables a los cuatro anchos responsivos establecidos por el proyecto, sin desplazamiento horizontal.

## Assumptions

- La vista sigue restringida a ADMIN y TECHNICIAN, en coherencia con la sección existente.
- Se conserva la estética Banco, la navegación actual de Taller y los componentes compartidos de alertas, diálogos, paginación y avisos.
- El ID numérico del repuesto ya se conserva al mapear la respuesta de inventario y se utiliza para abrir las operaciones de movimientos; el SKU continúa identificando las rutas actuales del catálogo.
- Al crear un repuesto con saldo inicial positivo, el frontend crea primero el artículo con saldo cero y después registra la apertura; si la apertura falla, comunica claramente el estado parcial para que el usuario pueda reintentarla sin confundirla con un saldo confirmado.
- La clave idempotente se genera en el frontend para una acción y se conserva únicamente durante sus reintentos; no se trata como credencial ni dato de sesión.
- `VITE_API_URL`, el proxy same-origin de producción y el modo demo existente se conservan sin cambios de configuración.
- Esta feature complementa `specs/005-inventory-api-integration/` y reemplaza solo su interacción de escritura directa de existencias y la interpretación del retiro; el listado, búsqueda, categorías, precios y umbral siguen cubiertos por el Spec 005.
- El alcance es únicamente frontend. El backend y la base local ya tienen el contrato y la migración aplicados; otros entornos deben cumplir el mismo contrato antes de habilitar esta UI.
