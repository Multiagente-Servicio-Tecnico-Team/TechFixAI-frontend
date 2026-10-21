# Índice de documentación

Dónde está explicado cada tema. Antes de documentar algo nuevo, revisa si ya existe y amplía ese archivo.

## En este repositorio

| Documento | Contenido |
| --- | --- |
| `README.md` | Tecnologías, estructura de carpetas, estilos, rutas, conexión con el backend, ejecución, pruebas y despliegue |
| `AGENTS.md` | Reglas para trabajar en el repositorio (personas y agentes de código) |
| `features.md` | Pantallas, estado, responsables, pendientes y código que no hay que duplicar |
| `memory.md` | Historial de decisiones y limitaciones del frontend |
| `public/_redirects` | Proxy `/backend/*` y rutas de la SPA para Netlify |
| `tests/` | Pruebas Vitest: contrato de API, registro, acceso, recuperación, chat y consulta |

## En el backend ([TechFixAI-backend](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend))

| Documento | Contenido |
| --- | --- |
| `app/accounts/README.md` | Endpoints de cuentas (`/auth/registro`, `/login`, `/logout`, `/me`, `/recuperar`, `/restablecer`) y reglas de sesión |
| `app/chat/README.md` | Contrato de `POST /api/chat`: campos, presupuesto, ticket y errores |
| `features.md` | Estado de los patrones de agentes y pendientes del backend |
| `docs.md` | Índice de la documentación del backend |

## Producción

- Frontend: https://techfixai.vercel.app (Vercel). También existe la publicación anterior en Netlify.
- API: Render; el frontend la llama por `/backend/*` en el mismo dominio para que la cookie de sesión funcione.
