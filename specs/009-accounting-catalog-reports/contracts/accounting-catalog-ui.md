# Contrato de consumo UI: catálogo y reportes contables

El contrato HTTP canónico vive en el repositorio backend: [`accounting-catalog.openapi.yaml`](../../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/009-catalogo-cuentas-consultas-contables/contracts/accounting-catalog.openapi.yaml). Este documento define cómo la experiencia del frontend debe usarlo, sin duplicar esquemas.

## Navegación y acceso

- Reutilizar la zona `/taller/contabilidad` y la navegación de ADMIN existentes.
- Mantener rutas de asientos y sumar vistas de planes/cuentas, periodos e informes dentro de Contabilidad.
- CUSTOMER y TECHNICIAN no deben ver el acceso ni poder consultar esas vistas directamente.
- Si el backend responde sesión vencida, volver al acceso del personal y no conservar datos contables en pantalla.

## Capacidades y operaciones del backend

| Experiencia | Operaciones canónicas | Resultado esperado en la interfaz |
|---|---|---|
| Planes | `GET/POST /api/admin/accounting/plans`, `PUT /api/admin/accounting/plans/{plan_id}/default` | Mostrar metadatos, indicar el predeterminado y confirmar creación/cambio de predeterminado. |
| Cuentas | `GET/POST /api/admin/accounting/plans/{plan_id}/accounts`, `PATCH /api/admin/accounting/accounts/{account_id}` | Buscar y paginar cuentas por plan; crear o actualizar atributos permitidos; desactivar en vez de borrar. |
| Asientos | `POST /api/admin/accounting/entries`, `GET /entries`, `GET /entries/{id}`, `POST /entries/{id}/reverse`, bajo `/api/admin/accounting` | Enviar `plan_id` y `account_id` por línea; mostrar código/nombre devueltos como snapshot del backend. |
| Periodos | `GET /api/admin/accounting/periods`, `POST /periods/{year}/{month}/close`, `POST /periods/{year}/{month}/reopen`, `GET /periods/{year}/{month}/events` | Mostrar estado y auditoría paginada; reabrir solo con motivo; confirmar acciones antes de enviarlas. |
| Diario | `GET /api/admin/accounting/reports/journal` | JSON paginado o archivo CSV/XLSX con rango, plan y estado opcionales. |
| Mayor | `GET /api/admin/accounting/reports/ledger` | JSON paginado o archivo CSV/XLSX por `account_id`; para una línea histórica no vinculada, usar la pareja exacta `account_code` + `account_name`. |
| Balance de comprobación | `GET /api/admin/accounting/reports/trial-balance` | JSON paginado o archivo CSV/XLSX con rango, plan y estado opcionales. |
| Auditoría de catálogo | `GET /api/admin/accounting/audit-events` | Mostrar actor, fecha, acción, estado anterior/nuevo y motivo con filtros/paginación. |

Todas las solicitudes requieren `credentials: include`. El cliente no lee ni guarda la cookie. Para CSV/XLSX se debe tratar el cuerpo exitoso como archivo y los errores como JSON; las exportaciones ignoran la paginación JSON, incluyen filtros y respetan el límite backend de 10,000 filas.

## Reglas visuales y estados

- Reutilizar patrones Banco, tokens, componentes compartidos, mensajes `FormAlert`, diálogo de confirmación, paginación y diseño adaptable existentes.
- Para catálogo, mostrar indicador de carga, sin resultados, error con reintento y resultados paginados; las cuentas deben mostrar código, nombre, jerarquía, saldo normal, estado, vigencia e imputabilidad.
- El selector de línea ofrece solo cuentas activas/imputables vigentes para fecha y plan seleccionados. Al cambiar de plan, requiere volver a elegir cuentas.
- Detalle histórico: `account_id: null` o `legacy_unlinked: true` se representa como cuenta histórica no vinculada, conservando el snapshot.
- Periodos: representar explícitamente abierto/cerrado y obtener eventos por páginas; requerir confirmación de cierre y motivo de reapertura.
- Reportes: mantener filtros al paginar; al exportar deshabilitar doble acción mientras se recibe el archivo y conservar filtros/resumen visibles.
- Un error `413` explica que se reduzca el rango o se añadan filtros; no se genera ni descarga un archivo parcial.
- Un `409` de periodo o cuenta informa el conflicto y permite actualizar el estado; un asiento no se presenta como registrado si la escritura fue rechazada.
- No simular datos financieros cuando la API no esté configurada o disponible.

## Filtros disponibles

- Diario: `from_date`, `to_date`, `plan_id`, `status`, `format`, `limit`, `offset`.
- Mayor: `from_date`, `to_date`, `account_id` o el par histórico exacto `account_code` y `account_name`, `status`, `format`, `limit`, `offset`.
- Balance de comprobación: `from_date`, `to_date`, `plan_id`, `status`, `format`, `limit`, `offset`.
- Periodos: `from_period`, `to_period`, `status`, `limit`, `offset`.
- Eventos de auditoría: `entity_type`, `from_at`, `to_at`, `limit`, `offset`.

## No incluido

- Edición/borrado de asientos, borrado físico de cuentas, aprobación de asientos, contabilización automática de pagos, PLE/SUNAT y datos de demostración.
