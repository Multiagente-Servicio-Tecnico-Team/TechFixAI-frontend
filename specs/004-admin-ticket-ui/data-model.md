# Modelo de datos: Panel administrativo de tickets

El backend conserva los datos y autoriza cada operación. El frontend normaliza su respuesta para las tarjetas Banco, el formulario y el detalle. Las rutas, cuerpos y respuestas HTTP completos siguen en el OpenAPI canónico del backend: `../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/004-gestion-admin-tickets/contracts/admin-tickets.openapi.yaml`.

## AdminTicketSummary (respuesta `items[]`)

| Campo de API | Tipo/límite | Modelo de pantalla |
|---|---|---|
| `id` | entero positivo | Identidad de ruta y operación PATCH. |
| `code` | cadena, por ejemplo `TCK-...` | Identificador visible y de exportación. |
| `customer_id` | entero o nulo | Solo dato de contexto; no se envía en operaciones. |
| `origin` | `MANUAL`, `ONLINE` o nulo histórico | Etiqueta Presencial, En línea o Desconocido. |
| `contact_name`, `contact_phone`, `contact_email` | cadenas o nulo | Para online, usar `customer_name`, `customer_phone`, `customer_email` como fallback del usuario relacionado. |
| `title` | cadena, hasta 200 | Equipo / marca / modelo. |
| `failure_description` | cadena, hasta 10000 | Falla o solicitud. |
| `request_type` | uno de cinco códigos canónicos | Traducir con `REQUEST_TYPE_LABEL`; conservar código en estado y payloads. |
| `status` | uno de diez códigos canónicos | Traducir con `TICKET_STATUS_LABEL`; conservar código en estado y payloads. |
| `advance_amount` | cadena decimal de hasta 8 enteros y 2 decimales o nulo | Convertir exactamente a centavos para formato PEN. |
| `advance_payment_method` | `YAPE_PLIN`, `CASH`, `CARD` o nulo | Etiqueta en español. Solo aplica con adelanto. |
| `quote_total` | cadena decimal o nulo | Resumen de la última cotización; independiente del adelanto. |
| `payment_status` | cadena o nulo | Etiqueta de pago únicamente si existe dato. |
| `created_at`, `updated_at` | fecha/hora ISO o nulo para actualización | Mostrar fecha local en español. |

Los tipos canónicos son `REPAIR` (Reparación), `SALE` (Venta), `PC_BUILD` (Armado de PC), `SUPPORT` (Soporte) y `WARRANTY_CLAIM` (Reclamo de garantía).

Los estados son `NEW` (Nuevo), `IN_DIAGNOSIS` (En diagnóstico), `QUOTED` (Presupuesto enviado), `PAYMENT_PENDING` (Pago pendiente), `PAID` (Pagado), `IN_REPAIR` (En reparación), `READY_FOR_DELIVERY` (Listo para entrega), `DELIVERED` (Entregado), `CANCELLED` (Cancelado) y `WARRANTY_IN_REVIEW` (Garantía en revisión).

## AdminTicketDetail

Incluye todos los campos de resumen y:

- `customer_name`, `customer_phone`, `customer_email`: snapshot del usuario cuando el origen es online.
- `quote`: última cotización o `null`; contiene ID, tipo, mano de obra, partes, total, estado, observaciones y fecha. No incluye detalle de líneas en el contrato actual.
- `audit_events[]`: `event_type`, `actor_user_id`, `changed_fields` y `created_at`. No se asume que haya nombre de actor.
- `payment_method`, `payment_amount` y otros campos extra del serializador pueden llegar; la UI solo presenta los datos documentados y necesarios.

## ManualTicketDraft (estado efímero del formulario)

| Campo | Validación del contrato |
|---|---|
| `contact_name` | Requerido, 3–200 caracteres. |
| `contact_phone` | Requerido, 9–20 caracteres; la pantalla conserva el prefijo `+51`. |
| `contact_email` | Opcional, correo válido, máximo 255 caracteres. |
| `title` | Requerido, 2–200 caracteres. |
| `failure_description` | Requerido, 5–10000 caracteres. |
| `request_type` | Uno de los cinco códigos canónicos. |
| `advance_amount` | Opcional; cadena exacta positiva con hasta 8 enteros y 2 decimales. |
| `advance_payment_method` | Requerido si hay adelanto; omitido si no hay importe. Valores canónicos `YAPE_PLIN`, `CASH`, `CARD`. |

`origin`, `customer_id`, `code`, `status`, `diagnosis_type` y el actor no los decide el formulario: los asigna el backend. El borrador solo vive en memoria y se conserva mientras la solicitud dé error.

## TicketListQuery

Estado de filtros para `GET /api/admin/tickets`: `status`, `request_type`, `origin`, `search`, `limit` (1–200, default 50) y `offset` (>=0). La respuesta incluye `items`, `total`, `limit` y `offset`. `search` cubre código, contacto, teléfono, correo, título y descripción. Para exportar se repiten páginas con los mismos filtros hasta completar `total`.

## TicketPatchDraft

En esta feature la pantalla actual solo cambia `status`; el PATCH envía el código canónico seleccionado. El backend admite además contacto, tipo, equipo, detalle y adelanto, pero permanecen de solo lectura en la UI. La baja se representa con `CANCELLED`; no hay borrado físico.

## UI-only view model

La vista deriva `client`, `phone`, `email`, `device`, `issue`, `typeLabel`, `statusCode`, `statusLabel`, `originLabel`, `advanceCents`, `quoteCents` y `date` del DTO API. No modifica la respuesta fuente ni usa los IDs demo `TCK-20xx` para construir rutas al backend.
