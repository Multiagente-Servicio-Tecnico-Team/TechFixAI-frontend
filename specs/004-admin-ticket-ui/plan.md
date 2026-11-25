# Implementation Plan: Conexión del panel administrativo de tickets

**Branch**: `feature/spec-kit` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-admin-ticket-ui/spec.md`

## Summary

Conectar las tres vistas administrativas ya diseñadas (Banco, alta manual y detalle) con las rutas del backend canónico. Crear un cliente `ticketsApi` configurable, normalizar DTOs y códigos en `domain/tickets.js`, proteger las vistas por rol real `ADMIN`, usar respuesta del servidor para altas/cambios y mantener el diseño Banco. La cotización se presenta en solo lectura. No se crea una interfaz de cotización ni se altera la vista del portal cliente.

## Technical Context

**Language/Version**: JavaScript ES Modules, React 18 y JSX.

**Primary Dependencies**: Vite 5, React Router 6, Vitest, Testing Library y `lucide-react` ya instalados; no se añade dependencia.

**Storage**: PostgreSQL del backend es autoridad. La UI conserva estado transitorio en React; no persiste tickets/formularios en almacenamiento del navegador.

**Testing**: Vitest + Testing Library. Cliente aislable con `fetchImpl`; pruebas de componentes con router/store/sesión falsos. `npm run build` valida compilación.

**Target Platform**: Navegadores modernos con cookie HttpOnly habilitada; entorno local Vite y despliegue same-origin mediante `/backend`.

**Project Type**: Aplicación web React ya existente; esta feature modifica únicamente el repositorio frontend y sus documentos.

**Performance Goals**: Una solicitud inicial con `limit=200` para colas de hasta 200 tickets; páginas adicionales secuenciales hasta alcanzar `total`. Debounce de búsqueda y protección contra respuestas obsoletas. No se define un objetivo numérico p95 nuevo.

**Constraints**: Contrato canónico backend, sesión ADMIN, cookie con `credentials: include`, sin fallback demo después de error HTTP/red, códigos originales en payload, importes decimales exactos, no creación de cotizaciones y migración backend pendiente de validación en base desechable.

**Scale/Scope**: Tres vistas workshop (tablero, alta manual, detalle), cinco tipos de solicitud, diez estados, tres valores de origen incluyendo null histórico; no incluye `/portal/tickets`, inventario, pagos ni cotizaciones editables.

## Constitution Check

La ruta `.specify/memory/constitution.md` del proyecto contiene principios de backend; para esta implementación frontend se aplican además `AGENTS.md`, `memory.md` y `features.md` del repositorio.

| Gate | Status | Aplicación |
|---|---|---|
| Reglas compartidas y fuente de verdad | PASS | Backend mantiene permisos, persistencia, estados y precios; el frontend traduce códigos y presenta respuestas. |
| Identidad y permisos | PASS | Cookie HttpOnly viaja con credenciales; `accountRole` solo limita navegación y `require_admin` sigue siendo la autoridad. |
| Privacidad | PASS | No guardar formularios/tickets, tokens ni credenciales en almacenamiento del navegador; mensajes de error no exponen excepciones crudas. |
| Precisión monetaria | PASS | Importes llegan como cadenas; conversión a centavos está dentro del rango seguro del límite de 8 dígitos enteros para adelanto. |
| Capas y reutilización | PASS | Dominio para códigos/mapas, cliente API bajo workshop, componentes existentes y estilos Banco; sin llamadas directas desde pantallas. |
| Calidad y accesibilidad | PASS | Cubrir cliente/roles/vistas con pruebas existentes y preservar foco, labels, estados y breakpoints. |
| Consistencia de repositorios | PASS | OpenAPI backend es fuente canónica; no se replica contrato HTTP ni se añade API de cotización. |

No hay violaciones conocidas que requieran excepciones.

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-ticket-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/tickets-ui.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── App.jsx                         # Rutas de tickets y salida de acceso restringido
│   └── layouts/StaffLayout.jsx         # Navegación Banco según ADMIN
├── domain/
│   ├── tickets.js                      # Tipos/estados/origen: códigos y etiquetas
│   └── money.js                        # Parseo seguro hasta 8 dígitos (NUMERIC(10,2))
├── features/
│   ├── workshop/
│   │   ├── TicketAdminRoute.jsx        # Guard según servicio API/demo y rol ADMIN
│   │   └── TicketAccessDenied.jsx      # Salida segura para personal sin autorización
│   └── workshop/
│       ├── ticketsApi.js               # Cliente HTTP admin y normalización DTO
│       ├── useAdminTickets.js          # Lista, filtros, páginas, retry y update
│       ├── Workshop.jsx                # Tablero y exportación de todas las páginas
│       ├── NewTicket.jsx               # POST manual, sin ID local
│       └── TicketDetail.jsx            # GET/PATCH, cotización/auditoría de solo lectura
├── shared/styles/
│   └── workshop.css                    # Ajustes de tablero y detalle conservando Banco
└── state/
    └── store.jsx                       # Solo modo demo; no persiste estado API

tests/
├── unit/
│   ├── admin-tickets-api.test.js       # Requests, DTO, errores y paginación
│   └── domain.test.js                  # Tipos/estados y rango monetario
└── integration/
    ├── admin-ticket-access.test.jsx
    ├── admin-ticket-workshop.test.jsx
    ├── admin-ticket-create.test.jsx
    └── admin-ticket-detail.test.jsx
```

**Structure Decision**: Reutilizar la arquitectura feature/domain/app actual. No crear nuevo estado global para datos de tickets API; el hook de workshop comparte carga/filtros/errores donde hace falta. El store existente sigue atendiendo únicamente la demostración sin servicio configurado.

## Phase 0: Outline & Research

Completa; ver [research.md](research.md). No quedan decisiones de producto pendientes. La decisión del usuario excluye la creación de cotizaciones; la ausencia de lectura de inventario no bloquea la conexión de tickets ni la lectura de cotizaciones existentes.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md): DTO normalizado, filtros, borrador manual, patch de estado y lectura quote/audit.
- [contracts/tickets-ui.md](contracts/tickets-ui.md): comportamiento visual, navegación, rol, estados de respuesta y adaptaciones del Banco.
- El OpenAPI del backend no se copia. Fuente: `../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/004-gestion-admin-tickets/contracts/admin-tickets.openapi.yaml`.
- [quickstart.md](quickstart.md): configuración local, validación de frontend y escenarios E2E dependientes de migración backend.

### Constitution Check (post-design)

| Gate | Status | Resultado del diseño |
|---|---|---|
| Identidad y permisos | PASS | Rutas Banco/alta/detalle ADMIN en API; demo conserva flujo actual; denegación explícita para TECHNICIAN; backend valida cada solicitud. |
| Datos y privacidad | PASS | Base de datos fuente; no persistencia de formularios/tickets en cliente; sin actor suministrado por el navegador. |
| Precisión | PASS | Serializar importes como strings canónicas y no calcular cotizaciones en UI. |
| Diseño y capas | PASS | Sistema Banco y componentes reutilizados; API solo desde feature; cliente cliente sin cambios. |
| Validación | PASS | Pruebas unitarias/API y Testing Library; build frontend; E2E solo después de migración backend en DB desechable. |

## Dependencies and Readiness

- La implementación debe seguir `specs/004-gestion-admin-tickets/contracts/admin-tickets.openapi.yaml` del backend.
- Antes de pruebas de navegador integradas, el responsable de backend aplica la migración `004_admin_ticket_management.sql` únicamente a una base de prueba desechable y permite origen/cookie del frontend.
- No se depende de `GET /api/inventory/parts` en esta feature; no se invoca `POST /quotes`.
- La configuración prevista es `VITE_API_URL` como raíz backend, `http://localhost:8000` en desarrollo y `/backend` same-origin al compilar producción.

## Risks

- La migración de tickets no se ha ejecutado ni validado contra PostgreSQL; el modo UI se puede probar con mocks, pero no declarar E2E exitoso hasta ese paso.
- Contrato OpenAPI y runtime difieren en ciertos opcionales/nombres de contacto; el normalizador debe usar campos documentados y fallback `customer_*` para online.
- La respuesta del detalle solo contiene la última cotización agregada, sin líneas; UI no debe inventar líneas.
- La API usa offset pagination; la carga de varias páginas debe deduplicar por ID y descartar respuestas de filtros anteriores.

## Complexity Tracking

No hay excepciones a la constitución ni se agregan dependencias.
