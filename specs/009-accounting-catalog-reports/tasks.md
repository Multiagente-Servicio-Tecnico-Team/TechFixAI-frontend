---
description: "Tareas para consumir el catálogo, periodos y reportes contables desde el frontend"
---

# Tasks: Catálogo contable y reportes del taller

**Input**: Diseño de `specs/009-accounting-catalog-reports/`.

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/accounting-catalog-ui.md](contracts/accounting-catalog-ui.md).

**Tests**: No se generan tareas de pruebas automatizadas porque la especificación no solicita explícitamente TDD. Los criterios independientes de aceptación y los pasos manuales están en `spec.md` y `quickstart.md`.

**Organization**: Las tareas siguen las tres historias de usuario P1; cada una se puede validar de forma independiente después de completar los fundamentos compartidos.

## Phase 1: Setup

**Purpose**: Confirmar la estructura del proyecto.

El proyecto React/Vite, las rutas protegidas ADMIN, los estilos compartidos y el cliente de contabilidad ya existen. No se requiere inicialización ni cambio de dependencias.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extender la infraestructura compartida que necesitan las tres historias.

- [X] T001 Extender el cliente `src/features/accounting/accountingApi.js` con serialización segura de parámetros, mapeo de errores 401/403/404/409/413/422/503 y soporte separado para respuestas JSON y archivos CSV/XLSX; no descargar cuerpos JSON de error.
- [X] T002 Añadir al mismo cliente `src/features/accounting/accountingApi.js` los métodos para planes, cuentas, periodos, eventos, auditoría y reportes exactamente según `../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/009-catalogo-cuentas-consultas-contables/contracts/accounting-catalog.openapi.yaml`; todas las solicitudes deben usar `credentials: include` y el base URL existente.
- [X] T003 Añadir rutas de planes/cuentas, periodos e informes bajo la protección ADMIN existente en `src/app/App.jsx` y enlaces de navegación del taller en `src/app/layouts/StaffLayout.jsx`.

**Checkpoint**: rutas nuevas protegidas y API compartida lista; los módulos de cada historia pueden implementarse sin duplicar autenticación o transporte.

---

## Phase 3: User Story 1 - Administrar planes y cuentas y usarlos en asientos (Priority: P1) 🎯 MVP

**Goal**: Administrar planes y cuentas desde el catálogo y registrar asientos nuevos con cuentas válidas, preservando líneas históricas.

**Independent Test**: Con sesión ADMIN y el PCGE disponible, buscar cuentas por código y nombre, crear un plan alternativo, establecerlo explícitamente como predeterminado, crear un asiento balanceado eligiendo cuentas activas/imputables/vigentes del plan, y abrir un asiento histórico con líneas sin vínculo para comprobar que conserva sus snapshots.

### Implementation for User Story 1

- [X] T004 [US1] Añadir funciones puras de búsqueda, vigencia y validación del plan/cuenta al borrador en `src/domain/accounting.js`; validar `status === ACTIVE`, `is_postable === true`, `effective_from <= operation_date` cuando exista y `effective_to >= operation_date` cuando exista.
- [X] T005 [P] [US1] Crear la vista de planes contables en `src/features/accounting/plans/AccountingPlans.jsx` con listado, identificación del predeterminado, formulario de creación alternativa y acción explícita de predeterminar; reflejar cambios solo después de respuesta exitosa.
- [X] T006 [P] [US1] Crear la vista de cuentas por plan en `src/features/accounting/plans/AccountingAccounts.jsx` con búsqueda por código/nombre, filtros por padre/estado/imputabilidad, paginación remota, formularios de alta/edición/desactivación sin borrado físico e historial auditable consultado mediante `GET /api/admin/accounting/audit-events` con filtros y paginación.
- [X] T007 [US1] Integrar el selector de plan y de cuentas de catálogo en `src/features/accounting/AccountingCreate.jsx` y `src/features/accounting/EntryLinesEditor.jsx`; enviar `plan_id` y `account_id`, buscar en servidor con páginas de hasta 100 y limpiar solo las cuentas seleccionadas al cambiar de plan.
- [X] T024 [US1] Al seleccionar una cuenta, completar `description` con `parent_name` o con la denominación de la cuenta raíz; conservar la edición manual en `src/features/accounting/EntryLinesEditor.jsx` y documentar el comportamiento en la guía manual.
- [X] T008 [US1] Actualizar la presentación de líneas en `src/features/accounting/AccountingDetail.jsx` para mostrar código/nombre snapshot y marcar `account_id === null` o `legacy_unlinked === true` como histórico no vinculado, sin asociación textual automática.
- [X] T009 [US1] Añadir navegación entre Contabilidad, Planes y Cuentas en `src/features/accounting/AccountingList.jsx`, manteniendo accesibles el listado, alta, detalle y reversión de asientos actuales.

**Checkpoint**: el flujo de planes, cuentas y nuevos asientos funciona en el entorno ADMIN; asientos históricos siguen legibles.

---

## Phase 4: User Story 2 - Consultar y controlar periodos mensuales (Priority: P1)

**Goal**: Consultar el estado e historial mensual, cerrar periodos y reabrirlos con motivo y confirmación.

**Independent Test**: Consultar meses por rango/estado, cerrar uno con confirmación, inspeccionar actor/fecha en su historial, reabrirlo con motivo obligatorio y comprobar el manejo de un conflicto si el periodo cambia mientras hay un asiento en edición.

### Implementation for User Story 2

- [X] T010 [US2] Crear `src/features/accounting/periods/AccountingPeriods.jsx` con filtros de `from_period`, `to_period`, `status`, paginación, estados vacío/carga/error y tabla mensual con estado y última transición.
- [X] T011 [US2] Implementar diálogos accesibles de cierre y reapertura dentro de `src/features/accounting/periods/AccountingPeriods.jsx`; pedir confirmación explícita, requerir `reason` no vacío para reabrir y actualizar la vista solo tras respuesta exitosa.
- [X] T012 [P] [US2] Añadir vista paginada de eventos mensuales en `src/features/accounting/periods/AccountingPeriodEvents.jsx` con acción, actor, fecha, motivo y navegación de retorno al periodo.
- [X] T013 [US2] Actualizar el manejo de errores/conflictos en `src/features/accounting/AccountingCreate.jsx` para indicar que el asiento no se registró cuando el backend rechaza un periodo cerrado y ofrecer actualizar el estado consultado.

**Checkpoint**: ADMIN puede consultar, cerrar, auditar y reabrir un mes; no se muestra como guardada una operación rechazada por periodo.

---

## Phase 5: User Story 3 - Consultar y exportar reportes contables (Priority: P1)

**Goal**: Consultar diario, mayor y balance de comprobación con filtros, paginación JSON y exportación completa CSV/XLSX.

**Independent Test**: Consultar los tres informes en un rango que tenga asientos, cambiar páginas sin perder filtros, exportar CSV y XLSX con los mismos filtros, comparar el rango/conjunto/totales y probar que el error 413 no inicia una descarga.

### Implementation for User Story 3

- [X] T014 [US3] Crear componentes compartidos de filtros, totales y paginación de reportes en `src/features/accounting/reports/ReportControls.jsx`, reutilizando `Field`, `Pagination` y tokens existentes; al aplicar nuevos filtros restablecer `offset` a cero.
- [X] T015 [P] [US3] Crear la vista de diario en `src/features/accounting/reports/AccountingJournal.jsx` con fechas inclusivas, filtros opcionales de plan/estado, filas y totales entregados por backend, paginación JSON y acciones CSV/XLSX.
- [X] T016 [P] [US3] Crear la vista de mayor en `src/features/accounting/reports/AccountingLedger.jsx` con selección de cuenta de catálogo o filtro exacto por `account_code` y `account_name` histórico, saldo inicial, movimientos, saldo acumulado y totales devueltos por backend.
- [X] T017 [P] [US3] Crear la vista de balance de comprobación en `src/features/accounting/reports/AccountingTrialBalance.jsx` con rango, plan y estado, mostrando saldos y totales de respuesta sin recalcularlos en el cliente.
- [X] T018 [US3] Implementar la descarga desde `src/features/accounting/accountingApi.js` y sus llamadas de UI para solicitar el reporte completo con los filtros activos, nombre de archivo coherente y liberación del `ObjectURL`; si hay respuesta JSON de error, no iniciar descarga.
- [X] T019 [US3] Añadir enlaces entre las tres vistas y la navegación de Contabilidad en `src/features/accounting/AccountingList.jsx`, manteniendo filtros al cambiar páginas y al volver a la consulta.

**Checkpoint**: los tres reportes consultan JSON paginado y descargan CSV/XLSX completos del backend; errores y límite 413 aparecen como mensajes recuperables.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Asegurar consistencia y preparación de validación integrada.

- [X] T020 Revisar los estados de carga, vacío, error, sesión vencida y sin autorización en todas las vistas `src/features/accounting/`; limpiar datos contables de pantalla y navegar al acceso de personal al recibir 401.
- [ ] T021 Revisar accesibilidad por teclado, foco visible, tema claro/oscuro y ausencia de desbordamiento horizontal a 360, 390, 768 y 1024 px en `src/features/accounting/` y `src/shared/styles/workshop.css`.
- [X] T022 Actualizar `features.md`, `docs.md` y `memory.md` con navegación, uso del catálogo, periodos, informes, contrato backend y limitaciones operativas del feature.
- [ ] T023 Ejecutar los escenarios de `specs/009-accounting-catalog-reports/quickstart.md` contra el backend de pruebas y registrar los resultados; no usar datos demo para reemplazar respuestas contables.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No requiere trabajo; el stack y la estructura existen.
- **Foundational (Phase 2)**: Completar T001–T003 antes de iniciar historias.
- **User Stories (Phase 3+)**: Todas dependen de fundamentos; se pueden trabajar en secuencia MVP o en paralelo por vistas una vez el cliente API y rutas estén disponibles.
- **Polish (Phase 6)**: Requiere las historias que se incluyan en el incremento.

### User Story Dependencies

- **US1 (P1)**: Después de Phase 2; MVP recomendado porque enlaza el catálogo con la captura de asientos.
- **US2 (P1)**: Después de Phase 2; independiente de US1 salvo la presentación de conflictos en el formulario de asiento (T013 requiere que T007 haya integrado el formulario).
- **US3 (P1)**: Después de Phase 2; sus vistas pueden implementarse independientemente; exportación depende del manejo binario iniciado en T001.

### Within Each User Story

- Mantener las llamadas HTTP en `accountingApi.js`.
- Terminar validadores de dominio antes de conectarlos a formularios.
- Completar una pantalla y sus estados de carga/error/vacío antes de integrarla en navegación.
- No ejecutar exportaciones con parámetros distintos de los filtros visibles.

### Parallel Opportunities

- Tras T001–T003, las pantallas de cuentas y planes de US1 pueden desarrollarse en paralelo, coordinando que no editen el mismo archivo.
- En US2, T012 puede avanzar junto a T010–T011 si se mantiene en archivo separado; T013 depende de los cambios del formulario de US1.
- En US3, T015, T016 y T017 son paralelizables después de T014 y la disponibilidad de rutas/API; T018 cambia el cliente compartido y debe integrarse antes de validar las descargas.

## Parallel Example: User Story 3

```text
Después de T014:
T015: implementar diario en src/features/accounting/reports/AccountingJournal.jsx
T016: implementar mayor en src/features/accounting/reports/AccountingLedger.jsx
T017: implementar balance en src/features/accounting/reports/AccountingTrialBalance.jsx
```

## Implementation Strategy

### MVP First

1. Completar T001–T003.
2. Completar US1 (T004–T009) y validar su criterio independiente.
3. Entregar el flujo de cuentas seleccionables y asientos vinculados al catálogo.

### Incremental Delivery

1. Incorporar US2 para periodos y auditoría.
2. Incorporar US3 para reportes y exportación.
3. Completar accesibilidad, diseño adaptable, documentación y escenarios end-to-end.

## Notes

- Cada tarea usa `- [ ] T###`; tareas de historia llevan `[US1]`, `[US2]` o `[US3]`.
- `[P]` se reserva para trabajo que puede avanzar en paralelo sin editar los mismos archivos ni depender de tareas incompletas.
- La validación automatizada de implementación debe seguir las instrucciones del repositorio; esta lista no ejecuta tests ahora.
