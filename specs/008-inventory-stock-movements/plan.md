# Implementation Plan: Movimientos de stock del inventario

**Branch**: `[008-inventory-stock-movements]` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-inventory-stock-movements/spec.md`

## Summary

Extender el inventario de Taller con aperturas, ajustes por conteo e historial, usando el OpenAPI backend 008 como contrato y manteniendo las pantallas actuales. El cliente existente `inventoryApi.js` añadirá las operaciones; los formularios de catálogo dejarán de enviar `current_stock`, y el stock visible se actualizará solo después de confirmación. La creación de artículo y la apertura inicial son operaciones HTTP separadas: ante error de apertura, la UI conserva y muestra el artículo creado con saldo cero y deja reintentar la apertura.

## Technical Context

**Language/Version**: JavaScript ES modules; React 18.3; Vite 5.4.

**Primary Dependencies**: React, React Router 6, `fetch`, Vitest 2, Testing Library y jsdom; no se requieren paquetes nuevos.

**Storage**: El backend persiste artículos y movimientos en PostgreSQL. El frontend conserva el store React existente, sin incorporar persistencia local para movimientos.

**Testing**: Vitest y Testing Library; ampliar pruebas de `tests/unit/inventory.test.js` y `tests/integration/inventory.test.jsx`; añadir cobertura de historial/flujo si requiere un archivo focalizado. Validación final con `npm test` y `npm run build`; la sesión ADMIN/TECHNICIAN y la API local se validan manualmente según `quickstart.md`.

**Target Platform**: Navegadores modernos en escritorio y móvil; Vercel en producción a través del proxy same-origin `/backend`, backend local o URL configurada en desarrollo.

**Project Type**: Aplicación SPA React dentro del repositorio frontend separado.

**Performance Goals**: Historial paginado con la página backend por defecto de 50 movimientos y máximo contractual de 200; mantener navegación y filtros locales del inventario, sin descargar todo el historial para paginar.

**Constraints**: Mantener roles ADMIN/TECHNICIAN, cookie HttpOnly con `credentials: "include"`, base URL y modo demo existentes, textos en español, precios en céntimos, accesibilidad y anchos 360/390/768/1024. Stock solo cambia por apertura/ajuste/recepción/venta; el frontend no altera saldos optimistamente. No modificar backend ni base de datos. El contrato backend y la migración 011 están aplicados en la base local de prueba, pero otros entornos deben aplicarlos antes de integración.

**Scale/Scope**: Una vista del inventario, alta/edición, control de ajuste, y una vista paginada del historial por artículo. Se conservan búsqueda, categorías, filtros, orden y umbrales ya existentes. No se crea una navegación de primer nivel adicional.

## Constitution Check

### Gates before design

- **Separación de responsabilidades: PASS.** El cliente HTTP permanece en `src/features/workshop/inventoryApi.js`; componentes y hook gestionan interacción/estado; el dominio existente conserva validaciones puras. No se añade `fetch` directo a pantallas.
- **Sesión y permisos: PASS.** Se conserva `credentials: "include"` y el control de rutas `RequireRole` ya aplicado a Taller. Backend limita movimientos a ADMIN y TECHNICIAN.
- **Exactitud financiera: PASS.** Precio sigue almacenado y mostrado con las reglas actuales; los movimientos no modifican cálculos monetarios.
- **Fuente de verdad y modo demo: PASS.** En modo API, la respuesta backend confirma saldo; sin URL local sigue el modo demo. Fallos de API no se sustituyen por datos de demostración.
- **Accesibilidad y responsividad: PASS.** Se reutilizan `Field`, `FormAlert`, `ConfirmDialog`, `Pagination`, `Toast` y estilos de Taller; se conservan teclado, estados anunciados y anchos definidos por el proyecto.
- **Cambios backend/SQL: PASS.** Fuera de alcance para esta feature; el contrato OpenAPI existente es la fuente de integración.

No se identifican excepciones a la constitución ni requisitos por aclarar.

### Gates after Phase 1 design

- **Contrato coincide con backend: PASS.** Rutas, campo numérico `part_id`, claves idempotentes, filtros, paginación, códigos de error y campos de movimiento se documentan sin redefinir el OpenAPI.
- **Riesgo de creación en dos pasos: PASS con recuperación explícita.** El artículo se persiste con saldo cero; el paso de apertura se confirma aparte. Si falla, se conserva la referencia numérica y se ofrece reintento sin duplicar SKU.
- **Historia histórica: PASS.** Datos ausentes no se inventan; `is_before_cutover` se presenta como historia previa al corte.

## Project Structure

### Documentation (this feature)

```text
specs/008-inventory-stock-movements/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── inventory-movements-consumer.md
└── tasks.md  # se genera con speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   └── App.jsx                         # rutas de historial existentes bajo ruta staff
├── features/workshop/
│   ├── Inventory.jsx                   # acciones de stock e historial por repuesto
│   ├── PartForm.jsx                    # catálogo separado de apertura inicial
│   ├── InventoryMovements.jsx          # vista paginada por ID numérico
│   ├── StockAdjustmentDialog.jsx       # conteo físico/motivo (si se mantiene como diálogo)
│   ├── inventoryApi.js                 # apertura, ajuste, historial y mapeo de errores
│   └── useInventory.js                 # sincronización confirmada con store
└── shared/styles/
    └── workshop.css                    # extender tokens/estilos existentes solo si hace falta

tests/
├── unit/
│   └── inventory.test.js               # contrato API, payloads e idempotencia
└── integration/
    └── inventory.test.jsx              # alta, ajuste, historial, errores y acceso responsive
```

**Structure Decision**: Aplicación frontend única; se extiende la feature `workshop` y su API ya existente. La ruta de historial usa el ID estable del artículo porque el backend de movimientos exige `part_id` numérico. No se añade dependencia ni capa de persistencia cliente.

## Complexity Tracking

Sin excepciones que justificar.
