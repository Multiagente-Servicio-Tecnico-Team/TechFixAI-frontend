# Data Model: Asientos contables en la interfaz

Este modelo describe los datos que consume y presenta la UI. La persistencia y la identidad contable pertenecen al backend; el contrato canónico es `accounting.openapi.yaml` en el repositorio backend.

## AccountingCategory

Opción activa para crear un nuevo asiento; la categoría histórica recibida dentro de un registro puede mostrarse aunque ya no se ofrezca para altas nuevas.

| Campo | Tipo UI | Uso |
|---|---|---|
| `id` | entero positivo | Enviar selección de categoría. |
| `code` | cadena | Identidad/etiqueta secundaria si la vista lo necesita. |
| `name` | cadena | Etiqueta principal del selector/listado. |
| `description` | cadena opcional | Ayuda al elegir categoría. |

## AccountingEntrySummary

Registro para filas de lista y encabezado resumido del detalle.

| Campo | Representación | Presentación |
|---|---|---|
| `id` | entero positivo | Identificador de consulta/navegación; no se presenta como correlativo. |
| `entry_number` | cadena decimal positiva | Correlativo visible, conservado como cadena. |
| `operation_date` | fecha ISO `YYYY-MM-DD` | Fecha de la operación. |
| `concept` | cadena | Glosa principal. |
| `category` | `AccountingCategory` | Categoría. |
| `currency` | constante `PEN` | Etiqueta soles/PEN. |
| `debit_total`, `credit_total`, `amount` | cadenas con dos decimales | Importes exactos; `amount` es resumen. |
| `status` | `CONFIRMED` o `REVERSED` | Etiqueta española con texto e icono/estilo de estado. |
| `responsible` | `Responsible` | Nombre visible del actor que registró. |
| `created_at`, `updated_at` | fecha/hora ISO | Trazabilidad de registro/actualización. |
| `reversal_of_entry_id`, `reversal_entry_id` | entero positivo o nulo | Vínculos para navegación entre original y reversa. |

## AccountingEntry

Resumen más `detail`, `lines`, `audit_events` y `reversed_at`.

### EntryLine

| Campo | Representación | Regla de vista |
|---|---|---|
| `line_number` | entero positivo | Orden ascendente. |
| `account_code` | cadena, 1–40 | Snapshot; no implica validación PCGE. |
| `account_name` | cadena, 1–200 | Nombre introducido. |
| `description` | cadena opcional, hasta 1000 | Detalle opcional. |
| `debit`, `credit` | cadenas PEN con dos decimales | Exactamente uno es mayor que cero; total del debe igual al haber. |

### Responsible

`user_id` identifica el actor del backend; `display_name` es el único valor de identidad que se presenta en la pantalla.

### AuditEvent

`event_type`, `actor`, `related_entry_id`, `reason`, `created_at`. La pantalla traduce `ENTRY_CREATED`, `ENTRY_REVERSED` y `REVERSAL_CREATED` a etiquetas en español y ordena cronológicamente conforme al contrato.

## CreateAccountingEntry form state

Estado transitorio de la página; no se persiste en `sessionStorage`, `localStorage` ni URL.

| Campo | Regla |
|---|---|
| `operation_date` | Fecha requerida. |
| `concept` | Requerido, máximo 200 caracteres. |
| `detail` | Requerido, máximo 4000 caracteres. |
| `category_id` | Categoría activa seleccionada. |
| `lines[]` | 2–100 renglones. Código 1–40, nombre 1–200, descripción opcional hasta 1000. |
| `debit`, `credit` | Entrada decimal no negativa, dos decimales, máximo 12 dígitos enteros; exactamente un lado positivo por línea. |
| Totales locales | Sumas exactas representadas como céntimos `BigInt`; deben coincidir y ser mayores a cero. |
| `idempotency_key` | UUID generada para el intento; misma clave y carga para replay; nueva clave al cambiar la carga. Se mantiene solo en memoria. |

## ReverseAccountingEntry form state

`operation_date` y `reason` obligatorios; `reason` máximo 2000 caracteres. Solo se ofrece para original `CONFIRMED` sin `reversal_entry_id`. No se captura importe: backend crea el asiento inverso intercambiando debe y haber.

## State transitions

```text
Alta local: editing -> reviewing -> submitting -> created (CONFIRMED)
                                   \-> recoverable error -> retry same payload/key
Original confirmado: CONFIRMED -> REVERSED (solo luego de reversión backend exitosa)
Reversa: pending confirmation -> submitting -> new CONFIRMED reversal
```

No hay estado de borrador persistido, edición ni borrado. Un conflicto en reversión refresca el original/detalle en vez de simular éxito.
