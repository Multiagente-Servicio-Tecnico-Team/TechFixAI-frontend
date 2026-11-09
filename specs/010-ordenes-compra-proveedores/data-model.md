# Modelos de presentacion: Ordenes de compra

El frontend no crea un modelo persistente paralelo. Estos modelos representan datos recibidos del backend y datos temporales de formularios.

## PurchaseOrderSummary

Fuente: `OrderSummary` del contrato backend 010.

| Campo | Uso en interfaz | Regla |
|---|---|---|
| `id` | Identidad de ruta y acciones | ID del backend; no reemplazar por nombre o SKU |
| `supplier_id`, `supplier_name` | Filtro, lista y detalle | Mostrar snapshot/nombre del backend |
| `status` | Badge y acciones disponibles | Traducir con el mapa de estados; no recalcular |
| `total_amount`, `currency` | Importe en lista y detalle | Usar valor backend y formatear PEN |
| `estimated_arrival`, `created_at` | Fechas | Diferenciar estimada de fecha de creacion |

## PurchaseOrderDetail y OrderLine

Fuente: `Order` y `OrderLine` del contrato backend 010. Incluye cabecera, lineas, recepciones, comprobantes vinculados e historial de auditoria.

| Campo de linea | Presentacion |
|---|---|
| `id` | Identificador de linea para mapeo de recepcion/factura |
| `spare_part_id` | Si tiene valor, linea de inventario; null indica concepto libre |
| `code_snapshot`, `description_snapshot` | Descripcion historica; no reemplazar con datos actuales del catalogo |
| `quantity_ordered` | Cantidad solicitada; input de orden entero |
| `quantity_received` | Cantidad acumulada confirmada por recepciones |
| `quantity_pending` | Saldo confirmado por backend |
| `quantity_invoiced` | Cantidad explicitamente conciliada; null se muestra "Sin conciliar" |
| `quantity_cancelled` | Saldo cancelado, sin revertir cantidades ya recibidas |
| `unit_cost`, `subtotal` | Importes monetarios del backend |

## Order status presentation

| Codigo | Etiqueta visible | Acciones basadas en estado |
|---|---|---|
| `DRAFT` | Borrador | Editar, emitir o cancelar si el backend lo permite |
| `ISSUED` | Emitida | Recibir o cancelar saldo si el backend lo permite |
| `PARTIALLY_RECEIVED` | Recepcion parcial | Recibir saldo o cancelar saldo si el backend lo permite |
| `RECEIVED` | Recibida | Consultar; sin edicion ni recepcion adicional |
| `CANCELLED` | Cancelada | Consultar; conservar las recepciones anteriores |

Las acciones solo aparecen cuando el estado permite la operacion y el backend confirma el resultado. Un conflicto actualiza el recurso y deja claro que la accion no se completo.

## OrderDraft

Estado temporal para alta/edicion. Campos enviados: `supplier_id`, `estimated_arrival`, `notes`, `items[]`. Cada linea tiene `spare_part_id` nullable, `description`, `quantity` entera positiva y `unit_cost` decimal en formato monetario. El ID de catalogo se toma de `inventoryApi`; concepto libre no se identifica como repuesto.

## OrderReceiptDraft and OrderReceipt

El borrador incluye `purchase_order_item_id`, `quantity_received` positiva entera por cada linea que se recibe y notas opcionales. Antes del envio se presenta revision. El resultado autoritativo es `OrderReceipt`, con fecha, responsable, lineas y movimiento nullable. Un movimiento nulo para linea libre se representa como recepcion registrada sin cambio de inventario.

La clave UUID de idempotencia pertenece al intento de envio, no a la orden como tal. Se mantiene para reintentar el mismo intento incierto y se descarta al terminarlo o cuando ADMIN comienza una recepcion nueva tras consultar el estado.

## SupplierPurchase association

El comprobante existente conserva sus propios importes, metodo y estado de pago. En el alta opcional se envia `purchase_order_id`; cada linea asociada puede enviar `purchase_order_item_id`. Solo se permite elegir lineas de la orden elegida. Un comprobante no vinculado mantiene el flujo actual. El vinculo no representa una recepcion ni un pago confirmado.
