# Feature Specification: Compras a proveedores en el panel del taller

**Feature Branch**: `006-compras-proveedores`  
**Created**: 2026-11-03  
**Status**: Draft  
**Input**: User description: "Agregar al frontend la sección de compras a proveedores, conectada con el backend y conservando el estilo visual existente."

## User Scenarios & Testing

### User Story 1 - Consultar compras y su detalle (Priority: P1)

Como ADMIN del taller, quiero consultar compras a proveedores y abrir su detalle para revisar comprobantes, importes, estados, responsable, recepciones y movimientos relacionados.

**Why this priority**: La sección debe hacer visible la información ya registrada en el backend y permitir verificar cada operación sin depender de registros demostrativos.

**Independent Test**: Con sesión ADMIN y compras existentes, buscar por proveedor, fechas, número de documento y estados; abrir un resultado y comparar encabezado, líneas, totales, pagos, recepciones e historial con los datos devueltos por el servicio.

**Acceptance Scenarios**:

1. **Given** ADMIN abre Compras, **When** el listado termina de cargar, **Then** ve compras paginadas con proveedor, comprobante, fecha, total, estado de recepción y estado de pago.
2. **Given** existen compras, **When** ADMIN filtra por proveedor, fechas, estado de recepción, estado de pago o número de documento, **Then** el listado muestra solo coincidencias y permite cambiar de página.
3. **Given** ADMIN abre una compra, **When** consulta el detalle, **Then** ve la información del comprobante, valores históricos de proveedor y artículos, líneas, totales, método/estado de pago, responsable, recepciones e historial.
4. **Given** no existen resultados o los filtros no coinciden, **When** termina la búsqueda, **Then** se presenta un estado vacío claro con opción de limpiar filtros.
5. **Given** la sesión expiró o el servicio no está disponible, **When** falla la consulta, **Then** la interfaz conserva una salida recuperable, muestra un mensaje en español y no presenta datos de demostración como compras reales.

---

### User Story 2 - Registrar una compra a proveedor (Priority: P1)

Como ADMIN, quiero registrar un comprobante recibido con sus líneas, costos y estado de pago para mantener el historial de compras del taller.

**Why this priority**: El registro es la operación central de la nueva sección y debe guardar los mismos campos y reglas que acepta el backend.

**Independent Test**: Seleccionar proveedor activo, capturar documento y dos líneas, guardar y comprobar que la compra aparece con los mismos valores; verificar que el stock no aumenta al guardar la factura.

**Acceptance Scenarios**:

1. **Given** ADMIN inicia un registro, **When** carga el formulario, **Then** puede seleccionar un proveedor activo, completar tipo/serie/número y fechas, seleccionar método/estado de pago y agregar líneas.
2. **Given** una línea corresponde a un repuesto existente, **When** ADMIN la agrega, **Then** puede seleccionarlo del inventario y revisar descripción, cantidad, costo, descuento e impuesto antes de guardar.
3. **Given** un concepto no corresponde al catálogo, **When** ADMIN lo agrega, **Then** puede registrarlo como línea libre sin asociarlo a un repuesto.
4. **Given** ADMIN guarda una compra válida, **When** el backend confirma, **Then** se muestra la compra persistida y su total calculado, pero el inventario permanece sin cambios hasta confirmar una recepción física.
5. **Given** el backend detecta el mismo comprobante para el proveedor, **When** ADMIN intenta guardarlo, **Then** se informa el conflicto sin vaciar el formulario ni aparentar que se creó una compra.
6. **Given** los datos no cumplen validaciones o el servidor no confirma el guardado, **When** se rechaza la operación, **Then** se identifican los campos corregibles o se ofrece reintentar sin duplicar el registro.

---

### User Story 3 - Confirmar recepción física (Priority: P2)

Como ADMIN, quiero confirmar las cantidades que llegaron del proveedor para que el inventario aumente solo cuando los artículos se reciben.

**Why this priority**: Registrar una factura no significa que la mercancía ya esté disponible; la interfaz debe separar el registro financiero de la recepción física.

**Independent Test**: Abrir una compra pendiente, registrar una recepción parcial, comprobar el nuevo estado y el stock; repetir la solicitud no debe volver a sumar existencias; confirmar lo restante debe completar la recepción.

**Acceptance Scenarios**:

1. **Given** una compra está registrada y aún no recibida, **When** ADMIN ve el inventario, **Then** el stock no incluye las unidades compradas.
2. **Given** quedan unidades pendientes, **When** ADMIN confirma cantidades recibidas, **Then** puede indicar cuánto llegó por línea y revisar la confirmación antes de enviarla.
3. **Given** el backend confirma una recepción parcial, **When** la interfaz actualiza la compra, **Then** muestra “Recepción parcial”, las cantidades recibidas y pendientes, y el stock actualizado para líneas vinculadas al catálogo.
4. **Given** todas las cantidades facturadas fueron recibidas, **When** ADMIN confirma la última recepción, **Then** el estado se muestra como “Recibida” y no se ofrece una recepción adicional.
5. **Given** el envío se repite después de perderse la respuesta, **When** el backend devuelve la recepción previa, **Then** la interfaz indica que fue recuperada y no duplica el movimiento.
6. **Given** una línea no está asociada al inventario, **When** se confirma su recepción, **Then** queda en el historial sin indicar que modificó el stock.

---

### User Story 4 - Mantener proveedores y estados de compra (Priority: P2)

Como ADMIN, quiero registrar, buscar, actualizar y desactivar proveedores, marcar pagos pendientes como pagados y cancelar compras aún no recibidas.

**Why this priority**: El formulario de compras requiere proveedores actualizados, y los estados deben poder mantenerse sin borrar el historial.

**Independent Test**: Crear y buscar un proveedor, actualizar sus datos, desactivarlo y confirmar que las compras históricas aún lo muestran; cambiar un pago de pendiente a pagado y cancelar una compra sin recepciones.

**Acceptance Scenarios**:

1. **Given** ADMIN consulta proveedores, **When** filtra por nombre o identificador tributario, **Then** ve el resultado con su estado y puede iniciar el alta o edición.
2. **Given** ADMIN registra un proveedor, **When** guarda nombre legal y datos comerciales, **Then** puede seleccionarlo en compras futuras.
3. **Given** un proveedor tiene compras históricas, **When** ADMIN lo desactiva, **Then** no aparece entre las opciones activas para nuevas compras y las existentes conservan el nombre guardado.
4. **Given** una compra tiene pago pendiente, **When** ADMIN confirma que fue pagada, **Then** el estado cambia a “Pagada”; la interfaz no permite retrocederlo a pendiente.
5. **Given** una compra todavía no tiene recepciones, **When** ADMIN confirma su cancelación, **Then** se muestra como “Cancelada” y deja de admitir cambios de recepción.
6. **Given** una compra ya tiene recepción, **When** ADMIN intenta cancelarla, **Then** se conserva el registro y se informa que no puede cancelarse desde este flujo.

### Edge Cases

- Una sesión CUSTOMER o TECHNICIAN abre directamente la ruta de Compras; no debe acceder a datos ni acciones administrativas.
- La sesión ADMIN caduca durante una lectura o escritura; el frontend debe solicitar nuevo acceso y preservar la ruta de retorno cuando sea posible.
- El servicio no está configurado en el entorno; la pantalla debe comunicarlo y no usar el estado de demostración del inventario o del banco como registro de compras.
- El proveedor fue desactivado luego de asociarse a la compra; debe seguir visible en el historial, aunque no pueda elegirse para una compra nueva.
- El repuesto fue eliminado luego de la compra; la descripción histórica debe seguir visible, aun si ya no puede seleccionarse del inventario actual.
- Un artículo de inventario tiene existencias actuales distintas a las mostradas antes de confirmar recepción; la interfaz debe reemplazarlas con la respuesta confirmada del backend.
- La cantidad recibida excede lo pendiente, el importe es inválido o el rango de fechas es invertido; se muestra el error y no se comunica éxito.
- El número de comprobante está duplicado; se conserva el formulario para corregirlo.
- Se pierde conexión luego de enviar una recepción; reintentar debe conservar la misma clave de solicitud hasta conocer el resultado.
- La lista está vacía, los filtros no tienen coincidencias o hay más de una página; cada estado debe tener indicaciones y acciones comprensibles.
- Una línea libre no modifica el inventario y no debe mostrarse como repuesto disponible.
- La compra está pagada pero no recibida, o recibida pero pendiente de pago; ambas dimensiones deben mostrarse por separado.

## Requirements

### Functional Requirements

- **FR-001**: La sección y sus acciones deben estar disponibles únicamente para ADMIN; la restricción del frontend complementa, pero no reemplaza, la autorización del servidor.
- **FR-002**: La interfaz debe agregar una entrada “Compras” a la navegación administrativa del taller y permitir consultar listado, detalle, registro y proveedores desde el diseño existente del panel.
- **FR-003**: El listado debe consultar compras del backend con filtros por proveedor, fechas, estado de recepción, estado de pago y número de documento, y respetar la paginación informada.
- **FR-004**: El detalle debe presentar encabezado, snapshots, líneas, cantidades recibidas/pendientes, subtotal, descuentos, impuestos, cargos, total, moneda, pago, responsable, recepciones y eventos de auditoría disponibles.
- **FR-005**: El formulario de compra debe permitir proveedor activo, documento, fechas, método de pago, estado `PENDING` o `PAID`, notas y una o más líneas con artículo opcional, descripción, cantidad, costo, descuento e impuesto.
- **FR-006**: Los importes enviados deben conservar dos decimales y la cantidad debe conservar la precisión aceptada por el backend; el total mostrado debe coincidir con el cálculo y la respuesta confirmados por el backend.
- **FR-007**: El selector debe mostrar productos activos del inventario y, al registrar una línea asociada, enviar el `id` numérico estable de `spare_parts` que devuelve el contrato de inventario en `spare_part_id`; las líneas libres deben conservar su descripción sin atribuirles SKU ni cambio de stock.
- **FR-008**: El registro de una compra debe informar que no aumenta existencias. La interfaz solo debe comunicar aumento de stock después de una respuesta satisfactoria de confirmación de recepción.
- **FR-009**: La recepción debe permitir registrar cantidades parciales por línea, mostrar lo pendiente y consumir la clave de idempotencia requerida por el backend para reintentos seguros.
- **FR-010**: Los estados de backend `REGISTERED`, `PARTIALLY_RECEIVED`, `RECEIVED` y `CANCELLED` deben mostrarse en español como “Registrada”, “Recepción parcial”, “Recibida” y “Cancelada”; `PENDING` y `PAID` como “Pendiente” y “Pagada”. Los valores enviados al backend deben conservar los códigos acordados.
- **FR-011**: La sección debe permitir mantener proveedores con nombre legal, identificador tributario, contacto, correo, teléfono, dirección, plazo estimado de entrega y estado activo; la desactivación no debe borrar compras históricas.
- **FR-012**: La edición de compra debe limitarse a cambios que acepte el backend, incluidos notas y transición de pago `PENDING → PAID`; no debe ofrecer edición de snapshots o líneas una vez que el registro queda guardado.
- **FR-013**: La cancelación solo debe estar disponible antes de cualquier recepción. Si el backend responde conflicto, la compra y sus movimientos deben conservarse y la interfaz debe mostrar el motivo en un mensaje claro.
- **FR-014**: La interfaz debe distinguir errores de sesión vencida, falta de autorización, validación, conflicto, recurso inexistente y servicio no disponible con acciones recuperables y mensajes en español.
- **FR-015**: El módulo debe reutilizar el lenguaje visual actual del panel: jerarquía de títulos, superficies, controles, badges, espaciado, tipografía y estados accesibles; las vistas deben adaptarse a 360, 390, 768 y 1024 px sin desbordamiento horizontal.
- **FR-016**: Cuando la API de compras no esté configurada o disponible, la sección debe indicar el problema; no debe presentar compras ficticias como datos operativos ni confirmar operaciones localmente.
- **FR-017**: La interfaz no debe generar asientos contables, registrar pagos parciales ni presentar libros electrónicos PLE.
- **FR-018**: La interfaz no debe ofrecer asociación a una orden de compra hasta que exista una consulta backend que permita seleccionar órdenes válidas; no debe pedir o inventar un ID manual.

### Key Entities

- **Compra de proveedor**: comprobante registrado con proveedor histórico, documento, fechas, importes, estado de recepción, pago y responsable.
- **Línea de compra**: artículo de inventario opcional o concepto libre con descripción, cantidad, costo, descuento e impuesto.
- **Recepción**: evento de llegada física con cantidades por línea, fecha, responsable y movimientos de stock aplicados.
- **Proveedor**: contraparte con datos legales y comerciales, y un estado que controla si puede usarse en compras nuevas.
- **Movimiento de inventario**: incremento de existencias relacionado a una línea recibida y visible desde el detalle de compra.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un ADMIN puede encontrar y abrir una compra por proveedor, documento o período en menos de 2 minutos.
- **SC-002**: En una revisión de 20 compras, el 100 % muestra en frontend el mismo total, estado de pago, estado de recepción y proveedor que informa el backend.
- **SC-003**: El 100 % de las compras registradas desde el frontend deja el stock sin cambios hasta que ADMIN confirma una recepción.
- **SC-004**: Reintentar una recepción tras una respuesta perdida no genera un incremento de stock adicional.
- **SC-005**: CUSTOMER y TECHNICIAN no ven ni pueden operar la sección; las respuestas 401 y 403 se manejan sin mostrar información financiera.
- **SC-006**: Un ADMIN puede completar el registro de una compra con proveedor existente y dos líneas válidas en menos de 4 minutos.
- **SC-007**: En pantallas de 360, 390, 768 y 1024 px no hay desplazamiento horizontal en listado, formulario ni detalle.

## Assumptions

- El backend de compras definido en `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml` es la fuente de verdad para nombres de campos, estados, respuestas y errores.
- El frontend reutilizará el patrón administrativo ya aplicado a contabilidad, tickets e inventario, incluidos navegación por rol, cookie de sesión, manejo de errores, tokens y componentes visuales compartidos.
- El acceso para las rutas de proveedores y compras requiere ADMIN. La lectura del catálogo para agregar líneas usa la sesión administrativa existente.
- Los montos se expresan en PEN y los pagos solo distinguen método y estado `PENDING`/`PAID`; no hay pagos parciales.
- En esta entrega no se selecciona una orden de compra porque el backend no publica una operación para listar órdenes; el campo opcional no se completa desde el frontend.
- Si el backend no está disponible o no está configurado, se muestra un estado de servicio no disponible; no se crean compras locales de demostración.
- El registro mostrado es interno y no equivale a asesoría contable, cumplimiento tributario o presentación PLE.

## Dependencies

- Contrato canónico de backend: `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml`.
- Rutas administrativas de compras/proveedores y autorización ADMIN del backend.
- Ruta existente de inventario para buscar repuestos activos.
- Sesión de taller y patrones visuales existentes en Banco, Repuestos y Contabilidad.
