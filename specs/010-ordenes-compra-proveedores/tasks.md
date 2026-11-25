---
description: "Task list for supplier purchase-order frontend integration"
---

# Tasks: Ordenes de compra a proveedores

**Input**: Documentos de diseno en `specs/010-ordenes-compra-proveedores/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`.

**Tests**: Se incluyen tareas de prueba porque cada historia define criterios de prueba independientes y el proyecto exige validar el frontend antes de cerrar cambios.

**Organization**: Tareas agrupadas por historia de usuario para entregar incrementos comprobables.

## Phase 1: Setup

**Purpose**: Preparar el trabajo en la aplicacion existente.

El proyecto React/Vite, sus clientes de API y el entorno Vitest ya existen; no se requieren nuevas dependencias ni inicializacion adicional.

---

## Phase 2: Foundational

**Purpose**: Habilitar los modelos de presentacion y operaciones compartidas que necesitan todas las historias.

- [ ] T001 [P] Escribir pruebas unitarias para etiquetas de estado DRAFT/Borrador, ISSUED/Emitida, PARTIALLY_RECEIVED/Recepcion parcial, RECEIVED/Recibida y CANCELLED/Cancelada en `tests/unit/purchases-domain.test.js`.
- [X] T002 Implementar el mapeo de estados de orden y helpers puros de presentacion en `src/domain/purchases.js`, sin recalcular transiciones ni datos de inventario.
- [ ] T003 [P] Escribir pruebas unitarias del cliente para listar, crear, consultar, editar, emitir, cancelar y consultar/registrar recepciones; incluir cookie, filtros, errores e `Idempotent-Replayed` en `tests/unit/purchases-api.test.js`.
- [X] T004 Extender `src/features/purchases/purchasesApi.js` con las operaciones del contrato backend 010; usar el resolver de URL y `credentials: "include"` existentes, validar respuestas y conservar la clave `Idempotency-Key` UUID en reintentos.

---

## Phase 3: User Story 1 - Consultar y crear ordenes (Priority: P1)

**Goal**: ADMIN lista, filtra, crea y consulta borradores de ordenes; el stock no cambia.

**Independent Test**: Con ADMIN, filtrar y paginar la lista, crear un borrador con linea de catalogo y concepto libre, abrirlo y confirmar que el inventario no cambio.

- [ ] T005 [P] [US1] Escribir pruebas de integracion para lista, filtros, paginacion, estado vacio y creacion del borrador en `tests/integration/purchase-orders-list-create.test.jsx`.
- [X] T006 [US1] Crear el hook `src/features/purchases/usePurchaseOrders.js` para cargar lista/detalle, filtros, paginacion y creacion; manejar carga, error, sesion vencida y recarga tras guardar.
- [X] T007 [P] [US1] Crear `src/features/purchases/PurchaseOrdersList.jsx` con filtros `supplier_id`, `status`, `date_from`, `date_to`, paginacion, estado vacio y enlace al detalle.
- [X] T008 [P] [US1] Crear `src/features/purchases/PurchaseOrderCreate.jsx` para proveedor activo y lineas de catalogo/libres; enviar `spare_part_id` numerico o `null`, `quantity` entera positiva y `unit_cost` decimal monetario.
- [X] T009 [P] [US1] Crear el detalle de solo lectura inicial en `src/features/purchases/PurchaseOrderDetail.jsx`, mostrando resumen, lineas, totales confirmados y snapshots del backend.
- [X] T010 [US1] Integrar rutas ADMIN para lista, alta y detalle en `src/app/App.jsx`, y agregar navegacion interna entre ordenes y comprobantes en `src/features/purchases/PurchasesList.jsx` sin crear una entrada global duplicada.
- [ ] T011 [US1] Ejecutar las pruebas de `tests/integration/purchase-orders-list-create.test.jsx` y las pruebas unitarias de dominio/API relacionadas; corregir fallos de la historia US1.

---

## Phase 4: User Story 2 - Editar, emitir y cancelar (Priority: P1)

**Goal**: ADMIN edita borradores, emite ordenes y cancela el saldo con motivo, preservando trazabilidad y recepciones anteriores.

**Independent Test**: Editar y emitir un borrador, comprobar que no cambia stock y deja de ser editable; cancelar otra orden y comprobar motivo, actor e historial.

- [ ] T012 [P] [US2] Escribir pruebas de integracion para editar DRAFT, emitir, cancelar, exigir motivo y manejar conflicto de estado en `tests/integration/purchase-order-transitions.test.jsx`.
- [X] T013 [US2] Extender `src/features/purchases/usePurchaseOrders.js` con editar, emitir y cancelar; despues de cada respuesta confirmada volver a cargar el detalle.
- [X] T014 [P] [US2] Extender `src/features/purchases/PurchaseOrderCreate.jsx` para cargar y guardar ediciones solo en estado DRAFT, conservando `supplier_id`, `estimated_arrival`, `notes`, `spare_part_id` nullable, `quantity` entera positiva y `unit_cost` decimal monetario.
- [X] T015 [P] [US2] Agregar a `src/features/purchases/PurchaseOrderDetail.jsx` acciones de emitir/cancelar segun estado, confirmacion de accion y motivo obligatorio de 1 a 500 caracteres; mostrar auditoria y cantidades recibidas/canceladas sin revertir stock.
- [X] T016 [US2] Agregar la ruta ADMIN de edicion de borrador en `src/app/App.jsx` y enlazarla desde el detalle solo cuando el estado permita editar.
- [ ] T017 [US2] Ejecutar `tests/integration/purchase-order-transitions.test.jsx` y corregir permisos, errores 409/422 y conservacion del formulario de US2.

---

## Phase 5: User Story 3 - Registrar recepciones fisicas (Priority: P1)

**Goal**: ADMIN registra recepciones parciales/completas de ordenes elegibles y ve los movimientos aplicados por el backend sin duplicarlos.

**Independent Test**: Recibir parcialmente una orden y comprobar cantidades pendientes y delta de inventario; reintentar con la misma clave, completar el saldo y probar exceso de cantidad.

- [ ] T018 [P] [US3] Escribir pruebas de integracion para revision de cantidades, recepcion parcial/completa, concepto libre sin movimiento, exceso y reintento idempotente en `tests/integration/purchase-order-receipts.test.jsx`.
- [X] T019 [US3] Extender `src/features/purchases/usePurchaseOrders.js` con lectura de recepciones y envio idempotente; conservar la misma clave UUID ante respuesta incierta y reconocer `Idempotent-Replayed: true`.
- [X] T020 [P] [US3] Crear `src/features/purchases/PurchaseOrderReceiptForm.jsx` con `purchase_order_item_id` y cantidades `quantity_received` positivas enteras, resumen previo, notas y confirmacion; mantener los valores ante errores recuperables.
- [X] T021 [US3] Extender `src/features/purchases/PurchaseOrderDetail.jsx` para mostrar cantidades ordenadas, recibidas, pendientes y movimiento devuelto; un movimiento `null` se muestra como recepcion de concepto libre sin cambio de inventario.
- [ ] T022 [US3] Ejecutar `tests/integration/purchase-order-receipts.test.jsx` y corregir casos de replay, conflicto concurrente y recuperacion de US3.

---

## Phase 6: User Story 4 - Consultar y vincular comprobantes (Priority: P2)

**Goal**: ADMIN asocia orden y lineas de orden al crear un comprobante, y consulta el vinculo sin confundir factura, pago y recepcion.

**Independent Test**: Crear comprobante desde una orden con linea conciliada y otra sin mapear; revisar vinculo en ambos detalles y verificar que no se genera una segunda recepcion.

- [ ] T023 [P] [US4] Escribir pruebas de integracion para alta de comprobante con `purchase_order_id`, mapeo opcional de `purchase_order_item_id`, proveedor incompatible y linea "Sin conciliar" en `tests/integration/purchase-order-invoice-link.test.jsx`, y pruebas unitarias de serializacion en `tests/unit/purchases-api.test.js`.
- [X] T024 [US4] Actualizar `src/features/purchases/PurchaseCreate.jsx` para aceptar una orden desde el detalle o seleccionarla al crear el comprobante; fijar/verificar el proveedor y mantener disponible el flujo sin orden.
- [X] T025 [US4] Actualizar el mapeo de lineas en `src/features/purchases/PurchaseCreate.jsx` para permitir una linea explicita de la orden o dejarla sin conciliar; enviar `purchase_order_item_id` sin inferir por descripcion, SKU o cantidad.
- [X] T026 [US4] Actualizar `src/features/purchases/PurchaseOrderDetail.jsx` y `src/features/purchases/PurchaseDetail.jsx` para mostrar comprobantes vinculados y estado de pago separado, dirigir la recepcion a la orden y no ofrecer asociacion retroactiva.
- [ ] T027 [US4] Ejecutar las pruebas de serializacion del comprobante vinculado en `tests/unit/purchases-api.test.js`, incluyendo comprobante sin orden y linea sin `purchase_order_item_id`; corregir fallos de US4.
- [ ] T028 [US4] Ejecutar `tests/integration/purchase-order-invoice-link.test.jsx` y corregir vinculacion, conciliacion y continuidad del alta de comprobantes existente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificar consistencia, accesibilidad, adaptacion y documentacion del frontend.

- [ ] T029 [P] Extender `src/shared/styles/workshop.css` para lista, formulario, detalle, dialogos y estados de orden; verificar teclado, foco y anchos 360, 390, 768 y 1024 px.
- [X] T030 Actualizar `features.md`, `docs.md` y `memory.md` con las pantallas, rutas, contrato consumido y limitaciones del flujo de ordenes.
- [ ] T031 Ejecutar la suite `npm test` y `npm run build` desde la raiz del repositorio `TechFixAI-frontend/`; corregir regresiones de ordenes y Compras existentes.

---

## Dependencies

### User Story Dependencies

- **US1**: Requiere Phase 2; es el MVP y entrega lista, borrador y detalle de consulta.
- **US2**: Requiere US1 porque extiende el detalle y el formulario base con transiciones.
- **US3**: Requiere US2 para emitir ordenes que luego se reciben; usa el detalle y el hook ya existentes.
- **US4**: Requiere US1 para elegir una orden y mostrar su detalle. Se programa despues de US3 para integrar comprobantes sin conflictos con los cambios al mismo detalle.
- **Polish**: Depende de las cuatro historias deseadas.

**Dependency graph**: Phase 1 -> Phase 2 -> US1 -> US2 -> US3 -> US4 -> Polish.

### Within Each User Story

- Las pruebas de historia se escriben antes de su interfaz y deben fallar por ausencia del comportamiento.
- Cliente y modelos comunes de Phase 2 preceden a las pantallas.
- Vistas separadas pueden trabajarse en paralelo una vez que sus contratos/hook esten definidos.
- Las transiciones y recepciones solo se reflejan despues de respuesta confirmada del backend.

## Parallel Opportunities

- Phase 2: T001 y T003 editan archivos de prueba distintos; tras ambas, T002 y T004 pueden implementarse en paralelo.
- US1: despues de T006, T007, T008 y T009 pueden desarrollarse en paralelo en archivos distintos; T010 espera las vistas.
- US2: despues de T013, T014 y T015 pueden desarrollarse en paralelo; T016 integra la navegacion de edicion.
- US3: T018 puede prepararse antes de las vistas; T020 puede desarrollarse en paralelo con la ampliacion del detalle T021 despues del contrato de T019.
- US4: T023 precede a cambios de formulario; la actualizacion de documento y detalle se integra antes de cerrar la historia.

### Parallel Example: User Story 1

```text
Despues de T006:
- T007 PurchaseOrdersList.jsx
- T008 PurchaseOrderCreate.jsx
- T009 PurchaseOrderDetail.jsx
Luego T010 integra rutas y navegacion.
```

### Parallel Examples: User Stories 2-4

```text
US2, despues de T013: T014 (formulario de edicion) y T015 (acciones de detalle).
US3, despues de T019: T020 (formulario de recepcion) y T021 (detalle de recepciones).
US4, despues de T023: T024/T025 se ejecutan en orden sobre PurchaseCreate.jsx; T026 puede avanzar en paralelo sobre los detalles.
```

## Implementation Strategy

### MVP First: User Story 1

1. Completar Phase 2.
2. Completar US1 y validar lista, filtros, alta, detalle y ausencia de cambios de stock.
3. Revisar el incremento antes de avanzar a transiciones.

### Incremental Delivery

1. US1 aporta consulta y creacion de ordenes.
2. US2 agrega edicion, emision y cancelacion trazable.
3. US3 agrega recepcion fisica con idempotencia.
4. US4 agrega conciliacion de comprobantes.
5. Polish verifica accesibilidad, responsive, regresiones y documentacion.

## Notes

- `[P]` identifica tareas que pueden ejecutarse a la vez en archivos distintos y sin dependencias pendientes.
- `[US1]` a `[US4]` corresponden a las historias de `spec.md`.
- Las cantidades de orden/recepcion son enteras positivas; los importes se manejan como valores monetarios decimales.
- Las migraciones backend no se ejecutan desde el repositorio frontend.
