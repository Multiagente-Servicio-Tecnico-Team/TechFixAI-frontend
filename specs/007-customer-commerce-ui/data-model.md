# Modelo de datos frontend: clientes y comercio

Este documento define modelos de lectura y borradores de pantalla; no crea tablas ni sustituye el esquema PostgreSQL. El contrato backend de `007-gestion-clientes-comerciales` es la fuente de verdad.

## AccountSession

Proyección mínima existente para navegación. No es la identidad comercial ni sirve para seleccionar registros.

| Campo | Tipo frontend | Regla |
|---|---|---|
| `role` | unión `client` / `staff` | Control de rutas frontend; el backend revalida permisos |
| `accountRole` | `CUSTOMER` / `TECHNICIAN` / `ADMIN` | Presente para cuentas de staff cuando se conoce |
| `name` | texto | Nombre mostrado |
| `email` | texto | Correo de cuenta |

El frontend no añade `customer_id` a `sessionStorage`. Las operaciones portal siempre consultan al backend bajo la sesión de cuenta. El backend debe resolver el perfil comercial asociado.

## CommercialCustomer / CustomerDraft

Representa a la persona o empresa, con o sin cuenta de acceso.

| Campo | Tipo | Regla / presentación |
|---|---|---|
| `id` | entero positivo | Clave devuelta por backend; se conserva solo en estado de operación ADMIN |
| `display_name` | texto | 2–200; obligatorio |
| `phone` | texto | 7–30; obligatorio |
| `email` | texto nullable | Opcional; validación de correo |
| `origin` | `MANUAL` / `PORTAL` | Etiqueta traducida; no inferir por coincidencias |
| `account_linked` | boolean | Estado informativo, no se activa localmente |
| `active` | boolean | El backend define si se acepta para nuevos registros |
| `created_by_user_id` | entero nullable | Solo auditoría de backend; no es el cliente |
| `created_at`, `updated_at` | fecha/hora | Informativas; se presentan en horario local |

`CustomerDraft` contiene solo `display_name`, `phone`, `email?`. No contiene contraseña, rol, usuario creado ni confirmación de identidad de una cuenta existente.

## ServiceTicketSummary / ServiceTicketDetail

Ticket de reparación, soporte, armado o garantía que requiere seguimiento del taller. Una compra no se modela como ticket.

| Campo | Tipo | Regla / presentación |
|---|---|---|
| `id` | entero positivo | ID de consulta interna de ADMIN |
| `code` | texto | Identificador visible devuelto por backend |
| `customer_id` | entero positivo | Solo se presenta como dato asociado; no establece el ownership portal |
| `title` | texto | Equipo/modelo o asunto |
| `failure_description` | texto | Detalle del servicio |
| `request_type` | `REPAIR`, `SUPPORT`, `PC_BUILD`, `WARRANTY_CLAIM` | Código backend con etiqueta en español |
| `origin` | `MANUAL` / `ONLINE` | Código backend con etiqueta |
| `status` | código de backend | Se traduce sin mutación local |
| `contact_name`, `contact_phone`, `contact_email` | texto nullable | Snapshot histórico de ingreso |
| `quotes` | `ServiceQuote[]` | Puede ser vacío o contener varias cotizaciones de servicio |
| `quote` | `ServiceQuote?` | Campo singular legacy; se normaliza como compatibilidad si no llega `quotes[]` |

Para el alta ADMIN, `CustomerSelection` contiene el ID de customer devuelto al seleccionar/crear un perfil y snapshots de contacto que se van a registrar. Para el portal, el borrador no tiene `customer_id`, contacto ni autoría: esos valores se resuelven en backend.

## CommercialQuote

Oferta persistida. El tipo determina si pertenece al taller o al flujo comercial; el estado de oferta permanece separado del pago.

| Campo | Tipo | Regla / presentación |
|---|---|---|
| `id` | entero positivo | ID backend |
| `customer_id` | entero positivo | Ownership de backend |
| `kind` | `REPAIR`, `DIRECT_SALE`, `PC_BUILD` | Etiqueta localizada |
| `ticket_id` | entero nullable | Obligatorio para servicio, nulo para venta directa |
| `status` | `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED` | Estado de la oferta |
| `total_amount` | decimal textual | Mostrar desde backend, sin recalcular |
| `lines[]` | líneas snapshot | Cantidad, nombre, código opcional, precio unitario, subtotal |
| `payment_status` | estado nullable | Dimensión separada; no inferir desde `status` |
| `inventory_reservation_status` | `NOT_APPLICABLE`, `NOT_RESERVED`, `RESERVED`, `RELEASED`, `CONSUMED` | Visible en venta cuando la API lo devuelve |
| `expires_at` | fecha/hora nullable | Venta debe exponer vencimiento antes de aceptar |
| `created_at` | fecha/hora | Informativa |

La cotización de servicio se crea desde el detalle de su ticket. La venta directa se presenta fuera del tablero de tickets.

### QuoteLine

| Campo | Tipo | Regla |
|---|---|---|
| `spare_part_id` | entero nullable | ID numérico del inventario; nunca se deriva del SKU |
| `name_snapshot` | texto | Nombre histórico |
| `code_snapshot` | texto nullable | Código histórico visible |
| `quantity` | entero positivo | Cantidad confirmada |
| `unit_price` | decimal textual | Valor backend |
| `subtotal` | decimal textual | Valor backend |

### QuoteDraft (ADMIN)

- Para cotización de servicio: `kind` permitido por ruta y `lines[]` con `spare_part_id`, `quantity`; ticket/customer se heredan del detalle seleccionado.
- Para venta directa: customer seleccionado, una o más líneas de artículo, observaciones opcionales y fecha de vencimiento requerida.
- El precio y el total final llegan del backend; el borrador puede presentar estimaciones solo cuando provienen del catálogo, claramente sin confirmar.

## PaymentSummary

| Campo | Tipo | Regla / presentación |
|---|---|---|
| `id` | entero positivo | ID backend |
| `quote_id` | entero positivo nullable | Cotización a la que corresponde |
| `status` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED` | Independiente del estado de oferta |
| `amount` | decimal textual | Presentado sin convertir a float |
| `payment_method` | código nullable | Etiqueta español, valor backend sin alterar |
| `transaction_reference` | texto nullable | Visible solo según acceso y respuesta |
| `confirmed_at` | fecha/hora nullable | Solo existe tras confirmación |

ADMIN confirma un cobro externo con método/referencia disponible; el cliente no ejecuta esta transición desde su vista.

## SalesOrder

| Campo | Tipo | Regla / presentación |
|---|---|---|
| `id` | entero positivo | Clave de venta backend |
| `customer_id` | entero positivo | Propiedad comercial |
| `quote_id` | entero positivo | Cotización de venta fuente |
| `payment_id` | entero positivo | Pago confirmado |
| `status` | `PAID`, `PREPARING`, `FULFILLED`, `CANCELLED` | Estado de pedido, separado de oferta y pago |
| `total_amount` | decimal textual | Importe confirmado |
| `created_at` | fecha/hora | Fecha de registro |
| `lines[]` | snapshots | Artículos/precios históricos devueltos por detalle |

## Transiciones de pantalla

```text
Oferta de venta PENDING
  ├─ aceptación válida con reserva completa → ACCEPTED + pago PENDING
  ├─ falta de stock / vencida → error recuperable, sin aceptación local
  └─ rechazada / cancelada / vencida → estado terminal y reserva liberada por backend

Pago PENDING
  ├─ confirmación ADMIN → COMPLETED + venta creada por backend
  └─ rechazo/error de confirmación → estado confirmado por backend; sin venta ficticia
```

El frontend nunca ejecuta ni simula las transiciones de stock, pago o venta.
