# Contrato del cliente frontend de Compras

El contrato HTTP canónico está en `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml`. Este documento define únicamente la interacción que el módulo frontend necesita; no reemplaza ni replica ese OpenAPI.

## Sesión y configuración

- Base configurable `VITE_API_URL`, resuelta con `src/shared/api/baseUrl.js`; en producción usar fallback same-origin `/backend`.
- Todas las peticiones deben enviar `credentials: "include"`; la cookie de sesión es HttpOnly y el frontend no la lee.
- No inventar un modo de compras mock si la URL falta: el cliente informa `unconfigured` y la interfaz muestra estado de servicio sin datos ni acciones de escritura.
- La protección cliente exige ADMIN y backend vuelve a validar cada ruta.

## Operaciones usadas por la sección

| Acción UI | Operación backend | Notas |
|---|---|---|
| Cargar proveedores | `GET /api/admin/suppliers?active=true&search=&limit=&offset=` | Selección de nuevas compras solo con activos |
| Crear/actualizar proveedor | `POST /api/admin/suppliers`, `PATCH /api/admin/suppliers/{supplier_id}` | Desactivación mediante `active=false`; no DELETE |
| Listar compras | `GET /api/admin/purchases` | `supplier_id`, `from_date`, `to_date`, `status`, `payment_status`, `document_number`, `limit`, `offset` |
| Registrar compra | `POST /api/admin/purchases` | Retorna `{purchase}`; estado de recepción inicial `REGISTERED`; no aumenta stock |
| Abrir detalle | `GET /api/admin/purchases/{purchase_id}` | Retorna snapshots, líneas, recepciones, movimientos e historial |
| Editar notas/marcar pagada | `PATCH /api/admin/purchases/{purchase_id}` | Solo cambios aceptados; pago permite `PENDING → PAID` |
| Cancelar compra | `POST /api/admin/purchases/{purchase_id}/cancel` | Conflicto si ya existen recepciones |
| Confirmar recepción parcial/completa | `POST /api/admin/purchases/{purchase_id}/receipts` | Requiere `Idempotency-Key: <UUID>`; replay idéntico retorna 200 |
| Recargar recepciones | `GET /api/admin/purchases/{purchase_id}/receipts` | Recarga el detalle luego de confirmar |
| Buscar catálogo | `GET /api/inventory/parts` | Sesión de personal; el `id` numérico estable se envía como `spare_part_id`, mientras `code` es solo el SKU visible |

## Identidad de inventario

El contrato `specs/005-api-inventario/contracts/inventory.openapi.yaml` y `app/domain/inventory.py::part_to_dict` exponen `id`, el identificador numérico estable de `spare_parts.id`. `PurchaseLineWrite.spare_part_id` recibe ese entero para conectar la compra al repuesto y aplicar stock cuando se recibe.

El frontend debe conservar el `id` del artículo seleccionado y enviarlo sin transformación como `spare_part_id`. No convertir `code`/SKU a número ni enviar `null` para simular un vínculo. Las líneas libres `spare_part_id: null` se pueden usar solo si el negocio permite explícitamente una compra no inventariable; no son un fallback para registrar repuestos del catálogo.

## Campos de registro

`PurchaseWrite` incluye proveedor, documento, fechas, método/estado de pago, cargos, notas y líneas. Cada línea contiene `spare_part_id` nullable, descripción, cantidad, `unit_cost`, descuento e impuesto. Los importes viajan como cadenas con dos decimales. No enviar total ni actor; backend calcula importes y usa ADMIN autenticado.

## Estados/errores para la interfaz

| HTTP | Comportamiento del cliente |
|---|---|
| 401 | Limpiar resultados sensibles y redirigir al acceso del taller, guardando retorno a la ruta de compra |
| 403 | Mantener vista sin datos y mostrar denegación contextual de Compras |
| 404 | Indicar que la compra/proveedor dejó de estar disponible y permitir volver al listado |
| 409 | Mostrar conflicto específico: duplicado, recepción excedida, cancelación no permitida o clave idempotente reutilizada; no descartar el borrador |
| 422 | Asociar errores a campos/líneas cuando `field` esté presente; mantener datos corregibles |
| 5xx / error de red | Mensaje genérico recuperable, sin mostrar detalles SQL ni afirmar éxito |

Al perder la respuesta de recepción, reintentar el mismo payload con la misma UUID hasta recuperar la respuesta. Si el usuario modifica cantidades, generar una clave nueva para esa nueva operación.
