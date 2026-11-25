# Research: Catálogo contable y reportes

## Decision: Reutilizar el cliente API de Contabilidad

**Rationale**: `src/features/accounting/accountingApi.js` ya concentra la URL base, `credentials: include`, errores de sesión/permisos y operaciones de asientos. Añadir ahí planes, cuentas, periodos, auditoría e informes mantiene el mismo tratamiento de autenticación y evita solicitudes directas desde componentes.

**Alternatives considered**: Crear un cliente separado para cada pantalla; rechazado porque duplicaría la construcción de URL, sesión, errores y configuración que hoy pertenece a Contabilidad.

## Decision: Mantener una sola fuente contractual: OpenAPI backend

**Rationale**: El contrato canónico está en `../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/009-catalogo-cuentas-consultas-contables/contracts/accounting-catalog.openapi.yaml`. El contrato UI del feature explica la traducción de esas operaciones a vistas, sin copiar esquemas HTTP que puedan divergir.

**Alternatives considered**: Duplicar OpenAPI en el repositorio frontend; rechazado porque la fuente de verdad del API es backend y ambos repositorios se planifican por separado.

## Decision: Buscar y paginar cuentas en backend

**Rationale**: El plan inicial contiene 1,192 cuentas y la API permite filtros por texto, padre, estado e imputabilidad con páginas de hasta 100. La carga local de todo el catálogo aumenta transferencia y memoria y vuelve obsoletos los resultados de búsqueda.

**Alternatives considered**: Descargar todas las cuentas una sola vez; rechazado por tamaño, paginación contractual y riesgo de seleccionar cuentas desactualizadas.

## Decision: Conservar snapshots históricos; no vincular por texto

**Rationale**: Las líneas viejas pueden llegar con `account_id: null` y `legacy_unlinked: true`. El código/nombre guardado en ese asiento es dato histórico y la igualdad textual no prueba que corresponda a una cuenta nueva.

**Alternatives considered**: Vincular automáticamente por código o nombre; rechazado porque produciría una relación contable no confirmada y puede alterar cómo se entiende el historial.

## Decision: Manejar las exportaciones como respuestas binarias del backend

**Rationale**: Los endpoints generan CSV/XLSX de todas las filas del filtro, ignoran `limit/offset` y devuelven JSON cuando hay error (incluye 413 al superar 10,000 filas). El helper actual siempre parsea JSON, por lo que el cliente deberá separar `format=json` de `format=csv|xlsx`, validar el tipo/respuesta y descargar solo después de confirmar éxito.

**Alternatives considered**: Construir los informes con las filas visibles y exportarlos en navegador; rechazado porque sería incompleto y no incluiría filas fuera de la página actual.

## Decision: Reutilizar rutas ADMIN y componentes visuales existentes

**Rationale**: `/taller/contabilidad` y sus pantallas ya están protegidas por `RequireRole` para ADMIN. El repositorio ofrece patrones compartidos para paginación, alertas, campos, confirmaciones, navegación del taller, temas y descargas. La verificación de rol en frontend mejora navegación, mientras la autorización efectiva sigue en backend.

**Alternatives considered**: Crear un layout de contabilidad distinto o confiar solo en ocultar el enlace; rechazado porque fragmentaría el diseño y no sustituye la protección de rutas/API.

## Decision: Respetar formato decimal del API y evitar aritmética binaria

**Rationale**: La API expresa cantidades financieras como strings decimales. La lógica existente representa importes en centavos con `BigInt`; la interfaz debe mantener precisión y renderizar los totales del reporte tal como los confirma backend.

**Alternatives considered**: Convertir los decimales a `Number` para sumar o formatear; rechazado por riesgo de redondeo y por la regla de exactitud financiera.

## Fuentes inspeccionadas

- `AGENTS.md`, `memory.md`, `features.md` y `docs.md` del frontend.
- `src/features/accounting/accountingApi.js`, `AccountingList.jsx`, `AccountingCreate.jsx`, `EntryLinesEditor.jsx` y `src/domain/accounting.js`.
- `src/app/App.jsx`, `src/app/layouts/StaffLayout.jsx` y los componentes compartidos de `src/shared/ui/`.
- `src/features/purchases/purchasesApi.js`, `src/features/workshop/inventoryApi.js`, `InventoryMovements.jsx`, `SupplierList.jsx` y `Workshop.jsx` para patrones de búsqueda, paginación, recuperación y descargas.
- OpenAPI backend `specs/009-catalogo-cuentas-consultas-contables/contracts/accounting-catalog.openapi.yaml`.

No se encontraron decisiones pendientes que requieran una aclaración de negocio para esta fase de planificación.
