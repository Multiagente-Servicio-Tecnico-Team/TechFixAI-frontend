# Tasks: Movimientos de stock del inventario

**Input**: Design documents from `specs/008-inventory-stock-movements/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: El plan contempla ampliar las pruebas unitarias Vitest y las pruebas de integración Testing Library existentes. Se incluyen como tareas; no se ejecutan durante la generación de esta lista.

**Organization**: Las tareas se agrupan por historia de usuario para permitir implementación y validación incremental.

## Phase 1: Setup

**Purpose**: Reutilizar la estructura, dependencias y componentes existentes del frontend.

No se requieren cambios de inicialización ni dependencias: React, Vite, Vitest y Testing Library ya están configurados.

---

## Phase 2: Foundational — cliente de movimientos

**Purpose**: Proveer las operaciones y reglas compartidas que necesitan las historias de apertura, ajuste e historial.

**⚠️ CRITICAL**: Completar esta fase antes de implementar las historias de usuario.

- [X] T001 Añadir a `src/features/workshop/inventoryApi.js` las operaciones `recordOpening`, `adjustStock` y `listMovements` según `specs/008-inventory-stock-movements/contracts/inventory-movements-consumer.md`, enviando `credentials: "include"`, `Idempotency-Key` UUID para escrituras y filtros/paginación de historial.
- [X] T002 Mapear en `src/features/workshop/inventoryApi.js` los errores 401, 403, 404, conflictos 409, validaciones 422, respuestas inválidas y fallos de red/503 a mensajes recuperables en español; conservar datos de formulario y no traducir todo 409 como SKU duplicado.
- [X] T003 Integrar en `src/features/workshop/useInventory.js` las acciones de apertura y ajuste para actualizar `parts` en el store únicamente con `part` devuelto por backend; ante no-op conservar el saldo y ante error no modificarlo.

**Checkpoint**: El adaptador puede enviar las tres operaciones y el hook solo aplica saldos confirmados.

---

## Phase 3: User Story 1 — Registrar existencias iniciales (Priority: P1) 🎯 MVP

**Goal**: Crear artículos en cero y, si se informa una cantidad inicial positiva, confirmar una apertura con motivo sin duplicar el artículo ante fallos parciales.

**Independent Test**: Crear un artículo en cero y otro con cantidad inicial positiva; comprobar que el saldo solo cambia tras confirmar la apertura y que una falla de apertura permite reintentar sin volver a crear el SKU.

### Tests for User Story 1

- [X] T004 [P] [US1] Ampliar `tests/unit/inventory.test.js` para verificar que `toApi` omite `current_stock` en altas/ediciones y que la apertura envía `counted_stock`, `reason` y una clave idempotente estable al reintentar la misma intención.
- [X] T005 [P] [US1] Ampliar `tests/integration/inventory.test.jsx` para cubrir alta con saldo cero, apertura positiva y fallo de apertura recuperable sin duplicar SKU.

### Implementation for User Story 1

- [X] T006 [US1] Modificar `src/features/workshop/inventoryApi.js` para que `toApi` omita `current_stock` en las operaciones de catálogo y que las respuestas de alta empiecen con el saldo autoritativo cero.
- [X] T007 [US1] Modificar `src/features/workshop/PartForm.jsx` para separar datos de catálogo del conteo inicial, exigir motivo cuando el conteo sea positivo y registrar la apertura después de crear el artículo en cero.
- [X] T008 [US1] Implementar en `src/features/workshop/PartForm.jsx` el estado parcial de apertura fallida: conservar el artículo creado y su ID, mostrar saldo cero como confirmado y permitir reintentar con la misma clave y payload sin repetir el alta.
- [X] T009 [US1] Ajustar en `src/features/workshop/PartForm.jsx` los textos y la tarjeta de resumen para que un conteo pendiente o fallido nunca se muestre como stock guardado.

**Checkpoint**: La apertura inicial se puede validar sin las historias de ajuste, historial o retiro.

---

## Phase 4: User Story 2 — Ajustar al conteo físico (Priority: P1)

**Goal**: Registrar el conteo físico y su motivo, conservar el saldo confirmado mientras la operación esté pendiente o falle y manejar no-op y reservas.

**Independent Test**: Aplicar un conteo distinto y uno igual al saldo, y simular un conflicto por reservas; verificar saldo confirmado, mensaje de no variación y conservación del saldo anterior ante conflicto.

### Tests for User Story 2

- [X] T010 [P] [US2] Ampliar `tests/unit/inventory.test.js` para verificar el payload de ajuste, idempotencia en reintentos, respuesta sin cambio y mapeo de conflicto `reserved_stock`.
- [X] T011 [P] [US2] Ampliar `tests/integration/inventory.test.jsx` para cubrir ajuste hacia arriba, hacia abajo, conteo igual, validación del motivo y error por unidades reservadas sin cambio optimista del saldo.

### Implementation for User Story 2

- [X] T012 [US2] Crear `src/features/workshop/StockAdjustmentDialog.jsx` con conteo físico entero entre 0 y 999999, motivo obligatorio de 1 a 500 caracteres tras recortar espacios, estados de envío y errores de campo sin borrar la entrada.
- [X] T013 [US2] Añadir en `src/features/workshop/Inventory.jsx` la acción de ajustar stock por repuesto y conectar el diálogo con `useInventory.adjustStock`.
- [X] T014 [US2] Presentar en `src/features/workshop/Inventory.jsx` el resultado confirmado o sin variación; ante 409 por reservas conservar el saldo anterior y explicar que debe resolverse la reserva.
- [X] T015 [US2] Mantener en `src/features/workshop/StockAdjustmentDialog.jsx` la misma clave y payload mientras se reintenta una solicitud fallida, y generar una clave nueva al iniciar otra operación.

**Checkpoint**: Los ajustes y sus errores funcionan independientemente de la consulta del historial.

---

## Phase 5: User Story 3 — Consultar el historial de existencias (Priority: P2)

**Goal**: Consultar movimientos por ID numérico del repuesto, con paginación backend, filtros y presentación fiel de la historia disponible.

**Independent Test**: Abrir el historial de un artículo con movimientos, cambiar de página y filtrar por tipo/fechas; comprobar orden reciente, datos de saldos y etiqueta legado cuando corresponda.

### Tests for User Story 3

- [X] T016 [P] [US3] Ampliar `tests/unit/inventory.test.js` para verificar `listMovements` con ID numérico, filtros, `limit`/`offset`, validación de `{ items, total, limit, offset }` y manejo de respuesta inválida.
- [X] T017 [P] [US3] Ampliar `tests/integration/inventory.test.jsx` para cubrir carga, vacío, error, paginación, filtros y etiquetas de historia anterior al corte.

### Implementation for User Story 3

- [X] T018 [US3] Crear `src/features/workshop/InventoryMovements.jsx` para mostrar movimientos recientes primero con tipo traducido, delta, saldos anterior/posterior, fecha, motivo, actor y origen solo cuando estén disponibles; marcar `is_before_cutover` como historia anterior al corte.
- [X] T019 [US3] Implementar en `src/features/workshop/InventoryMovements.jsx` filtros por tipo y rango de fechas, validación de inicio no posterior al fin, paginación backend (límite predeterminado 50 y máximo 200), y estados de carga, vacío y error recuperable.
- [X] T020 [US3] Añadir en `src/features/workshop/Inventory.jsx` el enlace al historial usando `part.id` numérico y el SKU solo como etiqueta visible.
- [X] T021 [US3] Añadir en `src/app/App.jsx` la ruta `/taller/inventario/:partId/movimientos` bajo la protección existente de personal, y cargar historial de artículos inactivos por ID mediante las instantáneas devueltas por el backend.

**Checkpoint**: El historial se puede consultar y paginar sin descargar todos los movimientos ni depender del SKU como clave.

---

## Phase 6: User Story 4 — Retirar un repuesto sin confundirlo con borrar su historial (Priority: P2)

**Goal**: Retirar un repuesto del catálogo activo con confirmación clara y dejar accesible su historial cuando exista.

**Independent Test**: Retirar un artículo con movimientos, comprobar que deja el listado activo, que el mensaje habla de retiro y que el enlace resultante abre el historial conservado.

### Tests for User Story 4

- [X] T022 [P] [US4] Ampliar `tests/unit/inventory.test.js` para verificar el mensaje de retiro, el manejo de conflicto distinto a SKU duplicado y la respuesta de eliminación 204.
- [X] T023 [P] [US4] Ampliar `tests/integration/inventory.test.jsx` para cubrir confirmación, desaparición del listado activo, rechazo por conflicto y acceso al historial desde el resultado del retiro.

### Implementation for User Story 4

- [X] T024 [US4] Cambiar en `src/features/workshop/Inventory.jsx` el texto de la acción y confirmación de eliminación a retiro del catálogo activo, quitando el artículo del listado solo después de respuesta 204.
- [X] T025 [US4] Actualizar en `src/features/workshop/PartForm.jsx` la acción de baja y sus mensajes para no afirmar que se borró el historial ni asegurar retención física cuando el backend no lo garantiza.
- [X] T026 [US4] Tras un retiro exitoso en `src/features/workshop/Inventory.jsx`, ofrecer un enlace al historial por `part.id` para mantener una referencia accesible a los movimientos conservados.
- [X] T027 [US4] Manejar en `src/features/workshop/inventoryApi.js` el conflicto de retiro con un mensaje específico de operación no disponible por reservas u otras referencias, sin presentarlo como SKU duplicado.

**Checkpoint**: Retirar del catálogo no confunde la baja con la eliminación de evidencia histórica.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Completar accesibilidad, responsividad, consistencia visual y la guía de uso de la feature.

- [X] T028 [P] Extender `src/shared/styles/workshop.css` para apertura, diálogo de ajuste e historial solo donde los estilos existentes no cubran los estados; mantener el diseño del área Taller y anchos 360, 390, 768 y 1024 px.
- [X] T029 [P] Asegurar en `src/features/workshop/StockAdjustmentDialog.jsx` y `src/features/workshop/InventoryMovements.jsx` navegación por teclado, foco visible y anuncios accesibles de carga, éxito, vacío y error.
- [X] T030 Actualizar `specs/008-inventory-stock-movements/quickstart.md` con los pasos de UI implementados y la recuperación de apertura incompleta, ajuste, historial y retiro.
- [ ] T031 Validar manualmente `specs/008-inventory-stock-movements/quickstart.md` con una sesión ADMIN o TECHNICIAN y el backend configurado, sin tratar el modo demo como persistencia.
- [ ] T032 Ejecutar `npm test` y `npm run build` desde `TechFixAI-frontend/` (scripts de `TechFixAI-frontend/package.json`) y corregir fallos de esta feature antes de marcarla terminada.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No changes required; the existing project structure and dependencies are reused.
- **Foundational (Phase 2)**: Blocks all stories because it adds the shared API operations, error mapping and confirmed store updates.
- **US1 → US2 (P1)**: Both depend on Phase 2 and have independent behavior, but implement them sequentially because they extend the same existing unit/integration test files and US2 also changes `Inventory.jsx`.
- **US3 → US4 (P2)**: Both depend on Phase 2; implement US3 first because US4's history link uses its route, and the stories share existing test files and `Inventory.jsx`.
- **Polish (Phase 7)**: Depends on all stories selected for delivery.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; first story in the recommended sequence.
- **US2 (P1)**: Starts after US1 to avoid concurrent edits to shared test files and `Inventory.jsx`; no business dependency on US1.
- **US3 (P2)**: Starts after US2 in the recommended sequence to avoid concurrent edits to shared test files and `Inventory.jsx`.
- **US4 (P2)**: Starts after US3; T026 depends on the history route from US3 (T021), and shared files also favor sequential delivery.

### Within Each User Story

- Write the listed unit/integration tests before the corresponding UI implementation; verify that they expose the missing behavior before implementing it.
- Implement adapter/state prerequisites before components that call them.
- Complete and independently validate a story before proceeding to its checkpoint.

### Parallel Opportunities

- **Foundational**: T001 and T002 edit the same adapter and should be completed sequentially; T003 depends on the API methods and error mapping from T001-T002.
- **US1**: T004 and T005 can be prepared in parallel; component implementation T007-T009 depends on T006 and the Phase 2 API.
- **US2**: T010 and T011 can be prepared in parallel; T012 and T013 touch separate files after Phase 2.
- **US3**: T016 and T017 can be prepared in parallel; T018 and T019 are the same component and should be done sequentially; T020 can proceed independently of them.
- **US4**: T022 and T023 can be prepared in parallel; T024/T025 touch separate UI files; T026 depends on the route from US3.
- **Polish**: T028 and T029 touch separate files and can proceed in parallel; manual validation and final automated checks follow the implementation.

## Parallel Example: User Story 3

```text
Task: T016 — API unit coverage in tests/unit/inventory.test.js
Task: T017 — UI integration coverage in tests/integration/inventory.test.jsx
Task: T020 — Add the numeric-ID history link in src/features/workshop/Inventory.jsx
```

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 2 so opening requests and confirmed balance updates are available.
2. Complete US1: catalog creation at zero, positive opening with a reason, and recoverable partial failure.
3. Validate US1 independently using its test and quickstart scenarios before adding other workflows.

### Incremental Delivery

1. Deliver US1 and US2 as the P1 stock-write workflows.
2. Add US3 for paginated audit history.
3. Add US4 and connect successful retirement to the history route.
4. Complete accessibility, responsive layout, manual quickstart and final automated validation.

## Notes

- `[P]` marks tasks that can proceed concurrently without editing the same file or depending on unfinished work.
- `[US#]` ties each story task to the corresponding scenario in `spec.md`.
- Do not change backend contracts, SQL, the API base URL, roles, or demo-mode configuration in this frontend feature.
- The movement API uses numeric `part.id`; catalog CRUD continues to use SKU.
