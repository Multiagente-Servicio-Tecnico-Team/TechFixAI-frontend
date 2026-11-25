# Modelo de datos de interfaz

El frontend no es dueño del estado contable ni persiste registros nuevos localmente. Estos modelos describen recursos que llegan desde el contrato backend y el estado de presentación necesario para operarlos.

## Recursos del backend representados en la UI

### Plan contable

- `id`, `code`, `name`, `edition`, `jurisdiction`, `source`.
- Vigencia, `status` y `is_default` según el schema `AccountingPlan`.
- Relaciones: tiene cuentas; puede ser elegido como predeterminado; los asientos nuevos guardan su plan.
- Validación UI: el cambio de predeterminado requiere acción explícita y respuesta confirmada del backend.

### Cuenta contable

- `id`, `plan_id`, `code`, `name`, `parent_id`, `parent_name`, `account_group`.
- `normal_balance` (`DEBIT`/`CREDIT`), `is_postable`, `status`, `effective_from`, `effective_to`, `created_at`.
- Relaciones: pertenece a un plan; puede tener cuenta padre/hijas; puede ser referenciada por líneas contables.
- Validación UI para líneas: pertenecer al plan elegido, estar activa, ser imputable y estar vigente en `operation_date`. El servidor repite la validación.
- Ciclo de vida: crear, actualizar o desactivar. No hay borrado físico desde la interfaz.

### Asiento y línea contable

- El asiento conserva sus campos actuales, suma `plan_id` y `accounting_plan` cuando esté enlazado al catálogo.
- Las líneas nuevas envían `account_id`; el servidor devuelve `account_code` y `account_name` como snapshots confirmados.
- Las líneas históricas pueden tener `account_id: null` y `legacy_unlinked: true`. La UI presenta su snapshot como histórico/no vinculado y no lo convierte en una cuenta del catálogo.
- El selector remoto debe guardar el ID elegido y mostrar código/nombre de la cuenta. Al elegir cuenta, precompleta la descripción de línea con `parent_name`, o con `name` si la cuenta no tiene padre; el texto sigue siendo editable. Cambiar `plan_id` limpia las cuentas escogidas, no los importes ni descripciones de línea.

### Periodo contable mensual

- Clave de vista: (`year`, `month`); estado `OPEN` o `CLOSED`.
- `last_transition_at`, `last_transition_by` y `last_reason` pueden ser nulos según el recurso.
- Estados de pantalla: consultando, abierto, cerrado, acción pendiente, actualizado o error.
- Transiciones autorizadas por API: cerrar un mes abierto sin body; reabrir un mes cerrado con `reason` obligatorio. Los eventos de transición muestran actor, timestamp, acción y motivo.
- Si el backend no ha creado/listado un periodo, no inferir estado abierto; la respuesta del backend es la fuente de verdad.

### Evento de auditoría

- `id`, `entity_type`, `entity_id`, `action`, `actor_user_id`, `occurred_at`, `prior_state`, `new_state`, `reason`.
- Se representa en orden del API, con paginación; los objetos previos/nuevos se muestran como datos auditables, sin editarlos.

### Reporte contable

- Parámetros comunes: `from_date`, `to_date`, `status`, `format`; JSON además usa `limit` y `offset`.
- Diario y balance de comprobación pueden filtrar por `plan_id`; mayor filtra por `account_id` o por la pareja snapshot `account_code` + `account_name`.
- Respuesta JSON: `report`, fechas, filtros, `items`, `total`, `totals`, `limit`, `offset`.
- CSV/XLSX son archivos completos del filtro, no solo de la página. Un error JSON (incluido HTTP 413) no debe guardarse como archivo.
- La forma de cada fila depende del reporte; el frontend muestra los campos definidos por el contrato, presenta totales del API y no recalcula resultados.

## Estado de interfaz local

- **Filtros aplicados**: valores que definen una consulta; se conservan al paginar y exportar.
- **Filtros editados**: borrador del formulario; solo se vuelve consulta al aplicar.
- **Página**: `limit`, `offset`, `total`; al cambiar filtros se restablece `offset` a cero.
- **Carga**: bloquea duplicar la acción actual y conserva los filtros visibles.
- **Vacío**: respuesta exitosa sin coincidencias, diferente de error.
- **Error**: mantiene criterios de búsqueda, muestra mensaje seguro y ofrece reintento cuando proceda.
- **Confirmación de transición**: periodo/acción y efecto visible antes de cierre o reapertura; reapertura no se envía sin motivo.
- **Descarga**: formato y nombre de archivo local; el contenido descargado lo genera la API.

## Relaciones resumidas

```text
Plan 1 ─── N Cuenta
Plan 1 ─── N Asiento nuevo
Asiento 1 ─── N Línea ─── 0..1 Cuenta (null para líneas históricas)
Periodo mensual 1 ─── N Eventos de transición
Plan/Cuenta/Periodo ─── N eventos de auditoría
Filtros + fechas ─── Reporte (diario | mayor | balance)
```

Las entidades, restricciones y transacciones persistentes están definidas por el backend. Este documento no propone tablas ni migraciones frontend.
