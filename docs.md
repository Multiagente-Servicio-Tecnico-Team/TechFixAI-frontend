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
