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
| `specs/010-ordenes-compra-proveedores/` | Especificacion, plan, contratos de consumo, quickstart y tareas de ordenes de compra |
| `src/features/purchases/`, `src/domain/purchases.js` y `src/domain/suppliers.js` | Cliente API, pantallas ADMIN de compras/proveedores, recepciones, reglas de importes/estados y validación de proveedores |
| [OpenAPI de compras backend](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml) | Contrato de proveedores, compras, recepciones, estados e idempotencia |
| [OpenAPI de ordenes backend](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/010-ordenes-compra-proveedores/contracts/purchase-orders.openapi.yaml) | Contrato de ordenes, transiciones y recepciones |
| `specs/004-admin-ticket-ui/` | Contrato de interfaz, plan, modelo, tareas y quickstart para tickets administrativos |
| `specs/005-inventory-api-integration/` | Plan, modelo, contrato de consumo, tareas y quickstart del inventario conectado |
| `specs/008-inventory-stock-movements/` | Spec frontend para apertura, ajuste e historial de existencias; depende del contrato backend de trazabilidad |
| `specs/009-accounting-catalog-reports/` | Especificación y contrato de interfaz para el catálogo, periodos y reportes contables ADMIN |
| `src/features/accounting/plans/`, `periods/`, `reports/` | Vistas ADMIN para planes/cuentas, cierres e historial mensual, diario/mayor/balance y exportaciones |
| [OpenAPI canónico de inventario](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/005-api-inventario/contracts/inventory.openapi.yaml) | Contrato de lectura, categorías, altas, edición y eliminación |
| `src/features/workshop/inventoryApi.js` y `useInventory.js` | Cliente API y estado compartido de artículos/categorías |
| `src/domain/inventory.js` | Validación y reglas del inventario de taller |
| `tests/unit/inventory.test.js`, `tests/integration/inventory.test.jsx` | Pruebas unitarias del contrato y escenarios de interfaz del inventario |

| `src/features/workshop/ticketsApi.js` y `useAdminTickets.js` | Cliente API ADMIN, normalización de DTO, filtros y carga paginada del taller |
| `specs/007-customer-commerce-ui/` | Requisitos, plan, contratos frontend, escenarios y tareas de clientes comerciales, portal, tickets, cotizaciones, pagos y ventas |
| `src/features/customers/` y `src/features/commerce/` | Clientes API y pantallas de consulta del portal y gestión ADMIN de comercio |
| `src/features/chat/AdminChat.jsx`, `adminChatApi.js` | Chat ADMIN de texto/voz con propuestas de escritura y confirmación; contrato canónico backend en `specs/011-chat-multirole-patrones/contracts/admin-chat.openapi.yaml` |
| `specs/007-customer-commerce-ui/` | El contrato de tickets contempla la presentación de diagnósticos persistidos en «Mis Tickets»; el contrato HTTP canónico vive en el backend Spec 007 |

## En el backend ([TechFixAI-backend](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend))

| Documento | Contenido |
| --- | --- |
| `app/accounts/README.md` | Endpoints de cuentas (`/auth/registro`, `/login`, `/logout`, `/me`, `/recuperar`, `/restablecer`) y reglas de sesión |
| `app/chat/README.md` | Contrato de `POST /api/chat`: campos, presupuesto, ticket y errores |
| [OpenAPI canónico del backend](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/002-transcripcion-audio/contracts/audio-chat.openapi.yaml) | Contrato de `POST /api/chat/audio` |
| [OpenAPI contable canónico](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/003-asientos-contables/contracts/accounting.openapi.yaml) | Contrato de categorías, asientos, detalle, autorización ADMIN y reversión |
| [OpenAPI de catálogo contable](../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/009-catalogo-cuentas-consultas-contables/contracts/accounting-catalog.openapi.yaml) | Contrato canónico de planes, cuentas, periodos, auditoría y reportes CSV/XLSX |
| `specs/002-transcripcion-audio/plan.md` y `tasks.md` | Plan y tareas locales de interfaz; requisitos en backend |
| `features.md` | Estado de los patrones de agentes y pendientes del backend |
| `docs.md` | Índice de la documentación del backend |

## Producción

- Frontend: https://techfixai.vercel.app (Vercel). También existe la publicación anterior en Netlify.
- API: Render; el frontend la llama por `/backend/*` en el mismo dominio para que la cookie de sesión funcione.
