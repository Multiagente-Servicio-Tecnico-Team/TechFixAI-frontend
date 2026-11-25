---
description: "Tareas frontend para conectar el panel administrativo de tickets"
---

# Tasks: Conexión del panel administrativo de tickets

**Input**: Documentos de diseño en `specs/004-admin-ticket-ui/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/tickets-ui.md`, `quickstart.md`

**Testing**: Se incluyen pruebas Vitest/Testing Library porque el plan y las reglas del frontend requieren validar clientes API, roles y pantallas antes de abrir PR.

**Organization**: Tareas agrupadas por las cuatro historias de usuario; las pruebas preceden a la implementación de cada historia.

## Format

- Cada tarea usa checkbox, ID secuencial, `[P]` solo si puede correr en paralelo y etiqueta de historia en las fases US.
- `[US1]` tablero; `[US2]` alta manual; `[US3]` detalle/estado; `[US4]` cotización existente en solo lectura.

## Phase 1: Setup

**Purpose**: Documentar la configuración del servicio de tickets sin cambiar aún pantallas.

- [X] T001 Documentar `VITE_API_URL` como URL raíz del backend (vacía conserva demo en desarrollo y producción usa `/backend` same-origin) en `.env.example` y `README.md`.

---

## Phase 2: Foundational

**Purpose**: Establecer códigos, dinero, cliente HTTP y autorización que necesitan todas las historias.

### Tests primero

- [X] T002 [P] Crear pruebas de tipos, estados, origen, etiquetas y adelanto de hasta 8 dígitos enteros/2 decimales en `tests/unit/domain.test.js` (suite de dominio existente).
- [X] T003 [P] Crear pruebas del cliente de tickets para rutas, filtros/paginación, body manual, PATCH de estado, `credentials: include`, mapeo de errores 401/403/404/409/422/503/red y base no configurada en `tests/unit/admin-tickets-api.test.js`.
- [X] T004 [P] Añadir pruebas de acceso que demuestren demo preservada sin URL, ADMIN autorizado con API, TECHNICIAN denegado y enlaces administrativos ocultos en `tests/integration/admin-ticket-access.test.jsx`.

### Implementation

- [X] T005 Definir en `src/domain/tickets.js` los cinco códigos/etiquetas de tipo, diez estados canónicos, orígenes MANUAL/ONLINE/null, etiquetas de adelanto y estados de cotización según `data-model.md`; ampliar en `src/domain/money.js` el parseo seguro a 8 dígitos enteros para `NUMERIC(10,2)`.
- [X] T006 Implementar `src/features/workshop/ticketsApi.js` con base `VITE_API_URL`, `credentials: "include"`, funciones de listar páginas, detalle, alta manual y PATCH de estado, normalizador de DTO online/manual y errores seguros; sin fallback demo después de un error de API.
- [X] T007 Implementar `src/features/workshop/TicketAdminRoute.jsx` y `src/features/workshop/TicketAccessDenied.jsx`; en modo API exigir `accountRole=ADMIN`, sin API preservar demo, y dirigir denegaciones a una ruta estática que no redirija recursivamente. Actualizar `src/app/App.jsx` y `src/app/layouts/StaffLayout.jsx` para proteger/ocultar Banco y Nuevo Ticket a TECHNICIAN en modo API.

**Checkpoint**: El cliente API y la autorización pueden validarse sin conectar las pantallas ni una base PostgreSQL.

---

## Phase 3: User Story 1 - Consultar el tablero real del taller (Priority: P1)

**Goal**: Reemplazar datos de demostración por tickets administrativos y conservar la presentación Banco, filtros y exportación.

**Independent Test**: Con API simulada y sesión ADMIN, consultar una lista que exceda una página, filtrar por texto/tipo/estado/origen y exportar; la UI presenta los registros del backend sin duplicados y el CSV incluye todas las páginas filtradas.

### Tests for User Story 1

- [X] T008 [P] [US1] Añadir `tests/integration/admin-ticket-workshop.test.jsx` con tickets API en páginas múltiples, filtros combinados, estados vacíos/error/reintento, no usar demo tras error, cambios de estado PATCH y exportación de todas las páginas.

### Implementation for User Story 1

- [X] T009 [US1] Crear `src/features/workshop/useAdminTickets.js` para solicitar filtros combinables, recorrer `limit` máximo 200 hasta `total`, deduplicar por `id`, descartar respuestas obsoletas y refrescar el resultado tras PATCH exitoso.
- [X] T010 [US1] Conectar `src/features/workshop/Workshop.jsx` al hook en modo API y conservar store demo solo cuando `ticketsApi.mode` sea demo; traducir estados/tipos/origen, enviar estado con PATCH y exportar CSV de todas las páginas activas.

**Checkpoint**: El Banco consulta y actualiza el conjunto persistido, y filtros/exportación no dependen de `staffTickets` local en modo API.

---

## Phase 4: User Story 2 - Registrar un ticket manual (Priority: P1)

**Goal**: Enviar el formulario actual a la ruta administrativa y navegar usando el ID devuelto por backend.

**Independent Test**: Con API simulada, enviar un ticket válido sin cuenta, verificar contacto/tipo/equipo/detalle/adelanto y método canónicos, y comprobar que no se genera ID local ni navegación exitosa antes de 201.

### Tests for User Story 2

- [X] T011 [P] [US2] Añadir pruebas de `NewTicket` en `tests/integration/admin-ticket-create.test.jsx` para cinco tipos, validación de nombre 3–200/teléfono 9–20/correo opcional/título 2–200/detalle 5–10000, adelanto positivo con método, error recuperable, doble envío y navegación por ID/code del servidor.

### Implementation for User Story 2

- [X] T012 [US2] Conectar `src/features/workshop/NewTicket.jsx` a `ticketsApi.createManualTicket` conservando el diseño; enviar `contact_name`, `contact_phone`, `contact_email`, `title`, `failure_description`, `request_type` y adelanto como cadena decimal; traducir `Yape/Plin`, `Efectivo` y `Tarjeta` a `YAPE_PLIN`, `CASH` y `CARD`, omitiendo método si no hay importe.
- [X] T013 [US2] En `src/features/workshop/NewTicket.jsx`, bloquear doble envío, conservar el formulario en error y navegar a `/taller/tickets/{id}` únicamente tras 201 usando el ID del backend; el detalle obtiene y presenta el `code` devuelto por backend.

**Checkpoint**: La creación manual persiste antes de actualizar la interfaz y conserva campos ante errores.

---

## Phase 5: User Story 3 - Revisar y actualizar un ticket (Priority: P1)

**Goal**: Consultar detalle por ID numérico, cambiar estado mediante PATCH y presentar contacto, pago y auditoría.

**Independent Test**: Abrir tickets manual y online simulados, verificar fallbacks `customer_*`, modificar estado, guardar, recargar desde el API y comprobar el evento de auditoría devuelto.

### Tests for User Story 3

- [X] T014 [P] [US3] Crear pruebas de `TicketDetail` en `tests/integration/admin-ticket-detail.test.jsx` para carga por ID numérico, contacto online, estados traducidos, PATCH parcial, ticket faltante, reintento y cotización.

### Implementation for User Story 3

- [X] T015 [US3] Conectar `src/features/workshop/TicketDetail.jsx` a GET por `id` numérico; mostrar el `code` visible, fallbacks de contacto online, equipo, detalle, fechas, tipo, origen, método/importe del adelanto y auditoría sin inventar campos ausentes.
- [X] T016 [US3] Implementar en `src/features/workshop/TicketDetail.jsx` la actualización de estado con PATCH usando el código canónico, respuesta confirmada, estados de carga/error, reintento y cancelación por `CANCELLED`; no añadir DELETE ni edición de campos sin control existente.

**Checkpoint**: Detalle y estado provienen del backend y siguen disponibles al volver a consultar.

---

## Phase 6: User Story 4 - Consultar una cotización existente (Priority: P2)

**Goal**: Mostrar la última cotización disponible en modo solo lectura, separada del adelanto.

**Independent Test**: Con detalle simulado que contiene cotización y con detalle sin cotización, verificar total/estado o estado vacío; adelanto permanece visible como importe distinto.

### Tests for User Story 4

- [X] T017 [P] [US4] Añadir casos de cotización existente/sin cotización, formatos decimales, estado y separación del adelanto en `tests/integration/admin-ticket-detail.test.jsx`.

### Implementation for User Story 4

- [X] T018 [US4] Presentar en `src/features/workshop/TicketDetail.jsx` solo el resumen de la última cotización entregada (`quote_type`, costos, `total_amount`, `status`, observaciones y fecha), con etiquetas en español y sin recalcular importes ni llamar a `POST /quotes`.

**Checkpoint**: La pantalla distingue adelanto, cotización pendiente y ausencia de cotización sin asumir líneas no incluidas en el contrato.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Completar consistencia visual, documentación y regresión del frontend.

- [ ] T019 [P] Ajustar `src/shared/styles/workshop.css` para cinco tipos/diez estados y todos los estados de acceso/carga sin alterar el sistema Banco; CSS responsive ajustado, pendiente revisión visual manual en 360, 390, 768 y 1024 px y tema claro/oscuro.
- [X] T020 [P] Actualizar `features.md`, `docs.md` y la sección de integración de `README.md` con rutas ADMIN conectadas, configuración y cotización de solo lectura.
- [X] T021 Revisar que `src/features/tickets/Tickets.jsx` y `src/features/chat/chatApi.js` sigan usando `/api/customer/tickets` sin cambios de autorización ni DTO.
- [X] T022 Ejecutar `npm test` y `npm run build`; registrar resultados en `memory.md`, incluyendo que E2E/backend real queda pendiente hasta aplicar la migración a una base PostgreSQL desechable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: T001 prepara la configuración antes de cualquier vista.
- **Foundational**: T002–T004 establecen primero pruebas independientes; T005–T007 implementan dominio, cliente API y guard. Todas las historias dependen de este checkpoint.
- **US1, US2 y US3 (P1)**: independientes después de Foundational en sus componentes respectivos; integrar en orden para validar primero el Banco, luego el alta y finalmente el detalle.
- **US4 (P2)**: complementa detalle existente y depende de US3; no crea cotización.
- **Polish**: depende de todas las historias; pruebas/build al final.

### User Story Dependencies

- **US1**: requiere Foundational; no depende del formulario ni del detalle.
- **US2**: requiere Foundational; puede desarrollarse en paralelo con US1 porque usa `NewTicket.jsx`.
- **US3**: requiere Foundational; usa `TicketDetail.jsx` y `ticketsApi`.
- **US4**: depende de US3 porque comparte el detalle y sus DTOs.

### Parallel Opportunities

- T002, T003 y T004 son pruebas en archivos diferentes y pueden crearse en paralelo.
- Tras Foundational, las pruebas/implementaciones de Workshop (US1) y NewTicket (US2) pueden trabajarse en paralelo si se evita modificar simultáneamente `domain/tickets.js` y `ticketsApi.js`.
- T019 estilos y T020 documentación afectan rutas diferentes y pueden ejecutarse en paralelo.

## Parallel Example: User Story 1

```text
Task: "Pruebas de tablero/filtros en tests/integration/workshop.test.jsx"
Task: "Pruebas de API/normalización en tests/unit/admin-tickets-api.test.js"
```

## Implementation Strategy

### MVP First

1. Completar Setup y Foundational.
2. Completar US1 para mostrar la cola real, buscar/filtrar y confirmar cambios de estado.
3. Validar US1 con API simulada y revisión manual antes de conectar el formulario.

### Incremental Delivery

1. US1 → Banco real y exportación completa.
2. US2 → Alta manual persistida.
3. US3 → Detalle y cambios de estado persistidos.
4. US4 → Cotización y auditoría existentes en solo lectura.
5. Polish → suite/build; E2E cuando el backend tenga migración aplicada en BD de prueba.

## Notes

- Cada tarea tiene archivo concreto y casilla; los tests preceden su implementación.
- `VITE_API_URL` vacío habilita demo solo en desarrollo; si una URL está configurada y falla, se informa error sin mock.
- No correr pruebas E2E contra `.env` ni bases compartidas; usar la preparación indicada en el backend.
