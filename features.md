# Funcionalidades del frontend

Pantallas, estado, responsables y pruebas. Actualízalo cuando agregues o cambies una pantalla.
Estado al 2026-10-20 (rama `develop`).

## Responsables

**Responsable de todo el frontend: SebasBazauri.** Revisa y aprueba los cambios de este repositorio; cualquier
integrante puede proponer cambios con un PR hacia `develop`.

| Área | Responsable | Contribuciones anteriores |
| --- | --- | --- |
| Landing, registro, acceso, recuperación y restablecimiento | SebasBazauri | — |
| Portal del cliente (asistente con selector de patrón) | SebasBazauri | jsalinas4 |
| «Mis Tickets» conectado a la API | SebasBazauri | jsalinas4 |
| Panel del taller (cola, detalle, ticket presencial, inventario) | SebasBazauri | jsalinas4 |
| Estilos generales (`src/shared/styles/`) | SebasBazauri | — |
| Clientes de API (`authApi.js`, `chatApi.js`) | SebasBazauri | jsalinas4 |

## Pantallas

| Ruta | Pantalla | Estado | Pruebas |
| --- | --- | --- | --- |
| `/` | Landing | Lista | — |
| `/portal/registro` | Registro con requisitos de contraseña en vivo | Lista | `register.test.jsx` |
| `/portal/acceso` | Inicio de sesión (vuelve a la página protegida pedida) | Lista | `login.test.jsx` |
| `/portal/recuperar`, `/portal/restablecer` | Recuperar y restablecer contraseña | Lista | `recovery.test.jsx` |
| `/portal/asistente` | Chat con los agentes: selector de patrón, presupuesto con aceptar/rechazar, ticket | Lista (depende del backend) | `chat.test.jsx`, `consultation.test.jsx` |
| `/portal/tickets` | «Mis Tickets» del cliente | Conectada; el backend falla con tickets presupuestados | `consultation.test.jsx` |
| `/taller/acceso`, `/taller/*` | Panel del taller: cola, detalle, ticket presencial e inventario | Datos de demostración en memoria | — |
| `/ayuda` | Soporte, preguntas frecuentes, estado y legales | Lista | — |
| `*` | Página 404 | Lista | — |

Clientes de API: `src/features/auth/authApi.js` (cuentas) y `src/features/chat/chatApi.js` (chat y tickets), con pruebas
de contrato en `tests/unit/auth-api.test.js`, `tests/integration/chat.test.jsx` y `tests/unit/api-base-url.test.js`. Sin `VITE_API_URL`/`VITE_CHAT_URL` funcionan en modo
demostración.

## Calidad verificada

- Responsivo: 13 pantallas sin desplazamiento horizontal en 360, 390, 768 y 1024 px; el menú se pliega y las tablas
  del taller pasan a tarjetas. Mejora pendiente: área táctil de los enlaces del pie y etiquetas de 11 px.
- Caja negra y extremo a extremo: registro, acceso, recuperación, rutas protegidas y chat probados en el navegador.

## Pendientes conocidos

- **Prueba que falla en `develop`:** `consultation.test.jsx` («asks for device and fault…»), desde el cambio de la
  vista «Mis Tickets».
- **Taller:** tickets e inventario usan datos de demostración; no están conectados a la API.
- **Despliegue:** Vercel (`techfixai.vercel.app`) debe apuntar a este repositorio; el proxy `/backend/*` hacia Render
  no está versionado (falta un `vercel.json`).

## Código que no hay que duplicar

| Necesidad | Usa |
| --- | --- |
| Botón, campo, paginación, ícono, aviso | `src/shared/ui/ui.jsx`, `src/shared/ui/FormAlert.jsx` |
| Texto del agente con negritas | `src/shared/ui/RichText.jsx` |
| Protección de rutas por rol | `src/features/auth/RequireRole.jsx` |
| Contraseña con requisitos y confirmación | `src/features/auth/PasswordFields.jsx` (reglas en `src/domain/validation.js`) |
| Validar correo o móvil | `EMAIL_RE` e `isMobilePhone` en `src/domain/validation.js` |
| Llamadas a cuentas | `src/features/auth/authApi.js` (no uses `fetch` directo en las pantallas) |
| Llamadas al chat y tickets | `src/features/chat/chatApi.js` |
| Formato de importes en soles | `formatPEN`, `parseMoney` y `centsToInput` en `src/domain/money.js` |
| Estados y categorías de ticket | `src/domain/tickets.js` |
| Colores, radios, sombras, foco | variables de `src/shared/styles/tokens.css` |
