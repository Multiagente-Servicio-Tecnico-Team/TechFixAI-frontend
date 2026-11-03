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
| `/taller/acceso`, `/taller` | Banco con cola, filtros, estados y exportación para `ADMIN` | API administrativa con `VITE_API_URL`; demo si no hay URL en desarrollo | `workshop.test.jsx`, `admin-ticket-workshop.test.jsx`, `admin-ticket-access.test.jsx` |
| `/taller/tickets/nuevo`, `/taller/tickets/:id` | Alta presencial y detalle con cotización de solo lectura | API administrativa; protegido para `ADMIN` | `admin-ticket-create.test.jsx`, `admin-ticket-detail.test.jsx` |
| `/taller/inventario`, `/taller/inventario/*` | Consulta y mantenimiento de repuestos | API de inventario; demo sin URL en desarrollo y `/backend` en producción | `inventory.test.jsx`, `inventory.test.js` |
| `/taller/contabilidad` | Listado con filtros, paginación y resumen de asientos (solo ADMIN) | Implementada; depende de `VITE_API_URL` o `/backend` en producción | `accounting-list.test.jsx`, `accounting-access.test.jsx` |
| `/taller/contabilidad/nuevo` | Alta confirmada con balance debe/haber, revisión e idempotencia | Implementada; requiere API contable configurada | `accounting-create.test.jsx`, `accounting-domain.test.js`, `accounting-api.test.js` |
| `/taller/contabilidad/:id` | Detalle, trazabilidad y reversión compensatoria (solo ADMIN) | Implementada; requiere API contable configurada | `accounting-detail.test.jsx`, `accounting-reversal.test.jsx` |
| `/taller/compras`, `/taller/compras/:id` | Historial paginado y detalle de comprobante, movimientos y auditoría (solo ADMIN) | API backend con `VITE_API_URL`; no usa datos demo | Pendiente de cobertura automatizada |
| `/taller/compras/nuevo`, `/taller/compras/proveedores` | Registro de compras con líneas de inventario/conceptos libres, recepciones y gestión de proveedores | API de compras y catálogo real usan `VITE_API_URL`; recepción idempotente | Pendiente de cobertura automatizada |
| `/ayuda` | Soporte, preguntas frecuentes, estado y legales | Lista | — |
| `*` | Página 404 | Lista | — |

Todos los clientes de API comparten VITE_API_URL y agregan su propio prefijo de ruta. Compras exige el catalogo real y envia su id numerico como spare_part_id; nunca usa el SKU como clave ni datos falsos.

## Consulta por voz en el asistente

El chat conectado de `/portal/asistente` incluye un botón de micrófono: un toque inicia
la captura y el siguiente la detiene y envía. La transcripción y respuesta aparecen en
el mismo historial, conversación y patrón. Se limita la captura a 120 segundos y 25 MB;
los errores de permiso, formato, tamaño, cuota, proveedor o red permiten continuar por
texto. El navegador debe permitir `MediaRecorder`/`getUserMedia` y la captura requiere
HTTPS o `localhost`. El backend debe tener habilitada `AUDIO_TRANSCRIPTION_ENABLED`.

Implementación en `src/features/chat/useVoiceRecorder.js`, `chatApi.js` y `LiveChat.jsx`.
Pruebas: `chat-api-audio.test.js`, `voice-recorder.test.js`, `chat-audio.test.jsx` y
`chat-audio-errors.test.jsx`. El contrato y requisitos canónicos se mantienen en el
repositorio backend (ver `docs.md`).

## Contabilidad del taller

La zona `/taller/contabilidad/*` permite a `ADMIN` registrar asientos balanceados, consultar y filtrar su historial,
revisar detalle y eventos, y crear una reversión compensatoria. Los asientos se confirman inmediatamente y no se editan
ni eliminan. La UI conserva `accountRole` junto al área del taller; el backend sigue autorizando cada operación.
Dinero y totales se representan con centavos `BigInt`. Configure una sola vez `VITE_API_URL`; en producción, si está vacío,
se usa same-origin `/backend`; en desarrollo sin URL el servicio muestra un estado no configurado y no datos simulados.
El contrato canónico y los requisitos completos están en el backend: `../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/003-asientos-contables/`.

## Inventario del taller

`/taller/inventario` y sus formularios usan `src/features/workshop/inventoryApi.js` cuando se configura la URL raíz compartida `VITE_API_URL` con la base del backend. En desarrollo sin URL se conserva el modo demo; en producción se usa el proxy same-origin `/backend`. Los repuestos y categorías activas proceden del backend; la categoría se conserva como texto y una categoría nueva aparece al guardar un repuesto que la usa. Un error del servicio no sustituye datos reales por el store demo. El acceso sigue protegido para ADMIN y TECHNICIAN. El contrato canónico está en el repositorio backend: `../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/005-api-inventario/contracts/inventory.openapi.yaml`.

## Tickets administrativos del taller

`/taller`, `/taller/tickets/nuevo` y `/taller/tickets/:id` usan `src/features/workshop/ticketsApi.js` cuando
la URL raíz compartida `VITE_API_URL` está configurada. En desarrollo sin URL se conserva el tablero demo. La API exige `ADMIN`; el
listado recorre y deduplica las páginas del backend, y los cambios de estado se confirman mediante PATCH. El alta
envía los tipos y métodos de adelanto canónicos. El detalle consulta por ID numérico y presenta la última
cotización y los eventos de auditoría como solo lectura. El portal cliente conserva su API independiente.

## Calidad verificada

- Responsivo: 13 pantallas sin desplazamiento horizontal en 360, 390, 768 y 1024 px; el menú se pliega y las tablas
  del taller pasan a tarjetas. Mejora pendiente: área táctil de los enlaces del pie y etiquetas de 11 px.
- Caja negra y extremo a extremo: registro, acceso, recuperación, rutas protegidas y chat probados en el navegador.

## Pendientes conocidos

- **Taller:** los tickets administrativos dependen de la migración backend a una base de prueba; inventario usa la API cuando se configura y conserva demo solo en desarrollo sin URL.
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
| Llamadas a contabilidad | `src/features/accounting/accountingApi.js` |
| Formato de importes en soles | `formatPEN`, `parseMoney` y `centsToInput` en `src/domain/money.js` |
| Estados y categorías de ticket | `src/domain/tickets.js` |
| Colores, radios, foco | variables de `src/shared/styles/tokens.css` (sistema «Banco», ver `design/DESIGN.md`) |
| Logotipo | `src/shared/ui/Logo.jsx` y `public/favicon.svg` |
| Tema claro u oscuro | `src/shared/ui/ThemeToggle.jsx`; `index.html` aplica la preferencia antes de pintar |
| Etiqueta de trabajo, carril y sellos | clases `jobtag`, `rail` y `stamp` de `src/shared/styles/components.css` |
