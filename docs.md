# Índice de documentación

Dónde está explicado cada tema. Antes de documentar algo nuevo, revisa si ya existe y amplía ese archivo.

## En este repositorio

| Documento | Contenido |
| --- | --- |
| `README.md` | Tecnologías, estructura de carpetas, estilos, rutas, conexión con el backend, ejecución, pruebas y despliegue |
| `AGENTS.md` | Reglas para trabajar en el repositorio (personas y agentes de código) |
| `features.md` | Pantallas, estado, responsables, pendientes y código que no hay que duplicar |
| `memory.md` | Historial de decisiones y limitaciones del frontend |
| `design/` | Sistema de diseño «Banco»: decisiones y mapa por pantalla (`DESIGN.md`), tokens y vista previa |
| `public/_redirects` | Proxy `/backend/*` y rutas de la SPA para Netlify |
| `tests/unit/`, `tests/integration/` | Pruebas Vitest: dominio, contrato de API y capas (unit); pantallas de acceso, registro, recuperación, chat, consulta, inventario, tablero y tema (integration) |
| `specs/003-asientos-contables/spec.md` | Requisitos de UI para asientos contables; la spec y OpenAPI del backend siguen siendo la fuente canónica |
| `specs/003-asientos-contables/plan.md` y `tasks.md` | Diseño y tareas de implementación frontend; el OpenAPI backend define rutas y payloads |
| `src/features/accounting/` | Cliente API y pantallas de listado, alta, detalle y reversión para ADMIN |
| `src/domain/accounting.js` | Importes contables exactos y validación balanceada de las líneas |
| `specs/006-compras-proveedores/` | Especificación, plan, modelo, contrato de cliente, quickstart y tareas para compras a proveedores |
| `src/features/purchases/`, `src/domain/purchases.js` y `src/domain/suppliers.js` | Cliente API, pantallas ADMIN de compras/proveedores, recepciones, reglas de importes/estados y validación de proveedores |
| [OpenAPI de compras backend](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml) | Contrato de proveedores, compras, recepciones, estados e idempotencia |
| `specs/004-admin-ticket-ui/` | Contrato de interfaz, plan, modelo, tareas y quickstart para tickets administrativos |
| `specs/005-inventory-api-integration/` | Plan, modelo, contrato de consumo, tareas y quickstart del inventario conectado |
| [OpenAPI canónico de inventario](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/005-api-inventario/contracts/inventory.openapi.yaml) | Contrato de lectura, categorías, altas, edición y eliminación |
| `src/features/workshop/inventoryApi.js` y `useInventory.js` | Cliente API y estado compartido de artículos/categorías |
| `src/domain/inventory.js` | Validación y reglas del inventario de taller |
| `tests/unit/inventory.test.js`, `tests/integration/inventory.test.jsx` | Pruebas unitarias del contrato y escenarios de interfaz del inventario |

| `src/features/workshop/ticketsApi.js` y `useAdminTickets.js` | Cliente API ADMIN, normalización de DTO, filtros y carga paginada del taller |
| `specs/007-customer-commerce-ui/` | Requisitos, plan, contratos frontend, escenarios y tareas de clientes comerciales, portal, tickets, cotizaciones, pagos y ventas |
| `src/features/customers/` y `src/features/commerce/` | Clientes API y pantallas de consulta del portal y gestión ADMIN de comercio |

## En el backend ([TechFixAI-backend](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend))

| Documento | Contenido |
| --- | --- |
| `app/accounts/README.md` | Endpoints de cuentas (`/auth/registro`, `/login`, `/logout`, `/me`, `/recuperar`, `/restablecer`) y reglas de sesión |
| `app/chat/README.md` | Contrato de `POST /api/chat`: campos, presupuesto, ticket y errores |
| [OpenAPI canónico del backend](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/002-transcripcion-audio/contracts/audio-chat.openapi.yaml) | Contrato de `POST /api/chat/audio` |
| [OpenAPI contable canónico](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/003-asientos-contables/contracts/accounting.openapi.yaml) | Contrato de categorías, asientos, detalle, autorización ADMIN y reversión |
| `specs/002-transcripcion-audio/plan.md` y `tasks.md` | Plan y tareas locales de interfaz; requisitos en backend |
| `features.md` | Estado de los patrones de agentes y pendientes del backend |
| `docs.md` | Índice de la documentación del backend |

## Producción

- Frontend: https://techfixai.vercel.app (Vercel). También existe la publicación anterior en Netlify.
- API: Render; el frontend la llama por `/backend/*` en el mismo dominio para que la cookie de sesión funcione.
