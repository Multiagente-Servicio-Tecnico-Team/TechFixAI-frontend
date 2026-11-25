# Research: Compras a proveedores en el panel del taller

## Decisiones

### Seguir la separación de capas y patrones del panel actual

- **Decisión**: implementar un módulo de feature `purchases`, un cliente API propio, dominio puro para dinero/cantidades/estados y componentes montados en el layout de taller existente.
- **Rationale**: `AGENTS.md` define capas, límites y clientes API por funcionalidad. Contabilidad ya muestra un patrón de módulo administrativo con listado, detalle y errores; inventario comparte productos, pero no es dueño de compras.
- **Alternativas consideradas**: alojar compras dentro de contabilidad o tickets; descartado porque compras no crea asientos ni tickets y requiere estados/operaciones propias.
- **Evidencia local**: `src/features/accounting/`, `src/features/workshop/`, `src/app/App.jsx`, `src/app/layouts/StaffLayout.jsx`.

### Configuración del servicio sin modo de compras falso

- **Decisión**: cliente propio con `VITE_API_URL`, usando `resolveApiBaseUrl` y fallback `/backend` en producción. En desarrollo sin URL, mostrar servicio no configurado y no crear registros mock.
- **Rationale**: coincide con el proxy same-origin y configuración de `accountingApi`; datos de compras son operativos/financieros y no deben parecer reales si son ficticios.
- **Alternativas consideradas**: leer/escribir a `state/store.jsx` o reusar las compras de inventario demostrativo; descartadas por falta de trazabilidad y riesgo de confundir operaciones locales con persistidas.
- **Evidencia local**: `src/shared/api/baseUrl.js`, `src/features/accounting/accountingApi.js`, `src/features/workshop/inventoryApi.js` y `AGENTS.md`.

### Reutilizar inventario únicamente desde el servicio real

- **Decisión**: cargar las opciones de catálogo desde `inventoryApi.list()` solo cuando `inventoryApi.mode === "api"`; si inventario no está configurado, mostrar que no se puede elegir un repuesto existente y permitir únicamente conceptos libres si el usuario los agrega explícitamente.
- **Rationale**: en desarrollo `inventoryApi` usa catálogo de demostración si falta `VITE_API_URL`; una compra persistida no debe crear una relación con datos ficticios. En producción el cliente ya usa el proxy `/backend`.
- **Alternativas consideradas**: usar el catálogo demo como fallback o tratar de resolverlo por SKU; ambas opciones pueden vincular una compra con un artículo inexistente o incorrecto.
- **Evidencia local**: `src/features/workshop/inventoryApi.js` expone `mode`, usa `VITE_API_URL` y convierte `id` numérico; `specs/005-api-inventario/contracts/inventory.openapi.yaml` define el ID estable.

### Usar el ID de inventario en las líneas de compra

- **Decisión**: el selector usa el campo numérico `id` devuelto por `GET /api/inventory/parts` como `spare_part_id`; el SKU `code` se conserva solo para mostrar e identificar el artículo ante el usuario.
- **Rationale**: el endpoint de compras exige `spare_part_id` entero para crear una línea vinculada y actualizar stock en la recepción. El backend ahora conserva `spare_parts.id` en el modelo de inventario, lo serializa en runtime y lo declara en el OpenAPI.
- **Alternativas consideradas**: usar SKU como `spare_part_id`, buscar el ID en frontend o enviar null para todo; las dos primeras envían identidad incorrecta y la tercera permite guardar pero desconecta compra del stock.
- **Evidencia local**: backend `app/domain/inventory.py::part_to_dict`, `app/adapters/persistence/inventory.py::InventoryRepositoryAdapter._part` y `specs/005-api-inventario/contracts/inventory.openapi.yaml`; frontend `src/features/workshop/inventoryApi.js::fromApi` valida y conserva `id`; compras declara `PurchaseLineWrite.spare_part_id` entero opcional en `specs/006-registro-compras-proveedores/contracts/purchases.openapi.yaml`.

### No ofrecer vinculación a orden sin consulta de órdenes

- **Decisión**: omitir el selector de orden de compra. El formulario crea el comprobante con `purchase_order_id` omitido hasta que el backend ofrezca una lista de órdenes a la que pueda aplicarse selección verificable.
- **Rationale**: la relación es opcional y la API backend 006 actual no tiene endpoint de listado para `purchase_orders`; no se pedirá al usuario escribir IDs.
- **Alternativas consideradas**: ingresar un ID manual o mostrar órdenes desde datos locales; ambas opciones son propensas a errores y no tienen respaldo del servidor.

### Mantener autorización y expiración de sesión coherentes

- **Decisión**: agrupar las rutas nuevas bajo la sección de taller y el guard de rol ADMIN; todas las llamadas incluyen cookie. Para 401 dirigir a acceso de taller conservando retorno. Para 403 no mostrar datos y usar mensaje contextual de Compras.
- **Rationale**: los datos están restringidos a ADMIN en backend. La ruta requiere una experiencia de denegación que diga Compras, mientras `RequireRole` actual marca el caso contable de forma específica.
- **Alternativas consideradas**: ocultar solo el enlace o depender únicamente de la autorización frontend; ninguna reemplaza la protección del servidor.
- **Evidencia local**: `src/features/auth/RequireRole.jsx`, `src/app/layouts/StaffLayout.jsx`, `src/features/accounting/accountingApi.js`.

### Usar dinero exacto y reintentos de recepción

- **Decisión**: conservar cantidades monetarias como céntimos enteros en dominio y enviar importes como cadenas de dos decimales; mantener cantidad de línea con hasta tres decimales. El cliente de API generará una clave UUID al confirmar la recepción y conservará la misma clave/payload mientras se reintenta esa solicitud no resuelta.
- **Rationale**: evita `float` para montos y cumple el contrato de idempotencia del backend; el backend es autoridad final del total y del stock.
- **Alternativas consideradas**: cálculos en `Number` o generar UUID nuevo en cada retry; producen redondeos y pueden aplicar una recepción duplicada.
- **Evidencia local**: `src/domain/money.js`, API de contabilidad y `Idempotency-Key` del contrato backend.

## Integración backend/frontend observada

- Rutas de compra y proveedor protegidas por sesión ADMIN en backend spec 006; respuestas paginadas `{items,total,limit,offset}`.
- El backend recibe dinero como cadenas `0.00`, estados de recepción `REGISTERED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED` y estado de pago `PENDING` o `PAID`.
- Al crear una compra no cambia inventario. Cada POST de recepción admite cantidades parciales por línea y requiere `Idempotency-Key` UUID.
- `PATCH` de compra soporta notas y avance de pago; no edición de snapshots/líneas. Cancelación solo antes de recepción.
- Inventario `GET /api/inventory/parts` requiere personal y ofrece los productos activos, incluido `id` numérico estable; se enviará ese valor como `spare_part_id` en líneas vinculadas.
- El backend actual no publica listado de órdenes de compra; `purchase_order_id` permanece omitido desde frontend.

## Incógnitas resueltas

No quedan dudas de producto abiertas. El contrato backend ya expone el ID numérico de inventario necesario para vincular líneas y registrar recepciones con actualización de stock. El frontend debe mantenerlo en el modelo del artículo seleccionado y no reconstruirlo desde el SKU.
