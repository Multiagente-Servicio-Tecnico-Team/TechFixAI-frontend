# TechFix.AI — Frontend

Interfaz web de TechFix.AI (la API está en [TechFixAI-backend](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend)): landing, registro de cuenta, inicio de sesión y recuperación de contraseña,
más el portal del cliente y el panel del taller. Las pantallas siguen los prototipos de Figma del proyecto.

Producción: https://techfixai.vercel.app

## Frameworks y librerías

| Uso | Herramienta | Versión |
| --- | --- | --- |
| Interfaz | React | 18.3 |
| Empaquetado y servidor de desarrollo | Vite + `@vitejs/plugin-react` | 5.4 |
| Rutas | React Router | 6 |
| Iconos | lucide-react | 0.460 |
| Pruebas | Vitest + Testing Library + jsdom | 2.1 / 16 / 25 |
| Estilos | CSS propio con variables (sin framework), sistema de diseño «Circuito» con tema oscuro y claro; tipografías Geist y Geist Mono | — |

## Estructura de carpetas

```text
TechFixAI-frontend/
├── index.html               # Documento base y fuentes
├── public/favicon.svg
├── src/
│   ├── main.jsx             # Punto de entrada: carga estilos, router y estado
│   ├── app/                 # Composición: rutas (App.jsx), layouts y ScrollManager
│   ├── domain/              # JS puro, sin React: dinero, validaciones, estados de ticket, cuenta, inventario
│   ├── state/               # Estado de React (store.jsx), datos de demostración y sesión del navegador
│   ├── features/            # Una carpeta por funcionalidad
│   │   ├── auth/            # Acceso, registro, recuperar, restablecer, LoginForm, RequireRole, authApi.js
│   │   ├── chat/            # Asistente (real y demostración), LiveChat, chatApi.js
│   │   ├── tickets/         # Mis Tickets
│   │   ├── workshop/        # Panel del taller: cola, detalle, ticket presencial, inventario
│   │   ├── landing/         # Landing, sus secciones (sections/) y landing.css
│   │   └── help/            # Ayuda y página 404
│   └── shared/              # Reutilizable y sin estado
│       ├── ui/              # ui.jsx, FormAlert, RichText, Logo, Eyebrow
│       ├── api/baseUrl.js   # URL de la API (mismo origen en producción)
│       └── styles/          # index, tokens, base, components y screens.css (portal, taller y acceso)
├── tests/
│   ├── unit/                # Dominio, clientes de API y regla de dependencias entre capas
│   └── integration/         # Pantallas con Testing Library
└── vite.config.js           # Configuración de Vite y de Vitest
```

### Capas

`domain` ← `shared` ← `state` ← `features` ← `app`: cada capa solo importa de las de su izquierda;
`tests/unit/architecture.test.js` lo comprueba. Las reglas de negocio (importes, validaciones, estados) van en
`domain` y se prueban sin React; las pantallas de una funcionalidad viven en su carpeta de `features`.

## Estilos

- Una pieza que usan varias pantallas (botón, etiqueta, campo de formulario, aviso…) va en
  `src/shared/styles/components.css`; lo propio de la landing va en `src/features/landing/landing.css` y lo del
  portal, el taller y el acceso en `src/shared/styles/screens.css`.
- Los colores, radios y sombras se toman de `src/shared/styles/tokens.css` con `var(--…)`; si un valor se repite,
  se agrega un token en lugar de escribirlo a mano.
- El tema oscuro es el predeterminado; el claro se activa con `data-theme="light"` en `<html>` desde el botón de
  tema (`ThemeToggle`). Solo se guarda esa preferencia visual en `localStorage` (`techfix-theme`).
- El orden de carga (`main.jsx`) es `shared/styles/index.css`, `landing.css` y `screens.css`: los estilos de pantalla
  pueden ajustar a los generales sin subir la especificidad.

## Funcionalidad

| Ruta | Pantalla | Qué hace |
| --- | --- | --- |
| `/` | Landing | Presentación del producto; enlaces al portal, al asistente y al panel |
| `/portal/registro` | Registro | Nombre, correo, teléfono (E.164), contraseña con requisitos en vivo, confirmación y términos |
| `/portal/acceso` | Inicio de sesión | Valida, muestra carga y errores; vuelve a la página protegida solicitada |
| `/portal/recuperar` | Recuperar contraseña | Pide el correo; la respuesta no revela si existe |
| `/portal/restablecer?token=…` | Restablecer contraseña | Nueva contraseña con la misma política; enlace inválido o vencido |
| `/portal/tickets`, `/portal/asistente` | Portal del cliente | Tickets, aprobación de presupuestos y consulta nueva con el asistente |
| `/taller/acceso`, `/taller/*` | Panel del taller | Cola de triage, detalle y ticket presencial |
| `/taller/inventario` | Inventario de repuestos | Listar (búsqueda, categoría, stock crítico, orden), crear, editar y eliminar con confirmación |
| `/ayuda` | Ayuda | Soporte, FAQ, estado del sistema y legales |

Reglas de sesión: las rutas `/portal/*` y `/taller/*` exigen sesión del rol correspondiente; con sesión abierta,
acceso y registro redirigen al área del usuario. La sesión del navegador guarda solo rol, nombre y correo
(`sessionStorage`); nunca contraseñas ni tokens.

## Conexión con el backend

El cliente `src/features/auth/authApi.js` decide el modo según `VITE_API_URL`:

- **Sin definir (por defecto):** modo demostración con simulador local. Cualquier correo válido inicia sesión;
  `registrado@techfix.ai` simula un correo ya registrado (409) y `token=expirado` un enlace vencido.
- **Definido:** llama a la API de cuentas ([`app/accounts`](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend/blob/develop/app/accounts/README.md)) con `POST`, JSON y
  `credentials: "include"` (cookie de sesión HttpOnly).
- **Producción:** si no está definido o contiene una URL absoluta, se usa `/backend/auth` para mantener la
  cookie same-origin con el portal.

| Endpoint | Cuerpo | Respuesta esperada |
| --- | --- | --- |
| `/registro` | `{ nombre, apellido, email, telefono, password }` | `201 { usuario }` · `409` correo duplicado · `422` datos inválidos |
| `/login` | `{ email, password }` | `200 { usuario }` + cookie · `401` credenciales · `429` intentos |
| `/logout` | — | `204` y borra la cookie |
| `/recuperar` | `{ email }` | `200` siempre; si la cuenta existe envía el enlace `/portal/restablecer?token=…` por correo |
| `/restablecer` | `{ token, password }` | `200` · `400/410` enlace inválido, vencido o usado · `422` contraseña débil |

`usuario` incluye `rol`: `CUSTOMER` entra al portal del cliente y `TECHNICIAN` o `ADMIN` al panel del taller;
una cuenta de cliente no puede entrar al panel. El campo "Nombre y Apellido" se envía separado en `nombre` y
`apellido`.

Mensajes al usuario: 409 se muestra en el campo correo; 401 como "Correo o contraseña incorrectos"; errores de
red o 5xx con un mensaje genérico, nunca con el texto del servidor.

El asistente usa `src/features/chat/chatApi.js` y `VITE_CHAT_URL`. El portal envía `POST /api/chat`
con `credentials: "include"` y el patrón seleccionado (`hierarchical`, `orchestrator`
o `decentralized`); el patrón no cambia hasta iniciar una conversación nueva.
`GET /api/chat/patterns` también requiere sesión. En producción, si la URL está vacía
o apunta a un origen absoluto, se usa `/backend`, el mismo host que las rutas de
autenticación. En desarrollo sin URL se conserva el modo demostración.

### Inventario de repuestos

`src/features/workshop/inventoryApi.js` y `VITE_INVENTORY_URL`. Sin la variable el inventario trabaja en modo
demostración (datos en memoria), también en producción, hasta que el backend publique estas rutas. Con la variable
llama a la API con `credentials: "include"`; la sesión debe ser de personal del taller.

| Método y ruta | Cuerpo | Respuesta esperada |
| --- | --- | --- |
| `GET /api/inventory/parts` | — | `200 { parts: [repuesto] }` |
| `POST /api/inventory/parts` | `repuesto` | `201 { part }` · `409` SKU duplicado · `422` datos inválidos |
| `PUT /api/inventory/parts/{code}` | `repuesto` | `200 { part }` · `404` no existe · `422` |
| `DELETE /api/inventory/parts/{code}` | — | `204` · `404` · `409` el repuesto figura en presupuestos |

`repuesto` = `{ code, name, category, description, unit_price, current_stock, minimum_threshold }`, con los nombres
de la tabla `spare_parts`; `unit_price` va como texto con dos decimales (`"114.75"`) y `description` guarda los
equipos compatibles. `401` y `403` muestran que hay que iniciar sesión como personal; los demás errores, un mensaje
genérico. La pantalla solo cambia cuando el servidor confirma la operación.

## Ejecución local

Requisitos: Node.js 18 o superior (probado con Node 24) y npm.

```bash
npm install
npm run dev
```

Abrir http://localhost:5173. Para usar un backend local, crear un archivo `.env` (no se sube al repositorio) con:

```bash
VITE_API_URL=http://localhost:8000/auth
VITE_CHAT_URL=http://localhost:8000
VITE_INVENTORY_URL=http://localhost:8000
```

## Pruebas

```bash
npm test
```

96 pruebas en 11 archivos: contrato de cuentas, chat e inventario, rutas de API same-origin en
producción, errores HTTP/red, reglas del dominio y de capas, selector y
bloqueo de patrón, propuestas y tickets, registro, acceso, recuperación,
restablecimiento, roles, cierre de sesión, consulta nueva y CRUD del inventario.

## Compilación y despliegue

```bash
npm run build
```

Genera `dist/` (HTML, CSS y JS estáticos). Para publicarlo:

1. Para Netlify, definir `VITE_API_URL=/backend/auth` y `VITE_CHAT_URL=/backend` antes de compilar. No
   configurar URLs absolutas del backend Render en el cliente.
2. En Netlify, publicar `public/_redirects` junto con `dist/`; `/backend/*` debe proxyar al backend unificado,
   conservando método, cuerpo y cabeceras `Set-Cookie`/`Cookie`.
3. Configurar fallback de rutas SPA a `index.html`.
4. El backend debe usar HTTPS y cookie `HttpOnly; Secure; SameSite=Lax; Path=/`. Con proxy same-origin no se
   requiere CORS para login/chat. No depender de cookies cross-site ni de `SameSite=None`.
5. Tras desplegar, cerrar sesión y volver a iniciar sesión para emitir una cookie por el nuevo origen.

## Limitaciones actuales

- En modo demostración (sin `VITE_API_URL`) no se verifican contraseñas ni se persisten datos al recargar.
- El proxy same-origin de producción está configurado para Netlify en `public/_redirects` y, en Vercel, en la configuración del proyecto; otros
  hostings necesitan una regla equivalente para `/backend/*`.
- Tickets, inventario y asistente usan datos de demostración en memoria.
- Sin `VITE_CHAT_URL` el asistente responde con textos de demostración. Con `VITE_CHAT_URL` usa el patrón
  LangGraph configurado (contrato en [`app/chat/README.md`](https://github.com/Multiagente-Servicio-Tecnico-Team/TechFixAI-backend/blob/develop/app/chat/README.md)); la conversación vive en la pestaña y recargar
  empieza una nueva.

## Chat con los agentes

`/portal/asistente` envía `POST /api/chat` a `VITE_CHAT_URL` con la cookie del inicio de sesión: el cliente no
escribe su correo y el servidor lo identifica por la sesión. Muestra la respuesta del agente, la tarjeta de
presupuesto (aceptar o rechazar) y el ticket creado. Si la sesión terminó lleva al acceso y vuelve al chat; ante
errores temporales ofrece reintentar. Para probarlo con el patrón de referencia:

```bash
VITE_API_URL=http://localhost:8000/auth
VITE_CHAT_URL=http://localhost:8000
```
