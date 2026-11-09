# Contrato frontend: clientes y comercio

El contrato HTTP canónico se mantiene en el backend: [customer-commerce.openapi.yaml](../../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/007-gestion-clientes-comerciales/contracts/customer-commerce.openapi.yaml). Este documento precisa el comportamiento de las pantallas, los datos que deben enviar y las rutas del contrato que consume el frontend. No redefine autorización ni ownership.

## Reglas de sesión y propiedad

- `authApi` mantiene los flujos existentes de registro, acceso, salida y recuperación de contraseña. La respuesta sigue representando la cuenta `users` y la sesión viaja en la cookie actual.
- Todas las llamadas autenticadas incluyen credenciales de sesión. Ninguna vista cliente solicita ni envía identidad comercial en query/body.
- El backend resuelve el perfil comercial desde la cuenta autenticada; la interfaz no asume que la clave de una cuenta coincide con la de un perfil.
- Sesión ausente lleva al acceso conservando el retorno. Falta de rol muestra denegación. Perfil comercial ausente no activa fallback con datos ficticios.
- CUSTOMER nunca ve botones ADMIN de creación de clientes, cotizaciones o confirmación de pagos. TECHNICIAN no obtiene acceso a operaciones ADMIN por estar dentro del taller.

## Mapa de operaciones

| Pantalla/flujo | Operación backend | Datos de entrada relevantes | Resultado esperado en frontend |
|---|---|---|---|
| Portal: tickets | `GET /api/customer/tickets` | Sesión solamente | Lista own-only; admite `quotes[]`, el campo legacy singular y diagnósticos persistidos de hardware/software |
| Portal: iniciar ticket de servicio | `POST /api/customer/tickets` | `title`, `failure_description`, `request_type` | Ticket asociado al perfil de sesión; no incluir customer ID ni contacto comercial editable |
| Portal: mis cotizaciones | `GET /api/customer/quotes` | Filtro/paginación opcionales del contrato | Una lista unificada de servicio y venta, sin consultar además la lista específica duplicada |
| Portal: detalle cotización | `GET /api/customer/quotes/{quote_id}` | ID del recurso | Solo cotización propia; 404 para no encontrada/no propia |
| Portal: aceptar cotización | `POST /api/customer/quotes/{quote_id}/acceptance` | Header `Idempotency-Key` | Estado actualizado de backend; aceptación de venta mantiene pago pendiente y reserva |
| Portal: pagos | `GET /api/customer/payments` | Filtros/paginación documentados, sin customer ID | Historial propio y estados confirmados |
| Portal: ventas | `GET /api/customer/sales-orders`, `GET /api/customer/sales-orders/{order_id}` | Sin customer ID | Ventas propias, pago y líneas snapshot |
| ADMIN: clientes comerciales | `GET /api/admin/customers` | Usar `search`, `origin`, `limit`, `offset`; no el filtro legacy `email` | Resultados paginados; UI distingue origen y `account_linked` |
| ADMIN: alta/edición cliente manual | `POST /api/admin/customers`, `GET/PATCH /api/admin/customers/{customer_id}` | Nombre, teléfono, correo opcional; campos actuales solamente | Cliente comercial sin cuenta de acceso; respuesta backend aporta ID de selección |
| ADMIN: tickets taller | `GET/POST /api/admin/tickets`, `GET/PATCH /api/admin/tickets/{ticket_id}` | En alta, perfil comercial seleccionado y snapshots; tipo de servicio permitido | Usa `ticketsApi`; snapshot no se reemplaza retroactivamente |
| ADMIN: cotización de servicio | `POST /api/admin/tickets/{ticket_id}/quotes` | Tipo permitido y líneas con ID numérico de repuesto y cantidad | Cotización relacionada al ticket, mostrada solo tras respuesta confirmada |
| ADMIN: cotizaciones de venta | `GET/POST /api/admin/sales-quotes`, `GET /api/admin/sales-quotes/{quote_id}` | Perfil comercial, líneas (`spare_part_id`, cantidad), vencimiento | La cotización no crea ticket; precios/totales proceden del backend |
| ADMIN: aceptación manual y cancelación | `POST /api/admin/sales-quotes/{quote_id}/acceptance`, `/cancellation` | Canal/nota según contrato; clave idempotente para aceptación | Solo registra aceptación explícita de cliente sin portal o cancelación ADMIN |
| ADMIN: confirmar cobro | `POST /api/admin/sales-quotes/{quote_id}/payment-confirmation` | Método/referencia/nota y `Idempotency-Key` | Solo ADMIN; una venta aparece tras confirmación de backend |
| ADMIN: ventas y pagos | `GET /api/admin/sales-orders`, `GET /api/admin/payments` y detalles documentados | Filtros/paginación del contrato | Historial administrativo, no modifica stock desde navegador |

## Identificadores y líneas de catálogo

- Cuando ADMIN crea una cotización que incluye inventario, la selección procede del catálogo backend y envía el ID numérico estable `spare_parts.id` como `spare_part_id`.
- El SKU/código es una etiqueta visible; nunca se transforma en la clave de relación.
- El portal no decide el cliente ni el perfil al que pertenece una cotización.
- Un ticket manual debe asociarse al cliente elegido. El frontend primero crea un perfil manual si no existe; no lo crea como cuenta de acceso.

## Estados de respuesta

| Respuesta | Presentación |
|---|---|
| Éxito | Reemplazar borrador/resumen con el DTO y valores confirmados del backend |
| Sesión requerida | Limpiar estado transitorio sensible e iniciar acceso con retorno |
| Sin autorización | Mensaje de permiso insuficiente, sin datos privados |
| No encontrado | Recurso ausente o ajeno; mensaje neutral y acción para volver a la lista |
| Conflicto | Estado vencido, falta de stock, transición inválida o repetida; conservar pantalla y mostrar mensaje recuperable |
| Validación | Asociar error al campo cuando sea posible y conservar el formulario |
| Servicio no disponible / red | Permitir reintento; nunca presentar estado vacío exitoso ni datos demo como respuesta del servicio |

## Incompatibilidades detectadas

1. El contrato 007 expone `quotes[]` en tickets y un campo `quote` legacy; la interfaz actual normaliza solo `quote` singular. El adaptador frontend debe soportar ambos formatos.
2. El router backend ofrece una búsqueda administrativa paginada por `search`, pero el filtro especial `email` devuelve un único objeto. El frontend usará la ruta paginada para conservar coincidencias ambiguas.
3. La especificación permite cotizaciones de venta sin ticket y pagos separados; los formularios/pantallas anteriores orientados a tickets no deben forzar una relación a ticket ni marcar la cotización como pagada al aceptarla.
4. Aunque el contrato define el perfil comercial ligado a sesión, el código backend actual no crea ese perfil al registrar ni lo carga en `SessionCustomer`. Este es un prerrequisito backend para las operaciones portal.
5. El endpoint de enlace cuenta-cliente requiere un `user_id` conocido y confirmación de identidad, sin operación para descubrir candidatos. No se crea un enlace automático ni una pantalla que solicite IDs manuales.
