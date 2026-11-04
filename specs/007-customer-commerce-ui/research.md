# Research: Integración frontend de clientes y comercio

## Decisiones

### Mantener `users` como cuenta y `customers` como perfil comercial

- **Decisión**: conservar el login, registro, recuperación y cierre de sesión existentes. La sesión sigue autenticando `users`; el navegador no solicita ni persiste un identificador comercial para determinar a qué registros puede acceder.
- **Rationale**: los perfiles comerciales pueden existir sin credenciales y el ownership debe salir de la cuenta autenticada. La cuenta y el registro comercial no son sustituibles entre sí.
- **Alternativas consideradas**: convertir clientes manuales en cuentas con contraseña o enviar un ID comercial desde la interfaz del portal; se descartan por confundir identidad comercial con acceso y permitir suplantar el filtro de propiedad.
- **Evidencia local**: `src/features/auth/authApi.js`, `src/features/auth/Register.jsx`, `src/state/session.js`; backend `app/accounts/service.py`, `app/accounts/session.py` y `app/adapters/api/chat.py`.

### Tratar el vínculo `users`–`customers` como prerrequisito del backend

- **Decisión**: el frontend no crea un perfil por su cuenta después del registro y no usa el ID de usuario como sustituto del ID comercial. El backend debe provisionar el vínculo al registrar y resolver el perfil desde la sesión antes de atender rutas portal.
- **Rationale**: `register_user()` inserta `users` pero no `customers`; `SessionGuard._to_customer()` deja `commercial_customer_id` en `None`; varias rutas luego usan `commercial_customer_id or user.id`. Esto falla si los IDs difieren y no es una autorización segura.
- **Alternativas consideradas**: añadir una segunda solicitud frontend para crear `customers`, usar el mismo ID numérico de `users`, o hacer que el frontend mande el customer ID. Se descartan porque producen estados parciales o eluden ownership del servidor.
- **Evidencia local**: backend `app/accounts/service.py::register_user`, `app/accounts/session.py::_to_customer`, `app/adapters/api/chat.py` y `app/adapters/api/sales_quotes.py`.
- **Implicación**: hasta que el backend complete esta dependencia, la integración del portal puede probarse con mocks, pero la aceptación extremo a extremo queda bloqueada y debe fallar de forma segura.

### Mantener clientes frontend por funcionalidad

- **Decisión**: mantener `authApi.js` como cliente de cuentas; extender `ticketsApi.js` para operaciones del taller y perfil seleccionado en altas de servicio; crear módulos propios para clientes comerciales y para cotizaciones/pagos/ventas.
- **Rationale**: contabilidad, compras e inventario ya usan clientes de API por funcionalidad. No se debe convertir `authApi` en cliente de clientes comerciales ni cargar la lógica de pagos en `chatApi`.
- **Alternativas consideradas**: un cliente API universal o añadir todas las operaciones a `chatApi.js`; se descartan porque mezclan autorización y ciclos de vida distintos.
- **Evidencia local**: `src/features/accounting/accountingApi.js`, `src/features/purchases/purchasesApi.js`, `src/features/workshop/inventoryApi.js`, `src/features/workshop/ticketsApi.js`.

### Usar la lista unificada del portal y conservar cotizaciones múltiples

- **Decisión**: consultar la operación unificada del backend para cotizaciones propias y normalizar todos los DTOs a un modelo de pantalla que distingue REPAIR, DIRECT_SALE y PC_BUILD. El detalle de ticket conserva cero o más cotizaciones; la respuesta `quote` singular queda como compatibilidad para datos existentes.
- **Rationale**: el contrato backend publica `/api/customer/quotes` para cotizaciones de servicio y venta, además de rutas redundantes específicas para ventas. `Tickets.jsx` hoy lee solo `ticket.quote`, mientras el nuevo contrato expone `quotes[]` y un campo legacy.
- **Alternativas consideradas**: consultar a la vez la lista unificada y la lista exclusiva de ventas, o seguir mostrando solo la última quote; se descartan porque duplican registros o esconden historial.
- **Evidencia local**: backend `specs/007-gestion-clientes-comerciales/contracts/customer-commerce.openapi.yaml`; frontend `src/features/tickets/Tickets.jsx`, `src/features/chat/chatApi.js`.

### Elegir/crear perfiles manuales antes de altas administrativas

- **Decisión**: el flujo ADMIN busca por `search` en la lista paginada, permite crear un customer manual y usa la respuesta del backend para asociar el ticket o la cotización. No envía email al endpoint legacy especial que responde un único objeto.
- **Rationale**: la ruta paginada cubre coincidencias ambiguas y conserva la distinción entre perfiles repetidos; el endpoint `?email=` se aparta del contrato OpenAPI paginado.
- **Alternativas consideradas**: crear el cliente implícitamente desde el formulario de ticket o elegir automáticamente por correo/teléfono; se descartan para evitar registros duplicados involuntarios y asociación equivocada.
- **Evidencia local**: backend `app/adapters/api/customers.py` y OpenAPI backend 007; frontend `src/features/workshop/NewTicket.jsx`.

### No exponer vínculo manual de cuenta en la interfaz inicial

- **Decisión**: mostrar el estado `account_linked` como dato informativo; no incluir acción para vincular una cuenta manual desde una lista genérica.
- **Rationale**: el backend requiere `user_id` e identidad verificada, pero no publica una búsqueda segura de cuentas portal candidatas. El vínculo automático por correo/teléfono está prohibido.
- **Alternativas consideradas**: pedir un ID de usuario al operador o autovincular coincidencias; se descartan por riesgo de enlazar una cuenta a la persona equivocada.
- **Evidencia local**: backend OpenAPI `LinkAccount`, `app/adapters/api/customers.py`; spec frontend FR-019.

### Reutilizar el módulo de inventario para líneas de cotización

- **Decisión**: reutilizar los artículos activos y su `id` numérico estable de `inventoryApi`; el SKU queda como texto visible, nunca como ID de relación.
- **Rationale**: las cotizaciones requieren `spare_part_id`, mientras el API de inventario ya conserva el ID estable.
- **Alternativas consideradas**: enviar SKU o inventar una conversión local; se descartan porque no garantiza la identidad de la fila persistida.
- **Evidencia local**: `src/features/workshop/inventoryApi.js`, `specs/005-inventory-api-integration/contracts/inventory-consumer.md` y OpenAPI backend de inventario.

### Separar estado de cotización, pago y venta en las pantallas

- **Decisión**: mostrar estado de oferta, estado de pago y estado de venta en campos/badges diferenciados; solo ADMIN ve confirmación de pago.
- **Rationale**: aceptación de oferta no equivale a cobro; pedido/venta se crea después del pago verificado y descuenta inventario en backend.
- **Alternativas consideradas**: mostrar un único estado “pagado” en la cotización o permitir confirmación desde la vista cliente; se descartan porque inducen a afirmar una operación que no ocurrió.
- **Evidencia local**: backend OpenAPI 007, `src/features/chat/LiveChat.jsx`, `src/features/accounting/` como patrón de operaciones ADMIN.

### Aislar pagos por sesión y proteger reintentos

- **Decisión**: para aceptación de cotización, mantener una clave de idempotencia durante un reintento de una misma acción; no regenerarla mientras la respuesta sea incierta. El portal solo lista pagos/ventas propios y ADMIN confirma pagos con actor derivado de sesión.
- **Rationale**: previene solicitudes repetidas y no permite que el frontend defina autoría o confirme cobros como cliente.
- **Alternativas consideradas**: generar una clave nueva en cada reintento o marcar localmente la aceptación; se descartan por posibilidad de duplicar cambios o divergir del servidor.
- **Evidencia local**: OpenAPI backend `Idempotency-Key` para aceptación/confirmación; clientes de API existentes conservan manejo explícito de errores.

## Matriz contrato/código revisado

| Área | Contrato/expectativa | Código existente | Tratamiento de plan |
|---|---|---|---|
| Registro y login | `users` autentica y sesión resuelve un customer | Registro crea `User`; sesión no carga perfil comercial | Dependencia backend antes de aceptación E2E |
| Portal tickets | Sólo servicio, propiedad desde sesión; lista admite cotizaciones | Cliente actual lee `tickets`, UI espera quote singular | Extender normalización y vista de historial |
| Admin customers | búsqueda/CRUD, manual sin credenciales | router implementado, búsqueda general paginada y excepción `email` | Usar búsqueda general paginada; dejar link-account fuera |
| Admin tickets | Ticket de servicio asociado a perfil y actor separados | cliente existente manda contacto directo; no tiene selección customer | Incorporar seleccionar/crear customer |
| Cotización de servicio | Ticket puede tener cero o más cotizaciones | UI de detalle solo lectura de la última; backend route existe | Crear cotización desde detalle y mostrar historial |
| Cotización venta | Puede existir sin ticket, acepta/reserva; después admin confirma pago | Backend API implementada; UI solo ve tarjeta de chat, no vista comercial persistida | Crear vistas/cliente de commerce y unificar presentación |
| Cuenta manual y login futuro | Vínculo requiere identidad verificada | API pide user_id, no hay búsqueda de cuenta candidata | No crear UI de enlace hasta tener flujo de verificación seguro |

## Incógnitas

No quedan decisiones de producto pendientes. La única condición de integración conocida es el prerrequisito backend de creación/resolución del perfil comercial, descrito arriba; no se resuelve del lado frontend.
