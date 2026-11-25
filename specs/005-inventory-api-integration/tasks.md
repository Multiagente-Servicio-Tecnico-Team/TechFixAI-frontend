---
description: "Tareas de implementación del consumo frontend de inventario"
---

# Tasks: Integración del inventario con el backend

**Input**: Documentos de diseño en specs/005-inventory-api-integration/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/inventory-consumer.md, quickstart.md

**Tests**: Se incluyen tareas de pruebas porque plan.md y quickstart.md requieren ampliar y validar las pruebas existentes de inventario.

**Organization**: Tareas agrupadas por historia de usuario, en orden de prioridad. Se reutilizan rutas y cliente actuales; no se modifica el backend.

## Format: [ID] [P?] [Story] Description

- [P]: tarea ejecutable en paralelo sin depender de archivos que otra tarea modifica.
- [Story]: historia de usuario asociada; no se usa en Setup, Foundational ni Polish.
- Todas las tareas apuntan a rutas reales del repositorio.

## Phase 1: Setup

**Purpose**: Dejar clara la configuración local del servicio sin modificar archivos de entorno privados.

- [X] T001 Actualizar la descripción de VITE_API_URL en .env.example: URL base local del backend; vacío conserva demo solo en desarrollo y producción usa /backend.

---

## Phase 2: Foundational

**Purpose**: Prerrequisitos compartidos para las historias.

La autenticación por cookie, las rutas del taller, el cliente CRUD y las herramientas de prueba ya existen. No se requiere infraestructura fundacional adicional. Completar T001 antes de habilitar la integración por entorno.

---

## Phase 3: User Story 1 - Consultar el inventario vigente (Priority: P1) 🎯 MVP

**Goal**: ADMIN y TECHNICIAN consultan inventario real, usan categorías del backend y distinguen correctamente carga, vacío y error.

**Independent Test**: Con sesión de personal y API configurada, cargar repuestos, filtrar por una categoría existente no incluida entre las cinco categorías demo y verificar que un error inicial no muestra datos demo.

### Tests for User Story 1

- [X] T002 [P] [US1] Añadir pruebas unitarias para GET de categorías, payloads inválidos de categorías/repuestos, cookie y errores de carga en tests/unit/inventory.test.js.
- [X] T003 [P] [US1] Añadir pruebas de integración para categorías dinámicas, filtro por valor devuelto por backend, estados inicial/error y reintento en tests/integration/inventory.test.jsx.

### Implementation for User Story 1

- [X] T004 [P] [US1] Cambiar la validación de categoría en src/domain/inventory.js para aceptar cualquier texto no vacío de hasta 50 caracteres y conservar exactamente el valor enviado.
- [X] T005 [P] [US1] Generalizar el cliente de src/features/workshop/inventoryApi.js para consultar /api/inventory/categories y validar que parts y categories tengan la forma esperada; las respuestas inválidas deben generar error, no listas vacías.
- [X] T006 [US1] Resolver el modo de inventario en src/features/workshop/inventoryApi.js: usar URL configurada; en desarrollo sin URL mantener demo; en producción usar el fallback /backend aun si la variable está vacía y no activar demo ante errores.
- [X] T007 [US1] Extender src/features/workshop/useInventory.js para exponer categorías API y sus estados, derivar opciones de los repuestos si la consulta auxiliar de categorías falla, y ocultar el store demo en API mode hasta cargar datos confirmados.
- [X] T008 [US1] Reemplazar en src/features/workshop/Inventory.jsx los filtros fijos por categorías dinámicas del hook, conservando los filtros y el estilo actual.

**Checkpoint**: El listado y los filtros funcionan con el catálogo activo; carga vacía, error y demo son estados distintos.

---

## Phase 4: User Story 2 - Registrar y actualizar repuestos (Priority: P2)

**Goal**: El personal guarda categorías existentes o nuevas y solo ve cambios confirmados por el servicio.

**Independent Test**: Crear un artículo con categoría existente y otro con una categoría nueva; editar campos, recargar y verificar valores exactos y precio con dos decimales.

### Tests for User Story 2

- [X] T009 [P] [US2] Añadir pruebas unitarias de validación de categoría (texto libre, vacío y longitud máxima) y respuesta de escritura malformada en tests/unit/inventory.test.js.
- [X] T010 [P] [US2] Añadir pruebas de integración de alta/edición con categoría nueva, preservación de categoría en formulario y errores que conservan lo escrito en tests/integration/inventory.test.jsx.

### Implementation for User Story 2

- [X] T011 [P] [US2] Cambiar el campo de categoría de src/features/workshop/PartForm.jsx para sugerir valores del backend y permitir escribir uno nuevo, conservando la categoría existente al editar.
- [X] T012 [P] [US2] Endurecer create y update en src/features/workshop/inventoryApi.js para exigir la propiedad part en respuestas exitosas y no presentar el objeto local como persistido cuando el payload no cumple el contrato.
- [X] T013 [US2] Actualizar en src/features/workshop/useInventory.js las categorías visibles después de una alta/edición confirmada; conservar artículos, formulario y categorías previos si falla la escritura.

**Checkpoint**: Altas y ediciones muestran los valores devueltos por backend y un valor nuevo de categoría aparece tras guardar.

---

## Phase 5: User Story 3 - Eliminar repuestos con referencias protegidas (Priority: P3)

**Goal**: El personal elimina artículos no referenciados y comprende los conflictos de presupuesto sin perder el repuesto.

**Independent Test**: Confirmar eliminación API exitosa y comprobar que un 409 o 404 no retira el artículo localmente.

### Tests for User Story 3

- [X] T014 [US3] Completar las pruebas de tests/integration/inventory.test.jsx para eliminación API 204, conflicto 409 y artículo inexistente 404; verificar que solo el éxito quita el artículo y que el error mantiene el diálogo y el repuesto.

**Checkpoint**: La eliminación real conserva referencias comerciales y refleja únicamente operaciones confirmadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Alinear documentación y validar el incremento completo.

- [X] T015 [P] Actualizar features.md y docs.md para indicar que inventario consume el backend, describir el modo demo de desarrollo y enlazar el contrato backend 005.
- [X] T016 Ejecutar los escenarios de specs/005-inventory-api-integration/quickstart.md, npm test y npm run build desde la raíz del frontend; registrar cualquier limitación de configuración o acceso al backend.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) no depende de otras tareas.
- Foundational (Phase 2) no agrega trabajo; las historias esperan la configuración documentada.
- US1 requiere T001 y debe completarse antes de US2 porque provee categorías y estado API al formulario.
- US2 requiere US1 para usar categorías dinámicas y el flujo de carga confirmado.
- US3 puede verificarse tras US1; se secuencia después de US2 para evitar solapamiento en el mismo archivo de pruebas.
- Polish requiere las historias completadas.

### User Story Dependencies

- US1 (P1): después de Setup; MVP independiente.
- US2 (P2): depende de US1.
- US3 (P3): usa el cliente y hook existentes y se valida después de la integración de US1; no depende funcionalmente de altas/ediciones de US2.

### Parallel Opportunities

- T002 y T003 pueden prepararse en paralelo porque modifican archivos de prueba distintos.
- T004 y T005 pueden implementarse en paralelo tras las pruebas, porque modifican dominio y cliente respectivamente.
- T009 y T010 pueden prepararse en paralelo.
- T011 y T012 pueden implementarse en paralelo tras US1; T013 depende de que ambos flujos de guardado y categorías estén disponibles.
- T015 puede ejecutarse en paralelo con las verificaciones finales no relacionadas con los archivos de documentación.

## Parallel Examples

### User Story 1

~~~text
T002: Pruebas unitarias de categorías y contrato en tests/unit/inventory.test.js
T003: Pruebas de pantalla y estados API en tests/integration/inventory.test.jsx
~~~

### User Story 2

~~~text
T009: Pruebas unitarias de validación y respuesta de escritura en tests/unit/inventory.test.js
T010: Pruebas de formulario y persistencia confirmada en tests/integration/inventory.test.jsx
~~~

## Implementation Strategy

### MVP First (User Story 1)

1. Completar T001.
2. Completar pruebas e implementación de US1.
3. Validar lectura, categorías, filtro y no exposición de datos demo.
4. US1 entrega la consulta fiable del inventario incluso antes de implementar las mejoras del formulario.

### Incremental Delivery

1. US1: lectura API, categorías dinámicas y estados confiables.
2. US2: alta/edición con valores canónicos y respuesta confirmada.
3. US3: regresión de eliminación y conflictos de presupuestos.
4. Polish: documentación, quickstart, suite Vitest y build.

## Notes

- [P] indica tareas de archivos distintos y sin dependencia pendiente.
- No se incluyen migraciones ni cambios de backend: su contrato ya está implementado y es la fuente de verdad.
- No modificar .env; usar .env.example para documentar configuración.
- En modo API, una respuesta malformada no se transforma en catálogo vacío ni en escritura exitosa.
- Validación 2026-11-03: las pruebas de inventario pasaron; suite global 199/202 con tres fallos fuera de los archivos de esta feature; npm run build pasó. El backend local no respondió en localhost:8000, por lo que no se pudo completar aceptación manual con sesión real.
