# Contrato de consumo frontend: Ordenes de compra

## Limite de confianza y convenciones

- Usar el cliente de Compras y la URL base actual; incluir cookie de sesion con cada solicitud.
- Las vistas de ordenes son solo para ADMIN. El backend siempre vuelve a validar la sesion y el rol.
- El OpenAPI backend 010 es la fuente de verdad para esquema y respuestas: `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/010-ordenes-compra-proveedores/contracts/purchase-orders.openapi.yaml`.
- El OpenAPI backend 006 es la fuente de verdad para comprobantes: `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml`.
- Las pantallas no ejecutan solicitudes HTTP directamente. El cliente normaliza errores igual que las operaciones de compra existentes.
- Nunca actualizar stock, estados, cantidades recibidas o totales en forma optimista.

## Mapa de operaciones

| Flujo de interfaz | Operacion backend | Parametros/datos importantes | Resultado que debe consultarse |
|---|---|---|---|
| Lista y filtros | `GET /api/admin/purchase-orders` | `supplier_id`, `status`, `date_from`, `date_to`, `limit`, `offset` | `items`, `total`, `limit`, `offset` |
| Crear borrador | `POST /api/admin/purchase-orders` | `OrderWrite`; minimo una linea; `spare_part_id` numerico para catalogo | `order` en estado `DRAFT` |
| Ver detalle | `GET /api/admin/purchase-orders/{order_id}` | ID de orden | Orden, lineas, recepciones, comprobantes e historial |
| Editar borrador | `PATCH /api/admin/purchase-orders/{order_id}` | Solo `DRAFT`; campos a cambiar | Orden devuelta y total recalculado |
| Emitir | `POST /api/admin/purchase-orders/{order_id}/issue` | Sin cuerpo | Estado/fecha/actor confirmados por el backend |
| Cancelar | `POST /api/admin/purchase-orders/{order_id}/cancel` | `{ "reason": "..." }`, obligatorio | Estado cancelado, motivo y cantidades preservadas |
| Historial de recepciones | `GET /api/admin/purchase-orders/{order_id}/receipts` | ID de orden | `items` de recepcion |
| Recibir | `POST /api/admin/purchase-orders/{order_id}/receipts` | Header `Idempotency-Key: <UUID>`; items con `purchase_order_item_id` y `quantity_received` entero positivo | `receipt`; si se repite la operacion, respuesta replay `Idempotent-Replayed: true` |
| Crear comprobante vinculado | `POST /api/admin/purchases` | `purchase_order_id` opcional y `purchase_order_item_id` por linea opcional | Comprobante guardado y vinculo visible en detalle |
| Ver comprobante | `GET /api/admin/purchases/{purchase_id}` | ID de comprobante | Comprobante y orden asociada, si existe |

La lista de ordenes puede solicitar 20 resultados por pagina y no exceder el maximo de 100 permitido por el backend. Para filtros de fechas usar los nombres `date_from` y `date_to` (distintos de los filtros del listado de comprobantes).

## Validacion de formularios

- Antes de guardar, exigir proveedor activo y al menos una linea completa.
- Una linea de catalogo envia el ID numerico de inventario, descripcion, cantidad entera positiva y costo decimal. Una linea libre envia `spare_part_id: null`.
- El detalle toma snapshots, cantidades y totales del servidor. `quantity_invoiced: null` se muestra como "Sin conciliar".
- Para comprobante asociado, fijar o verificar el mismo proveedor que la orden; para cada linea solo ofrecer lineas de esa orden. Permitir que una linea quede sin mapear.
- No habilitar asociacion retroactiva ni recepcion de una factura vinculada a orden.

## Errores y recuperacion

| Respuesta | Comportamiento de UI |
|---|---|
| `401` | Redirigir a acceso ADMIN conservando la ruta de retorno |
| `403` | Mostrar acceso restringido; no mostrar datos de orden |
| `404` | Informar que orden/proveedor/repuesto ya no existe y permitir volver a lista |
| `409` | Mantener formulario, refrescar el recurso y explicar el conflicto |
| `422` | Mantener campos y asociar errores a su campo cuando el backend lo indique |
| `503` o error de red | Mostrar mensaje generico, no simular exito ni limpiar cambios |

Para un timeout durante una recepcion, conservar la misma clave idempotente al reintentar. Si se abandona la duda consultando el detalle/historial, no crear otra recepcion hasta que el resultado quede claro.
