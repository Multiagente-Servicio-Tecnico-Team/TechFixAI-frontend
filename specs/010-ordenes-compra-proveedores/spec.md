# Feature Specification: Ordenes de compra a proveedores

**Feature Branch**: `[010-ordenes-compra-proveedores]`

**Created**: 2026-11-09

**Status**: Draft

**Input**: Agregar al frontend la gestion de ordenes de compra a proveedores que ya soporta el backend, conservando la interfaz y el flujo actual de comprobantes de compra.

## User Scenarios & Testing

### User Story 1 - Consultar y crear ordenes (Priority: P1)

Como ADMIN, quiero consultar ordenes de compra separadas de las facturas y crear una orden en borrador para planificar una compra a un proveedor.

**Why this priority**: Es el inicio del abastecimiento y permite diferenciar lo solicitado al proveedor de lo recibido y facturado.

**Independent Test**: Con una cuenta ADMIN, abrir la lista, filtrar ordenes y crear un borrador con una linea de inventario y una linea libre. Confirmar que crear el borrador no modifica las existencias.

**Acceptance Scenarios**:

1. **Given** ADMIN abre Compras, **When** elige Ordenes de compra, **Then** ve una lista separada de comprobantes con proveedor, fecha, total y estado.
2. **Given** existen ordenes, **When** ADMIN filtra por proveedor, estado o rango de fechas y recorre paginas, **Then** los resultados y la paginacion corresponden a esos filtros.
3. **Given** ADMIN crea una orden, **When** selecciona un proveedor activo y agrega lineas validas, **Then** el borrador queda guardado y puede abrirse.
4. **Given** una linea corresponde a un repuesto, **When** ADMIN lo selecciona del catalogo, **Then** la orden conserva su identificador y descripcion historica.
5. **Given** una linea es un concepto libre, **When** se agrega a la orden, **Then** queda identificada como linea sin repuesto y no se presenta como inventario.
6. **Given** no hay ordenes que mostrar, **When** termina la consulta, **Then** la vista presenta un estado vacio y una accion para crear una orden.

### User Story 2 - Editar, emitir y cancelar (Priority: P1)

Como ADMIN, quiero preparar una orden, emitirla al proveedor y cancelar el saldo que ya no se comprara, conservando el historial de acciones.

**Independent Test**: Editar y emitir un borrador; confirmar que deja de ser editable y que no cambia el stock. Cancelar otra orden con motivo y verificar que las recepciones anteriores siguen visibles.

**Acceptance Scenarios**:

1. **Given** la orden esta en borrador, **When** ADMIN cambia sus datos o lineas, **Then** el detalle muestra los datos guardados y el total actualizado.
2. **Given** una orden fue emitida, **When** ADMIN la abre, **Then** puede consultar sus datos y no se le ofrecen cambios de borrador.
3. **Given** la orden esta en borrador, **When** ADMIN confirma emitirla, **Then** se muestra el estado y la fecha devueltos por el servicio y no cambia el inventario.
4. **Given** una orden permite cancelacion, **When** ADMIN confirma cancelar, **Then** debe indicar un motivo antes de enviar la accion.
5. **Given** la orden tuvo recepciones antes de cancelarse, **When** ADMIN revisa el detalle, **Then** las cantidades recibidas y canceladas aparecen separadas y no se revierten las recepciones.
6. **Given** una accion no es valida para el estado actual, **When** el servicio la rechaza, **Then** la interfaz conserva los datos y explica el conflicto sin mostrar exito.

### User Story 3 - Registrar recepciones fisicas (Priority: P1)

Como ADMIN, quiero registrar una entrega parcial o completa contra una orden emitida y ver las cantidades recibidas y pendientes.

**Independent Test**: Emitir una orden de diez unidades, recibir cuatro y verificar el saldo de seis. Repetir el envio tras simular una respuesta perdida y confirmar que no se presenta una segunda recepcion ni un segundo movimiento.

**Acceptance Scenarios**:

1. **Given** la orden esta emitida o parcialmente recibida, **When** ADMIN inicia una recepcion, **Then** solo puede ingresar cantidades positivas hasta el saldo pendiente de sus lineas.
2. **Given** ADMIN revisa una recepcion antes de confirmarla, **When** ve el resumen, **Then** distingue repuestos de conceptos libres y entiende que solo los repuestos recibidos afectan existencias.
3. **Given** una recepcion fue confirmada, **When** se actualiza el detalle, **Then** se muestran cantidades, fecha, responsable y estado confirmados.
4. **Given** se pierde la respuesta de una recepcion, **When** ADMIN reintenta la misma operacion, **Then** se reconoce el resultado previo y no se duplica el registro.
5. **Given** el saldo fue excedido o la orden ya no admite recepciones, **When** el servicio rechaza la solicitud, **Then** los valores ingresados se conservan y se ofrece corregirlos o volver a consultar.

### User Story 4 - Consultar y vincular comprobantes (Priority: P2)

Como ADMIN, quiero registrar un comprobante desde una orden o vincular una orden al crear el comprobante, para revisar lo pedido, lo recibido y lo facturado por separado.

**Independent Test**: Iniciar un comprobante nuevo desde una orden, vincular las lineas que correspondan y revisar ambos detalles. Confirmar que el vinculo no crea una recepcion ni altera existencias.

**Acceptance Scenarios**:

1. **Given** ADMIN empieza un comprobante desde una orden, **When** se abre el formulario existente, **Then** se identifica proveedor y orden y ADMIN puede revisar los datos antes de guardar.
2. **Given** ADMIN registra un comprobante con una orden, **When** relaciona una linea, **Then** solo puede elegir una linea de esa orden o dejarla sin conciliar.
3. **Given** el proveedor del comprobante no coincide con el de la orden, **When** se intenta guardar, **Then** el conflicto se explica y los datos no se pierden.
4. **Given** una factura esta vinculada, **When** ADMIN revisa la orden o la factura, **Then** el vinculo es visible y los estados de pago y recepcion siguen diferenciados.
5. **Given** una linea de factura no se relaciono explicitamente, **When** se consulta la conciliacion, **Then** aparece como "Sin conciliar" y no se infiere una relacion por nombre, SKU o cantidad.
6. **Given** un comprobante pertenece a una orden, **When** ADMIN consulta acciones de recepcion, **Then** se le dirige a la orden y no se ofrece registrar la misma recepcion desde el comprobante.

### Edge Cases

- La lista esta vacia, los filtros no encuentran resultados o la pagina solicitada ya no existe.
- Un proveedor o repuesto se desactiva despues de estar guardado en una orden; sus datos historicos siguen visibles y no se ofrece para nuevas ordenes.
- Proveedores, inventario u ordenes no estan disponibles; la interfaz no reemplaza informacion operativa por datos ficticios.
- Se pierde la conexion al guardar, emitir, cancelar o recibir; se vuelve a consultar el estado antes de repetir la accion o anunciar exito.
- Otro ADMIN cambia el estado o recibe unidades mientras la pantalla esta abierta; se informa el conflicto y se ofrece actualizar la orden.
- Se cancela una orden parcialmente recibida; se preserva lo recibido y se muestra como cancelado solo el saldo.
- Un comprobante ya creado no se puede vincular despues si el servicio no ofrece esa accion; la interfaz solo permite elegir la orden durante la creacion.
- CUSTOMER o TECHNICIAN intenta abrir la seccion; no obtiene acceso a la informacion administrativa.
- La sesion expira durante una accion; el estado local no se presenta como guardado.
- Los importes o cantidades son invalidos; se conserva el formulario y se explica como corregirlo.

## Requirements

### Functional Requirements

- **FR-001**: Solo ADMIN puede consultar y gestionar ordenes. La restriccion visual no reemplaza la autorizacion del servicio.
- **FR-002**: La seccion Compras debe conservar las vistas existentes de comprobantes y proveedores e incorporar una vista de ordenes con el mismo lenguaje visual y navegacion del taller.
- **FR-003**: ADMIN debe poder listar ordenes, filtrar por proveedor, estado y fechas, recorrer resultados y abrir el detalle.
- **FR-004**: ADMIN debe poder crear y editar borradores con proveedor activo, fecha estimada, notas y lineas de repuesto o concepto libre. El total mostrado debe coincidir con el confirmado por el servicio.
- **FR-005**: Las lineas de inventario deben identificar el repuesto por su ID estable; el SKU o el nombre no deben sustituir ese identificador. La orden conserva la descripcion historica.
- **FR-006**: Crear, editar o emitir una orden no modifica existencias. El frontend muestra cambios solo despues de una recepcion confirmada.
- **FR-007**: ADMIN debe poder emitir borradores y consultar estado, fecha y responsable de la accion.
- **FR-008**: ADMIN debe poder cancelar ordenes permitidas con motivo obligatorio y confirmacion; las cantidades recibidas se conservan y se distinguen del saldo cancelado.
- **FR-009**: ADMIN debe poder registrar recepciones parciales o completas contra ordenes elegibles, revisar cantidades pendientes y confirmar la operacion.
- **FR-010**: Al enviar una recepcion, la interfaz debe conservar la clave de la operacion en caso de reintento hasta conocer su resultado, evitando duplicar recepciones.
- **FR-011**: La recepcion de un concepto libre se registra en la orden, pero no se presenta como movimiento de inventario.
- **FR-012**: El detalle debe distinguir cantidades pedidas, recibidas, pendientes, facturadas y canceladas. Cuando no exista relacion explicita de factura, debe mostrarse "Sin conciliar".
- **FR-013**: El formulario actual de comprobantes debe permitir asociar una orden al crear un nuevo comprobante y relacionar opcionalmente sus lineas con lineas de esa orden. Los comprobantes sin orden siguen disponibles.
- **FR-014**: La interfaz no debe ofrecer vincular posteriormente comprobantes ya guardados ni recibir existencias desde el comprobante si esas acciones no estan disponibles.
- **FR-015**: Los estados de orden se muestran en espanol con estas equivalencias: DRAFT (Borrador), ISSUED (Emitida), PARTIALLY_RECEIVED (Recepcion parcial), RECEIVED (Recibida) y CANCELLED (Cancelada). No se confunden con los estados de comprobante o pago.
- **FR-016**: Las vistas deben incluir carga, vacio, error y recuperacion; los rechazos de sesion, permisos, ausencia, conflicto, validacion o indisponibilidad no deben mostrarse como cambios exitosos.
- **FR-017**: La seccion debe usar la configuracion actual de acceso y sesion de la aplicacion y no permitir editar la identidad del responsable.
- **FR-018**: Si el servicio no esta disponible, no se muestran ordenes ficticias ni se aceptan cambios solo en el navegador.
- **FR-019**: Formularios y vistas deben ser operables con teclado, tener etiquetas claras y adaptarse a 360, 390, 768 y 1024 px sin desbordamiento horizontal.

### Key Entities

- **Orden de compra**: Solicitud al proveedor con estado, fecha, moneda, total, responsable y lineas.
- **Linea de orden**: Repuesto o concepto libre con cantidad, costo y descripcion historica.
- **Recepcion**: Registro de entrega fisica con lineas y cantidades, fecha, responsable y resultado de inventario cuando corresponde.
- **Comprobante de proveedor**: Documento independiente que puede vincularse a una orden y conciliar sus lineas.
- **Actividad**: Registro visible de creacion, edicion, emision, cancelacion y recepcion.

## Success Criteria

### Measurable Outcomes

- **SC-001**: En una revision de 20 ordenes, el 100% de estados y totales coincide con la informacion guardada.
- **SC-002**: ADMIN puede encontrar una orden por proveedor, estado y periodo y abrirla en menos de dos minutos.
- **SC-003**: Crear, editar y emitir ordenes desde la interfaz ocasiona cero cambios de existencias.
- **SC-004**: Todas las recepciones confirmadas muestran cantidades y estado coincidentes; un reintento de la misma operacion no duplica el resultado.
- **SC-005**: Una orden cancelada despues de una recepcion conserva todas las cantidades recibidas y muestra como cancelado solo el saldo.
- **SC-006**: El vinculo de un comprobante es visible desde ambas vistas y nunca genera una segunda recepcion.
- **SC-007**: CUSTOMER y TECHNICIAN no pueden consultar informacion ni acciones de ordenes.
- **SC-008**: Lista, formulario y detalle se pueden operar a 360, 390, 768 y 1024 px sin desplazamiento horizontal.

## Assumptions

- Compras existente sigue siendo el punto de entrada. Ordenes se agrega sin sustituir comprobantes ni administracion de proveedores.
- El contrato OpenAPI del backend Spec 010 define los campos, estados, errores y reglas validas. El contrato del backend Spec 006 define el registro de comprobantes y su relacion opcional con una orden.
- La base de prueba ya tiene la migracion de ordenes aplicada. Los demas entornos deben completar sus migraciones antes de habilitar esta vista.
- Los importes se muestran en PEN. Esta experiencia no registra pagos, asientos contables ni movimientos de inventario por su cuenta.
- La conciliacion de lineas requiere una relacion explicita; no se adivina por coincidencia de texto.

## Dependencies

- El servicio de ordenes de compra y recepciones descrito en `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/010-ordenes-compra-proveedores/contracts/purchase-orders.openapi.yaml`.
- El servicio de comprobantes descrito en `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml`.
- Las fuentes de proveedores, inventario, sesion ADMIN y los patrones visuales y de navegacion ya presentes en el frontend.
