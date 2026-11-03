# Modelo de datos frontend: Compras a proveedores

Este documento describe proyecciones de pantalla y borradores del frontend. El contrato canónico sigue siendo `Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml`.

## SupplierSummary / SupplierDraft

| Campo | Tipo frontend | Regla/presentación |
|---|---|---|
| `id` | entero | Clave backend |
| `name` | texto | Requerido; razón social |
| `tax_id` | texto nullable | Identificador tributario |
| `contact_name` | texto nullable | Contacto |
| `contact_email` | texto nullable | Correo |
| `phone` | texto nullable | Teléfono |
| `address` | texto nullable | Dirección |
| `delivery_lead_days` | entero nullable | >= 0 |
| `active` | booleano | Desactivación lógica; solo activos en alta de compra |

## PurchaseSummary / PurchaseDetail

La lista conserva solo valores resumidos. El detalle se carga al abrir una compra.

| Campo | Tipo frontend | Regla/presentación |
|---|---|---|
| `id` | entero | Identificador |
| `supplier_id`, `supplier_name`, `supplier_tax_id` | entero/texto | Snapshot visible |
| `purchase_order_id` | entero nullable | En frontend permanece vacío hasta disponer de consulta de órdenes |
| `document_type`, `document_series`, `document_number` | texto | Identificación del comprobante |
| `issue_date`, `due_date` | fecha / fecha nullable | Mostrar con formato local sin cambiar el valor enviado |
| `currency` | `PEN` | Formatear como S/ |
| `subtotal`, `tax_total`, `discount_total`, `other_charges`, `total_amount` | cadena decimal de dos posiciones | Convertir a/desde céntimos, no a `float` para operar |
| `payment_method` | enum | `TRANSFER`, `CASH`, `CARD`, `OTHER`, con etiquetas en español |
| `payment_status` | `PENDING` / `PAID` | Etiquetas “Pendiente” / “Pagada” |
| `status` | enum de compra | Etiquetas traducidas sin alterar el código del backend |
| `notes` | texto nullable | Editable si el backend permite el cambio |
| `created_by`, `responsible_name`, `created_at`, `updated_at` | id/texto/fechas | Solo lectura y trazabilidad |
| `items[]` | `PurchaseLine` | Inmutable en frontend después de crear |
| `receipts[]` | `Receipt` | Eventos de recepción confirmados |
| `audit_events[]` | evento | Actor, fecha, tipo y campos disponibles |

## PurchaseLineDraft / PurchaseLine

| Campo | Tipo frontend | Regla |
|---|---|---|
| `spare_part_id` | entero nullable | Requiere ID estable del backend inventario; no usar SKU como sustituto |
| `code_snapshot` | texto nullable | Solo lectura de catálogo cuando haya vínculo |
| `description` | texto | 1–300 caracteres, snapshot de compra |
| `quantity` | decimal serializado | > 0; hasta 3 decimales; para stock vinculada el backend solo acepta cantidades enteras en la recepción |
| `unit_cost` | cadena monetaria | >= 0, dos posiciones; costo de compra, no precio de venta |
| `discount_amount`, `tax_amount`, `line_total` | cadena monetaria | Dos posiciones; `line_total` viene confirmado en detalle |

## Receipt / ReceiptDraft

| Campo | Tipo frontend | Regla |
|---|---|---|
| `purchase_id` | entero | Compra origen |
| `received_at`, `received_by` | fecha/hora e ID | Solo backend |
| `idempotency_key` | UUID de solicitud, fuera del cuerpo | Se conserva al reintentar la misma solicitud sin confirmar |
| `items[]` | línea y `quantity_received` | Cantidad > 0, no exceder cantidad pendiente; producto stockable requiere entero |
| `movement` | snapshot nullable | El detalle del backend muestra stock antes/después y producto; solo aparece para líneas ligadas al catálogo |

## Estados de interfaz

```text
Compra: REGISTERED → PARTIALLY_RECEIVED → RECEIVED
                    REGISTERED → RECEIVED
Compra sin recepciones: REGISTERED → CANCELLED
Pago: PENDING → PAID

Lectura: idle → loading → ready | empty | error | unconfigured
Escritura: editing → submitting → confirmed | validation-error | conflict | retryable-error
```

Los estados de pago y recepción son independientes. El frontend nunca transiciona el estado de stock por optimismo: recarga detalle y lista después de que el backend confirma.

## Datos de formulario y cálculos

- El borrador contiene solo los campos editables que acepta `PurchaseWrite`; no solicita `total_amount`, actor ni responsable.
- El importe por línea replica el redondeo monetario requerido para mostrar una previsualización; el total persistido se toma de la respuesta backend.
- Registrar compra no reserva ni suma stock. La operación de recepción usa IDs de líneas de compra que devuelve el backend, no IDs de producto enviados libremente por el cliente.
- Una línea libre no recibe un selector de stock ni muestra un movimiento de inventario.
