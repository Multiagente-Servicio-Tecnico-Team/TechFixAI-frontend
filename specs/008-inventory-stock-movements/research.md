# Research: Movimientos de stock del inventario

## D1. Extender el cliente de inventario existente

**Decision**: Mantener `src/features/workshop/inventoryApi.js` como único adaptador HTTP de inventario; añadir operaciones de apertura, ajuste e historial ahí, y dejar que los componentes consuman el cliente existente.

**Rationale**: El cliente ya resuelve URL local/proxy, incluye la cookie de sesión, valida respuestas CRUD y conserva `spare_parts.id` como `part.id`. La pantalla y formularios ya consumen `useInventory.js`; un cliente paralelo duplicaría permisos, errores y configuración.

**Alternatives considered**: Crear un módulo API separado para movimientos; se descarta porque comparte raíz, sesión, errores, entidades y límites con el cliente de inventario.

## D2. Mantener la UI en sincronía solo después de respuesta confirmada

**Decision**: Conservar el patrón actual de modificar el store solo después de respuesta exitosa. Para un nuevo artículo con saldo inicial positivo, crear primero el artículo en cero y luego registrar la apertura; si falla la segunda llamada, mostrar el artículo como existente con saldo cero y permitir reintentar la apertura sin volver a crear el SKU.

**Rationale**: El backend ofrece dos operaciones separadas y no una transacción HTTP combinada. El cliente no debe presentar el conteo inicial como confirmado si solo se guardó el artículo.

**Alternatives considered**: Enviar el saldo inicial en el CRUD mediante `current_stock`; se descarta para la nueva UI porque el campo backend está obsoleto y el cliente actual no puede especificar un motivo. Un endpoint compuesto no existe en el contrato vigente.

## D3. Usar clave idempotente por intención de escritura

**Decision**: Generar un UUID para cada nueva apertura o ajuste y conservarlo junto al mismo payload durante reintentos de esa operación. Crear una clave nueva al iniciar una acción distinta. No tratar `Idempotent-Replayed` como requisito para toda respuesta 200; un no-op también devuelve 200 sin ese encabezado.

**Rationale**: El backend calcula el hash con tipo de operación, ID numérico del artículo y cuerpo; acepta la misma clave/hash como replay y rechaza la misma clave con datos diferentes con 409. El encabezado solo indica un replay real.

**Alternatives considered**: Reutilizar una clave global o generar una clave distinta en cada retry; ambas opciones rompen el alcance de idempotencia esperado.

## D4. Consultar el historial por ID numérico y paginar en backend

**Decision**: Usar `part.id` para consultar el historial; solicitar páginas con límite máximo de 200 y filtros de tipo y fecha; consumir `{items,total,limit,offset}`.

**Rationale**: Las rutas de movimientos usan `{part_id}` numérico. El listado de inventario ya entrega ese ID; el SKU permanece para rutas de catálogo y presentación. El backend ordena por fecha/ID descendentes y puede consultar artículos inactivos por ID.

**Alternatives considered**: Usar SKU para movimientos o traer todos los registros para paginar localmente; no son compatibles con la ruta ni necesarios para la paginación estable del contrato.

## D5. Reutilizar sesión y control de acceso existentes

**Decision**: Mantener las rutas del inventario bajo la protección de personal actual y conservar `credentials: "include"`; no añadir permisos ni configuración de URL nuevos.

**Rationale**: Backend protege apertura, ajuste e historial con `require_staff` para ADMIN y TECHNICIAN, y rechaza CUSTOMER. El cliente de API ya usa la cookie HttpOnly y el proxy `/backend` en producción.

**Alternatives considered**: Añadir un rol de solo lectura o un cliente HTTP nuevo; fuera del alcance confirmado y no requerido por el contrato.

## D6. Mostrar fielmente datos ausentes y registros de corte

**Decision**: Mostrar motivo, responsable y origen solo cuando existan; rotular filas `is_before_cutover` como historia anterior al corte. No completar valores históricos por inferencia.

**Rationale**: Los movimientos legados pueden no tener motivo y sus datos de autoría son los que conserva el backend; `is_before_cutover` identifica el punto desde el cual los saldos se pueden reconciliar.

**Alternatives considered**: Mostrar un motivo o responsable genérico como si fuera dato histórico; se descarta porque inventaría evidencia.

## D7. Tratar la baja como retiro del catálogo activo

**Decision**: Cambiar la confirmación y mensajes de baja a “retirar del catálogo”. Después de 204, quitar el artículo del listado activo; no prometer borrado físico ni pérdida de historial.

**Rationale**: Backend conserva como inactivos los artículos que tienen movimientos, mientras que los artículos sin historial pueden eliminarse físicamente. El mismo contrato 204 no permite distinguir esos casos en la UI.

**Alternatives considered**: Afirmar que el artículo fue borrado o prometer siempre que se conservará la fila; no se puede garantizar desde la respuesta común.

## D8. No añadir dependencias ni alterar el modo demo

**Decision**: Usar React, React Router, `fetch`, componentes compartidos y estilos existentes. El modo API mantiene respuestas del servidor como fuente de verdad; en desarrollo sin URL se conserva el comportamiento demo existente.

**Rationale**: La feature es una extensión localizada de una aplicación existente; no requiere librerías ni cambios de despliegue.

**Alternatives considered**: Añadir una librería de tablas, formularios o estado; no aporta una necesidad nueva y aumentaría la superficie del cambio.

## Evidencia revisada

- Frontend: `src/features/workshop/Inventory.jsx`, `PartForm.jsx`, `inventoryApi.js`, `useInventory.js`, `src/app/App.jsx`, `src/shared/styles/workshop.css`, `AGENTS.md`, `specs/005-inventory-api-integration/`.
- Backend: `specs/008-trazabilidad-movimientos-inventario/contracts/inventory-movements.openapi.yaml`, `app/adapters/api/inventory.py`, `app/adapters/persistence/inventory.py`, `app/accounts/session.py`, `docs/24-api-inventario.md`.
- La migración se aplicó en la BD local de prueba y se registró como ledger `011`. El backend HTTP quickstart aún no se ha recorrido; producción u otros entornos requieren su propia migración.
