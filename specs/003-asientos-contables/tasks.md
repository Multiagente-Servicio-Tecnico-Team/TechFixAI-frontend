---
description: "Tareas frontend para registro, consulta y reversión de asientos contables"
---

# Tasks: Gestión de asientos contables — Frontend

**Input**: Documentos de diseño en `specs/003-asientos-contables/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/accounting-ui.md`, `quickstart.md`

**Tests**: Se incluyen porque la especificación requiere escenarios independientes y el proyecto exige Vitest/Testing Library antes de integrar cambios al taller.

**Organización**: Tareas agrupadas por historia de usuario; primero se cubren rol, precisión de dinero y cliente del contrato compartidos.

## Phase 1: Setup

**Purpose**: Preparar la configuración del servicio contable sin añadir dependencias ni un modo de datos financieros ficticios.

- [X] T001 Documentar `VITE_API_URL` y su fallback same-origin `/backend` en `.env.example` y `README.md`; vacío significa servicio contable no configurado, nunca datos contables simulados.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Distinguir el rol real, autorizar la UI y ofrecer tipos exactos y un cliente común antes de las vistas.

### Tests primero

- [X] T002 [P] Añadir cobertura de inicio y persistencia de rol ADMIN/TECHNICIAN/CUSTOMER en `tests/integration/accounting-access.test.jsx`; comprobar que solo ADMIN ve el acceso y una ruta directa no entrega datos a otros roles.
- [X] T003 [P] Crear pruebas de importes y líneas en `tests/unit/accounting-domain.test.js`: acepta importes de hasta 12 dígitos enteros y 2 decimales; exige 2–100 líneas; código 1–40, nombre 1–200, descripción opcional hasta 1000, concepto hasta 200 y detalle hasta 4000; cada línea tiene exactamente un lado positivo y el debe/haber total debe coincidir.
- [X] T004 [P] Crear pruebas del cliente en `tests/unit/accounting-api.test.js` para categorías, lista/filtros/paginación, detalle, alta con `Idempotency-Key`, reversión, `credentials: "include"` y errores 401/403/404/409/422/503/red.

### Implementation

- [X] T005 Conservar el rol de cuenta real entregado por inicio de sesión junto al área actual `client|staff` en `src/features/auth/LoginForm.jsx` y `src/state/session.js`; no guardar más datos que rol, nombre y correo.
- [X] T006 Proteger las rutas contables y mostrar Contabilidad solo a ADMIN en `src/app/App.jsx`, `src/features/auth/RequireRole.jsx` y `src/app/layouts/StaffLayout.jsx`; en escritorio añadir pestaña y en móvil enlace del menú de usuario sin superar tres destinos en la barra Banco.
- [X] T007 Crear las reglas puras en `src/domain/accounting.js`: parsear cadenas monetarias con exactamente dos decimales, hasta 12 dígitos enteros, sin ceros iniciales salvo el valor cero; convertir/sumar exacto; validar 2–100 líneas, código 1–40, nombre 1–200, descripción opcional hasta 1000, concepto hasta 200 y detalle hasta 4000; cada línea debe tener debe o haber positivo, nunca ambos, y debe = haber > 0.
- [X] T008 Crear `src/features/accounting/accountingApi.js` con categorías, lista filtrable por `from_date`, `to_date`, `category_id`, `status`, `entry_number`, `limit` (1–100, default 50), `offset`, detalle por id, alta y reversión; usar cadenas monetarias de dos decimales, cookie incluida, URL contable configurada y errores seguros.

**Checkpoint**: El frontend distingue `ADMIN`, valida importes sin pérdida de precisión y puede consumir el contrato canónico sin guardar operaciones contables localmente.

---

## Phase 3: User Story 1 — Registrar un asiento contable (Priority: P1) 🎯 MVP

**Goal**: Crear un asiento balanceado, revisar el resultado y evitar duplicados ante doble envío/reintento.

**Independent Test**: Con API simulada y sesión ADMIN, enviar un asiento con 2 o más líneas balanceadas; comprobar revisión, una sola petición con UUID, respuesta confirmada y correlativo visible. Un asiento inválido no se envía.

### Tests for User Story 1

- [X] T009 [P] [US1] Añadir en `tests/integration/accounting-create.test.jsx` formulario accesible, categoría, líneas, cálculo exacto, mínimo 2/máximo 100, errores por falta de balance, confirmación inmutable, carga, error recuperable y bloqueo de doble envío.
- [X] T010 [P] [US1] Extender `tests/unit/accounting-api.test.js` con payload de alta y replay: `Idempotency-Key` UUID se mantiene en la misma operación y la respuesta 201/200 presenta el asiento devuelto.

### Implementation for User Story 1

- [X] T011 [US1] Crear `src/features/accounting/AccountingCreate.jsx` con fecha, categoría, concepto (1–200), detalle (1–4000) y líneas (2–100); cada código debe medir 1–40, nombre 1–200 y descripción opcional hasta 1000.
- [X] T012 [US1] Crear `src/features/accounting/EntryLinesEditor.jsx` para añadir/quitar líneas, activar exactamente un importe positivo entre debe/haber, validar máximo de 12 dígitos enteros y 2 decimales, y mostrar totales exactos en PEN.
- [X] T013 [US1] Añadir confirmación previa en `src/features/accounting/AccountingCreate.jsx`: comunicar que el registro se confirma al guardarse y no admite edición/borrado; bloquear doble clic y conservar payload/UUID para reintento de resultado incierto.
- [X] T014 [US1] Registrar `/taller/contabilidad/nuevo` en `src/app/App.jsx` y, tras el alta exitosa, mostrar correlativo, fecha, total, responsable y estado confirmado en `src/features/accounting/AccountingCreate.jsx`, con salida al listado y enlace al detalle.

**Checkpoint**: El alta de asientos confirmados funciona aislada de la lista, usa importes exactos y no duplica un asiento aceptado al reintentar.

---

## Phase 4: User Story 2 — Consultar y revisar asientos (Priority: P1)

**Goal**: Encontrar un registro con filtros y consultar toda su información y trazabilidad.

**Independent Test**: Simular páginas con registros y abrir un detalle; verificar filtros, estados vacíos/error, líneas ordenadas, importes, responsable, eventos y enlaces de reversión.

### Tests for User Story 2

- [X] T015 [P] [US2] Añadir `tests/integration/accounting-list.test.jsx` para filtros fecha/categoría/estado/correlativo, página inicial de 50, máximo 100, total, navegación, orden y estados loading/empty/error/retry.
- [X] T016 [P] [US2] Añadir `tests/integration/accounting-detail.test.jsx` para encabezado, montos PEN exactos, líneas ordenadas, fechas, categoría, responsable, historial, enlaces a original/reversa, 404 y reintento de carga.

### Implementation for User Story 2

- [X] T017 [US2] Crear `src/features/accounting/AccountingList.jsx` con resumen, filtros desde/hasta, categoría, estado y correlativo, total/paginación; mostrar `entry_number` como texto y ordenar según contrato fecha/correlativo descendente.
- [X] T018 [US2] Crear `src/features/accounting/AccountingDetail.jsx` para presentar todos los campos de `AccountingEntry`, líneas en orden, totales, fechas, actor, eventos traducidos y enlaces entre originales/reversiones; no ofrecer editar ni borrar.
- [X] T019 [US2] Registrar `/taller/contabilidad` y `/taller/contabilidad/:id` bajo la protección ADMIN en `src/app/App.jsx`; asegurar que los enlaces de lista y detalle llegan al destino relacionado.
- [X] T020 [US2] Aplicar etiquetas accesibles, lista móvil como tarjetas sin scroll horizontal, estados con anuncios y tema Banco en `src/features/accounting/AccountingList.jsx`, `src/features/accounting/AccountingDetail.jsx` y `src/shared/styles/workshop.css`.

**Checkpoint**: Una persona ADMIN puede listar, filtrar y auditar un asiento desde la interfaz; los casos vacíos y errores permiten recuperarse.

---

## Phase 5: User Story 3 — Revertir un asiento confirmado (Priority: P2)

**Goal**: Registrar una corrección como asiento compensatorio sin alterar ni borrar el original.

**Independent Test**: Abrir un asiento confirmado, confirmar una reversión con fecha y razón, verificar original revertido, nuevo correlativo y vínculos; un conflicto refresca estado y no genera éxito falso.

### Tests for User Story 3

- [X] T021 [P] [US3] Añadir `tests/integration/accounting-reversal.test.jsx` para acceso a acción solo CONFIRMED sin reversa, fecha/razón requeridas (razón hasta 2000), diálogo, cancelación, respuesta 201/200, conflicto 409 y actualización del original.

### Implementation for User Story 3

- [X] T022 [US3] Añadir acción y formulario de reversión en `src/features/accounting/AccountingDetail.jsx`: solo para original confirmado no revertido, fecha y razón (1–2000 caracteres), aviso compensatorio, confirmación y cancelación sin efectos.
- [X] T023 [US3] Integrar respuesta de reversión en `src/features/accounting/AccountingDetail.jsx`: presentar registro nuevo, refrescar original, mostrar estado/vínculos e historial; ante 409 consultar el estado actual, sin ofrecer segunda reversión.

**Checkpoint**: El original permanece consultable y sin edición; la UI refleja la nueva reversión confirmada y su relación auditada.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 [P] Actualizar `features.md`, `docs.md` y `memory.md` con pantallas/rutas, rol ADMIN, modo de configuración, estado implementado y cobertura local; enlazar la fuente canónica backend.
- [X] T025 Ejecutar `npm test` y `npm run build` desde la raíz del frontend; resolver fallos introducidos por esta feature e informar cualquier fallo preexistente reproducible.
- [ ] T026 Validar `specs/003-asientos-contables/quickstart.md` en navegador de prueba a 360, 390, 768 y 1024 px, modo claro/oscuro, teclado, usuarios ADMIN/TECHNICIAN/CUSTOMER, red interrumpida, idempotencia y reversión sin usar datos de producción.

> Nota de ejecución (2026-11-02): queda pendiente el recorrido manual de T026. Computer Use detuvo la sesión al no poder establecer con suficiente confianza la URL activa del navegador. Las pruebas automatizadas usan APIs simuladas; validar los tres roles, interrupciones de red e integración real requiere levantar el backend con una base de pruebas y credenciales ADMIN/TECHNICIAN/CUSTOMER.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 establece la configuración backend de la feature sin modo contable de demostración.
- **Foundational (Phase 2)**: T002–T004 pruebas primero; T005–T008 rol, rutas, dominio monetario y cliente. Bloquea las tres historias.
- **US1 (Phase 3)**: T009–T010 pruebas primero; T011–T014 alta confirmada/idempotente.
- **US2 (Phase 4)**: T015–T016 pruebas primero; T017–T020 listado/detalle y navegación; puede empezar tras Phase 2, sin depender del alta.
- **US3 (Phase 5)**: T021 antes de T022–T023; depende del detalle de US2 y del cliente de Phase 2.
- **Polish (Phase 6)**: T024–T026 después de las historias que se quieran integrar.

### User Story Dependencies

- **US1 (P1)**: depende de Setup + Foundational; es MVP registrable y comprobable con API simulada.
- **US2 (P1)**: depende de Setup + Foundational; es comprobable sin que US1 genere los registros.
- **US3 (P2)**: depende de detalle de US2 y del método de reversión común; no depende de la pantalla de alta US1.

### Parallel Opportunities

- T002, T003 y T004 son paralelizables por archivo de prueba.
- En US1, T009 y T010 son paralelizables; T011/T012 pueden separarse por archivo y deben integrarse antes de T013.
- En US2, T015 y T016 son paralelizables; luego T017 y T018 pueden implementarse en paralelo y T019/T020 integran rutas/estilos.
- US1 y US2 pueden avanzar en paralelo después de Foundational; US3 espera el detalle de US2.
- T024 puede prepararse con las pantallas una vez que sus nombres/rutas estén estables; T025 y T026 son validaciones finales.

## Parallel Example: User Story 2

```text
T015 tests/integration/accounting-list.test.jsx
T016 tests/integration/accounting-detail.test.jsx
```

## Implementation Strategy

### MVP First

1. Completar T001–T008 para configuración, rol, dinero exacto y cliente.
2. Completar T009–T014 para alta confirmada e idempotente.
3. Validar US1 con API simulada antes de integrar navegación/listado.

### Incremental Delivery

1. Agregar US1: registrar un asiento balanceado.
2. Agregar US2: localizar y revisar registros.
3. Agregar US3: revertir con una operación compensatoria.
4. Completar accesibilidad, responsive, documentación, suite y build.
