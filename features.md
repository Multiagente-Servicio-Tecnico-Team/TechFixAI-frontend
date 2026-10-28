# Funcionalidades del frontend

Pantallas, estado, responsables y pruebas. Actualízalo cuando agregues o cambies una pantalla.
Tickets del taller actualizados al 2026-10-28 (rama `tickets-crud`); las demás áreas conservan su estado documentado.

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
| `/taller`, `/taller/tickets/nuevo`, `/taller/tickets/:id` | Cola, alta manual, detalle y edición del estado | Conexión a mock REST mediante `VITE_TICKETS_API_URL`; demostración si no se configura | `workshop-tickets.test.jsx`, `tickets-api.test.js` |
| `/taller/acceso`, `/taller/inventario/*` | Acceso e inventario | Conservan su implementación actual | `inventory.test.jsx` |
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

- **Tickets del taller:** conectados a un mock, sin integración con el backend real. Los stubs actuales devuelven respuestas fijas; no acreditan persistencia. El inventario queda fuera de esta tarea.
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

## Tickets del taller: mock REST

- Cliente HTTP: `src/features/workshop/ticketsApi.js`; carga y operaciones: `useTickets.js`.
  Las pantallas no usan `fetch` directamente. Se reutilizan `FormAlert`, `Toast`, filtros, paginación y estilos.
- Configurar solo en `.env.local`: `VITE_TICKETS_API_URL=https://k7jlwy.wiremockapi.cloud/` y reiniciar Vite.
  `.env*` queda ignorado por Git. Sin URL, las pantallas conservan la demostración en memoria.
- `GET /tickets` devuelve un arreglo directo. `GET /tickets/{id}`, `POST /tickets` y
  `PATCH /tickets/{id}` devuelven un objeto ticket directo, sin contenedores.
- Campos de respuesta: `id`, `date`, `client`, `phone`, `email`, `device`, `issue`, `category`,
  `budget`, `status`, `origin`, `payment`, `advance`, `method`. `budget` y `advance` son enteros
  en céntimos o `null`; no se convierten a soles para enviarlos. `date` conserva el formato de la interfaz.
- POST envía `client`, `phone`, `email`, `device`, `issue`, `category`, `advance`, `method`, `payment`.
  El mock asigna `id`, `date`, `status`, `origin` y `budget`; la navegación usa el ID confirmado.
- La edición sigue siendo solo el estado: PATCH envía únicamente `{ "status": "Esperando Stock" }`.
  Se bloquean envíos durante el guardado y se confirma el éxito después de recibir la respuesta.
  Una respuesta con datos distintos a los enviados se trata como error; no se muestra como guardada.
- Carga y errores de lista/detalle tienen aviso y reintento; un 404 del detalle muestra ticket no encontrado.
  No se modifican los tickets del cliente, agentes, backend ni inventario.

### Verificación manual

1. En Postman, comprobar GET de lista y detalles `TCK-2040`/`TCK-2041`, POST (201, objeto con ID)
   y PATCH (200, objeto con el estado solicitado). Comprobar también los GET posteriores para evaluar persistencia.
2. En el navegador, entrar como personal al taller: buscar, filtrar, paginar, crear y verificar la
   navegación al detalle; recargar el detalle y cambiar estado desde la lista y desde Guardar Cambios.
3. Simular un error de red: el formulario conserva los datos, ofrece reintento cuando corresponde y
   no informa éxito. Verificar en DevTools que PATCH envía solo `status` y los importes viajan en céntimos.
4. Los stubs fijos solo confirman los datos que tienen configurados: para el POST actual usar
   Valeria Lozano, 916310844, correo vacío, iPhone 15 Pro Max, Cambio de pantalla, Reparación y sin adelanto.
   Para probar otros datos/estados, el mock debe devolver esos mismos valores. No presupone almacenamiento.
5. WireMock debe permitir CORS con credenciales y mantener nombres de stubs sin espacios al principio/final:
   el nombre se expone en `Matched-Stub-Name` y un espacio final provocó errores HTTP/2 en Edge.

Validación de esta tarea: 125 pruebas Vitest aprobadas (29 nuevas de tickets), compilación Vite correcta y
comprobación en Edge de lista/detalles, creación, recarga y errores. Las tres pantallas se comprobaron
sin desbordamiento horizontal en 360, 390, 768 y 1024 px. Los cambios de estado exitosos y sus reintentos
se verifican en las pruebas de integración; el mock real devuelve un estado fijo.

Corrección de altas locales (2026-10-28): el estado compartido conserva las respuestas confirmadas de POST
que todavía no aparecen en GET /tickets y las muestra al volver a la cola, incluso durante la carga,
sin duplicar IDs ni conservar datos de demostración. Al incluirlas el GET, la lista de la API vuelve
a ser la referencia para esos IDs. La retención es solo en memoria: al recargar /taller se pierde si
el GET fijo no incluye el ticket; el detalle directo sigue disponible si existe su stub.
Validado con dos pruebas de regresión nuevas (127 pruebas aprobadas) y Edge contra WireMock.

## Revisión de edición de tickets (2026-10-28)

### Alcance confirmado

El modelo contiene más datos que los campos editables. El contrato y el detalle actual solo definen
edición de `status` por `PATCH /tickets/{id}`. Los campos del formulario de creación no constituyen
un contrato de actualización. Se mantienen en lectura cliente, teléfono, correo, equipo, falla,
categoría, presupuesto, origen y datos de pago; ID y fecha siguen asignados por el sistema.
No se agregaron rutas ni campos, ni se modificó el portal de clientes.

### Diagnóstico comprobado en WireMock

| Solicitud | Respuesta observada | Interpretación |
| --- | --- | --- |
| PATCH /tickets/TCK-2040 con `{"status":"Entregado"}` | 200, objeto con `status: "Esperando Stock"` | Discrepancia real del stub: no confirma el cambio |
| PATCH /tickets/TCK-2040 con `{"status":"Esperando Stock"}` | 200, objeto con el mismo estado | Confirma el valor, pero no demuestra una transición porque GET ya tiene ese estado |
| PATCH /tickets/TCK-2041 con `{"status":"Esperando Stock"}` | 404 | No hay actualización disponible para el ticket creado en la instancia probada |

El cliente HTTP ahora indica estado solicitado y recibido ante una discrepancia; no muestra éxito
ni aplica ese PATCH al store. Un 404 de actualización se distingue de la carga del detalle.
Un PATCH confirmado se guarda por ID y su estado se mantiene en memoria frente a GET fijos al navegar
entre lista y detalle; el resto de los datos sigue viniendo de la API. Si la lista confirma el estado,
se deja de mantener esa corrección local. Un nuevo POST del mismo ID reemplaza la respuesta anterior
sin duplicados y sin reutilizar un estado de una edición previa. No se insertan altas antes del POST.
No se añadió almacenamiento en el navegador: al recargar mandan los GET configurados.

### Configuración necesaria para comprobar un cambio real

Para cambiar TCK-2040 a Entregado, la solicitud es exactamente:

```http
PATCH /tickets/TCK-2040
Content-Type: application/json

{"status":"Entregado"}
```

El stub debe devolver 200 con el objeto completo y el mismo ID; por ejemplo, conservando los valores
que ya devuelve GET para ese ticket:

```json
{
  "id": "TCK-2040",
  "date": "28/10/26",
  "client": "Valeria Lozano",
  "phone": "+51 916 310 844",
  "email": "",
  "device": "iPhone 15 Pro Max",
  "issue": "Cambio de pantalla",
  "category": "Reparación",
  "budget": 31200,
  "status": "Entregado",
  "origin": "Presencial",
  "payment": "Pendiente",
  "advance": null,
  "method": null
}
```

Para editar el alta TCK-2041, configurar el mismo endpoint de actualización con ese ID concreto:
PATCH /tickets/TCK-2041, solicitud `{"status":"Esperando Stock"}`, respuesta 200 con el objeto que
devolvió POST, manteniendo ID/fecha y todos sus datos (incluido `budget: null`), cambiando solo
`status` a `Esperando Stock`. Es configuración pendiente del mock, no una ruta nueva de la aplicación.
No se modificaron los stubs. GET puede seguir fijo: el cambio confirmado se verá durante la sesión,
pero no acredita persistencia. La comprobación positiva real en WireMock queda pendiente de esos ajustes.

### Verificaciones realizadas y evidencia

- `npm test`: 131 pruebas aprobadas, incluidas respuestas PATCH válidas y discrepantes, navegación con GET
  fijo, datos de lectura, POST repetido por ID, bloqueo antes de confirmación y reinicio del estado.
- `npm run build`: correcto. `git diff --check`: sin errores.
- Edge con WireMock real: listado, POST 201, detalle, vuelta a lista sin duplicados, recarga de lista,
  errores reales PATCH 200 discrepante/404 y desconexión. Los errores del detalle se comprobaron sin
  desbordamiento horizontal en 360, 390, 768 y 1024 px.
- El caso positivo de edición se verificó con respuestas simuladas en las pruebas, no como transición
  exitosa contra los stubs actuales. No se certifica persistencia.
- Capturas locales de esta revisión: `.local/tickets-edit-review/` en el workspace de ejecución
  (Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte), fuera del repositorio frontend:
  `list-after-post.png`, `edit-created-404.png`, `list-patch-mismatch.png` y
  `edit-status-mismatch-360.png`/`390.png`/`768.png`/`1024.png`.
  Para la entrega guardar también la solicitud/respuesta PATCH en Postman y, después de ajustar el stub,
  una captura del estado modificado con confirmación y de la lista actualizada. Estas últimas están pendientes.
