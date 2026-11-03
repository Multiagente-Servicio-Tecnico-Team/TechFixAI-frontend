---
description: "Tareas de implementación frontend para Compras a proveedores"
---

# Tasks: Compras a proveedores en el panel del taller

**Input**: Design documents from `specs/006-compras-proveedores/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/purchases-client.md`, `quickstart.md`

**Tests**: No se incluyen tareas de pruebas automatizadas porque la especificación no las solicita explícitamente. Cada historia conserva un criterio de validación independiente y se completa la guía manual del quickstart.

**Organization**: Tareas agrupadas por las historias de usuario de `spec.md`, en orden de prioridad.

## Phase 1: Setup

**Purpose**: Preparar la configuración y el espacio de la funcionalidad sin introducir dependencias nuevas.

- [X] T001 Añadir `VITE_API_URL=` a `.env.example` sin valores secretos y documentar que en desarrollo apunta al backend local.
- [X] T002 Crear los módulos iniciales `src/domain/purchases.js` y `src/features/purchases/purchasesApi.js` según la estructura definida en `plan.md`.

---

## Phase 2: Foundational

**Purpose**: Implementar las piezas compartidas que necesitan todas las historias.

- [X] T003 [P] Definir en `src/domain/purchases.js` etiquetas en español para los estados de compra, recepción y pago, además de validaciones compartidas para importes, cantidades y transiciones admitidas por el contrato backend.
- [X] T004 Implementar en `src/features/purchases/purchasesApi.js` la resolución de `VITE_API_URL`, modo no configurado, `credentials: "include"`, serialización JSON y conversión uniforme de errores HTTP siguiendo `src/shared/api/baseUrl.js` y los clientes existentes.

**Checkpoint**: Los estados y errores tienen representación común, y el cliente nunca trata una respuesta fallida como confirmación.

---

## Phase 3: User Story 1 - Consultar compras y su detalle (Priority: P1)

**Goal**: Dar a ADMIN una vista del historial de compras y acceso a su detalle persistido.

**Independent Test**: Con sesión ADMIN y compras existentes, filtrar por proveedor, fechas, número y estados; abrir un resultado y comparar encabezado, líneas, totales, pagos, recepciones e historial con la respuesta backend. Confirmar estados vacío, error y paginación.

### Implementation for User Story 1

- [X] T005 [P] [US1] Implementar en `src/features/purchases/purchasesApi.js` las consultas paginadas de proveedores y compras, con los filtros y parámetros definidos en `contracts/purchases-client.md`.
- [X] T006 [US1] Implementar en `src/features/purchases/purchasesApi.js` la consulta de detalle de compra y mapear snapshots, líneas, recepciones, movimientos e historial sin descartar datos del backend.
- [X] T007 [US1] Crear `src/features/purchases/usePurchases.js` para cargar listado/detalle, aplicar filtros server-side y paginación, y exponer estados loading, ready, empty, error y unconfigured.
- [X] T008 [P] [US1] Crear `src/features/purchases/PurchasesList.jsx` con columnas, filtros, paginación y estados de carga, vacío y error siguiendo el lenguaje visual de Banco y Contabilidad.
- [X] T009 [P] [US1] Crear `src/features/purchases/PurchaseDetail.jsx` para presentar comprobante, snapshots, importes, pago, responsable, líneas, recepciones y auditoría en español.
- [X] T010 [US1] Registrar `/taller/compras` y `/taller/compras/:id` bajo el guard ADMIN en `src/app/App.jsx`, y añadir el acceso Compras a la navegación de ADMIN en `src/app/layouts/StaffLayout.jsx`.
- [X] T011 [US1] Manejar expiración de sesión y falta de autorización en `src/features/purchases/purchasesApi.js` y las vistas de compras, limpiando datos sensibles y conservando una ruta de retorno al acceso del taller.

**Checkpoint**: ADMIN puede consultar una compra existente y revisar sus datos reales sin usar compras de demostración.

---

## Phase 4: User Story 2 - Registrar una compra a proveedor (Priority: P1)

**Goal**: Permitir registrar un comprobante y líneas vinculadas al catálogo o conceptos libres, sin alterar stock al guardar.

**Independent Test**: Seleccionar un proveedor activo y dos artículos reales; comprobar que cada `spare_part_id` enviado coincide con el `id` numérico de inventario seleccionado, guardar y verificar los valores persistidos y que el stock no cambia. Comprobar además el registro de una línea libre y el conflicto por documento duplicado.

### Implementation for User Story 2

- [X] T012 [US2] Añadir en `src/features/purchases/purchasesApi.js` la carga de proveedores activos y el método de creación `POST /api/admin/purchases` con el cuerpo exacto de `PurchaseWrite`.
- [X] T013 [US2] Implementar en `src/domain/purchases.js` la validación del formulario y el cálculo de previsualización en centavos enteros, manteniendo los importes de backend como cadenas decimales.
- [X] T014 [US2] Implementar en el flujo de alta `src/features/purchases/PurchaseCreate.jsx` la carga del catálogo mediante `inventoryApi.list()` solo cuando `inventoryApi.mode === "api"`; si no está configurado, no mostrar repuestos demo como opciones de compra.
- [X] T015 [US2] Completar `src/features/purchases/PurchaseCreate.jsx` con selección de proveedor, datos del comprobante, fechas, pago, cargos y líneas de catálogo o libres, mostrando descripción, cantidad, costo, descuento, impuesto y total previo.
- [X] T016 [US2] Enviar desde `src/features/purchases/PurchaseCreate.jsx` el `id` del artículo seleccionado sin transformación como `spare_part_id`, conservar `code` únicamente como SKU visible y permitir `spare_part_id: null` solo en líneas libres.
- [X] T017 [US2] Conectar el guardado del formulario con `POST /api/admin/purchases` en `src/features/purchases/PurchaseCreate.jsx`; preservar borrador ante validación, conflicto o error recuperable y mostrar confirmación solo con respuesta exitosa del backend.
- [X] T018 [US2] Añadir la ruta `/taller/compras/nuevo` en `src/app/App.jsx` y la navegación desde listado a alta en `src/features/purchases/PurchasesList.jsx`.

**Checkpoint**: ADMIN puede registrar compras persistidas con artículos reales o conceptos libres; crear una compra no modifica el inventario.

---

## Phase 5: User Story 3 - Confirmar recepción física (Priority: P2)

**Goal**: Registrar recepciones parciales o completas y reflejar el stock solo después de la confirmación backend.

**Independent Test**: Confirmar una recepción parcial, revisar el estado y stock actualizados, repetir la misma solicitud tras simular una respuesta perdida y comprobar que no se duplica el movimiento; recibir el saldo restante y revisar el estado final.

### Implementation for User Story 3

- [X] T019 [P] [US3] Añadir a `src/features/purchases/purchasesApi.js` la consulta y creación de recepciones, enviando `Idempotency-Key` UUID y reutilizando la misma clave y payload al reintentar una solicitud no resuelta.
- [X] T020 [US3] Ampliar `src/features/purchases/PurchaseDetail.jsx` con cantidades recibidas/pendientes, formulario de recepción parcial y revisión explícita antes del envío.
- [X] T021 [US3] Actualizar el detalle y la lista desde `src/features/purchases/usePurchases.js` solo después de una respuesta satisfactoria; nunca ajustar stock por optimismo y mostrar movimientos únicamente para líneas ligadas al inventario.
- [X] T022 [US3] Deshabilitar recepción para compras recibidas o canceladas y mostrar el resultado de replay idempotente en `src/features/purchases/PurchaseDetail.jsx`.

**Checkpoint**: Las recepciones parciales son recuperables e idempotentes, y la interfaz refleja exclusivamente el stock confirmado por backend.

---

## Phase 6: User Story 4 - Mantener proveedores y estados de compra (Priority: P2)

**Goal**: Administrar proveedores, avance de pago y cancelaciones permitidas sin borrar historial.

**Independent Test**: Crear, buscar, editar y desactivar un proveedor; verificar que deja de ofrecerse en compras nuevas y sigue en historial. Marcar una compra pendiente como pagada y cancelar una compra aún no recibida; confirmar que una compra con recepción no se cancela.

### Implementation for User Story 4

- [X] T023 [US4] Añadir en `src/features/purchases/purchasesApi.js` las operaciones de alta/actualización de proveedor, actualización permitida de compra y cancelación según `contracts/purchases-client.md`.
- [X] T024 [P] [US4] Crear `src/features/purchases/SupplierManager.jsx` para listar, buscar, crear, editar y desactivar proveedores con sus estados de carga, validación, conflicto y error.
- [X] T025 [US4] Registrar `/taller/compras/proveedores` en `src/app/App.jsx` bajo el guard ADMIN y enlazar la pantalla `src/features/purchases/SupplierManager.jsx` desde Compras.
- [X] T026 [US4] Integrar `SupplierManager` con selector de proveedor activo en `src/features/purchases/PurchaseCreate.jsx`, conservando nombres históricos de proveedores inactivos en compras existentes.
- [X] T027 [US4] Añadir al detalle acciones para marcar pago `PENDING → PAID` y cancelar únicamente compras sin recepciones en `src/features/purchases/PurchaseDetail.jsx`, mostrando los conflictos del backend sin cambiar el estado local por adelantado.
- [X] T028 [US4] Mostrar etiquetas independientes en español para estado de pago y recepción en `src/domain/purchases.js`, `src/features/purchases/PurchasesList.jsx` y `src/features/purchases/PurchaseDetail.jsx`.

**Checkpoint**: ADMIN mantiene proveedores y ejecuta solo las transiciones permitidas por el servicio, preservando compras históricas.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Asegurar que la sección se integra con el panel existente y documentar su operación.

- [X] T029 [P] Aplicar en `src/shared/styles/workshop.css` los estilos de compras reutilizando tokens, superficies, controles, badges y estados del panel, sin crear un lenguaje visual paralelo.
- [X] T030 Revisar navegación por teclado, foco, etiquetas y ausencia de desbordamiento horizontal en 360, 390, 768 y 1024 px en `src/features/purchases/` y `src/shared/styles/workshop.css` mediante revisión de controles etiquetados, foco nativo y rejillas responsivas sin anchos fijos.
- [X] T031 [P] Actualizar `features.md`, `docs.md` y `memory.md` para documentar rutas, rol, clientes, configuración y limitaciones de Compras.
- [ ] T032 Seguir `specs/006-compras-proveedores/quickstart.md` para validar manualmente acceso, consultas, alta, recepción, reintentos, estados y configuración real de inventario.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depende de Setup; prepara dominio y cliente compartidos.
- **US1 (Phase 3)**: Depende de Foundational; habilita listado y detalle persistidos.
- **US2 (Phase 4)**: Depende de Foundational; se apoya en la navegación/listado de US1 para acceder al alta y sus resultados.
- **US3 (Phase 5)**: Depende de US1 y US2, porque recibe compras y líneas persistidas.
- **US4 (Phase 6)**: Depende de US1 para las acciones sobre compras; la gestión de proveedores puede desarrollarse en paralelo con US3 después de Foundation.
- **Polish (Phase 7)**: Depende de las historias que se decida entregar.

### User Story Dependencies

- **US1 (P1)**: Puede comenzar después de Foundational; es el MVP de consulta e historial.
- **US2 (P1)**: Puede comenzar después de Foundational; requiere la lista de inventario real para vincular artículos y depende del listado US1 para el flujo integrado.
- **US3 (P2)**: Requiere compras y líneas creadas por US2 y el detalle de US1.
- **US4 (P2)**: La gestión de proveedores es independiente; las acciones de pago y cancelación reutilizan el detalle de US1.

### Parallel Opportunities

- T003 puede hacerse en paralelo con la configuración inicial del cliente T004 cuando existan los archivos base de Setup.
- Dentro de US1, T008 y T009 pueden desarrollarse en paralelo una vez acordadas las proyecciones del cliente.
- Dentro de US2, el dominio T013 puede trabajarse en paralelo con el cargador de catálogo T014; el formulario completo requiere ambas.
- T024 (gestor de proveedores) puede desarrollarse en paralelo con US3 después de Foundation; integrar la selección en el formulario requiere T012.
- T028 y T030 pueden realizarse en paralelo cuando las vistas estén implementadas.

## Parallel Example: User Story 1

```text
T008 — Crear src/features/purchases/PurchasesList.jsx
T009 — Crear src/features/purchases/PurchaseDetail.jsx
```

Ambas vistas pueden desarrollarse en paralelo una vez que el cliente y las proyecciones de US1 estén definidos.

## Implementation Strategy

### MVP First

1. Completar Setup y Foundational.
2. Implementar US1 para consultar listado y detalle persistidos.
3. Validar manualmente US1 con el quickstart antes de continuar.

### Incremental Delivery

1. Agregar US2 para registrar comprobantes y líneas con el ID real de inventario.
2. Agregar US3 para recibir mercancía con idempotencia.
3. Agregar US4 para proveedores, pagos y cancelaciones permitidas.
4. Cerrar con Polish y validación manual responsive.

## Notes

- Las líneas de catálogo siempre usan el `id` numérico devuelto por `inventoryApi`; nunca derivar `spare_part_id` desde el SKU.
- Si `VITE_API_URL` no está configurada en desarrollo, no ofrecer el catálogo demo como origen de una compra persistida.
- No introducir datos de compras en `src/state/store.jsx` ni confirmar operaciones sin respuesta del backend.
- No se agregan tareas de pruebas automatizadas porque no fueron solicitadas en la especificación.
