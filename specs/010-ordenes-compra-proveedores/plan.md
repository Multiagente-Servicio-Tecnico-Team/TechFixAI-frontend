# Implementation Plan: Ordenes de compra a proveedores

**Branch**: `[010-ordenes-compra-proveedores]` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-ordenes-compra-proveedores/spec.md`

## Summary

Integrar en la seccion existente Compras el ciclo de ordenes de proveedor implementado por el backend: consulta, borradores, emision, cancelacion, recepciones fisicas y vinculo de comprobantes. La interfaz usara el cliente y los patrones de sesion, permisos, errores y estilos existentes. El backend seguira siendo la unica fuente de verdad para estados, totales y cambios de inventario.

## Technical Context

**Language/Version**: JavaScript ES modules y JSX; React 18.

**Primary Dependencies**: Vite 5, React Router 6, `fetch`, `lucide-react`, cliente `purchasesApi`, `inventoryApi`, componentes compartidos y estilos del taller.

**Storage**: PostgreSQL del backend mediante la API; estado de formulario temporal en el navegador y cookie de sesion HttpOnly existente.

**Testing**: Vitest y Testing Library; pruebas unitarias de cliente/API y pruebas de integracion de pantallas. `npm run build` para validar compilacion cuando se implemente; no se ejecutan pruebas en esta fase de planificacion.

**Target Platform**: SPA web en navegadores de escritorio y movil, desplegada como frontend Vite.

**Project Type**: Aplicacion web frontend.

**Performance Goals**: Mantener paginas de 20 resultados como el listado actual y evitar consultas duplicadas en cada renderizado. Tras una transicion, la pantalla debe mostrar el resultado confirmado al recargar el recurso.

**Constraints**: Solo ADMIN; mantener la URL base y `credentials: include`; no leer ni guardar credenciales; no simular datos operativos; no modificar stock desde el navegador; adaptar a 360, 390, 768 y 1024 px; respetar cambios ya presentes en el arbol de trabajo.

**Scale/Scope**: Una extension del modulo Compras: cuatro flujos de usuario, nuevas vistas de orden, adaptador de API y ajustes al registro de comprobantes.

## Constitution Check

**Gates before research**

- Autorizacion y sesion: PASS. Se reutiliza la ruta ADMIN y la cookie de sesion; el backend vuelve a validar permisos.
- Integridad de inventario y finanzas: PASS. Totales y estados vienen del backend; solo una recepcion confirmada puede reflejar movimientos.
- Privacidad: PASS. El frontend no almacena credenciales, no obtiene el actor de un campo editable y mantiene los mensajes genericos de errores de red/5xx.
- Separacion de responsabilidades: PASS. Pantallas usan el cliente de API de la funcionalidad y componentes compartidos; no hacen `fetch` directo.
- Compatibilidad visual y accesibilidad: PASS. Se conservan Compras, sus estilos y los anchos responsivos definidos por el proyecto.

No se identifican excepciones de gobernanza ni cambios de esquema frontend.

## Project Structure

### Documentation (this feature)

```text
specs/010-ordenes-compra-proveedores/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- purchase-orders-consumption.md
`-- tasks.md                 # Se genera en speckit-tasks, fuera de este plan
```

### Source Code (repository root)

```text
src/
|-- app/
|   |-- App.jsx              # Rutas ADMIN de Compras
|   `-- layouts/StaffLayout.jsx # Navegacion global existente de Compras
|-- features/purchases/
|   |-- purchasesApi.js      # Extender operaciones de orden y asociacion del comprobante
|   |-- usePurchases.js      # Reutilizar patrones de carga y sesion; agregar hook de ordenes
|   |-- PurchasesList.jsx    # Mantener listado de comprobantes y enlazar vista de ordenes
|   |-- PurchaseCreate.jsx   # Asociar orden y sus lineas durante alta del comprobante
|   |-- PurchaseOrdersList.jsx
|   |-- PurchaseOrderCreate.jsx
|   |-- PurchaseOrderDetail.jsx
|   `-- PurchaseOrderReceiptForm.jsx
|-- features/workshop/inventoryApi.js # Fuente existente de repuestos con ID numerico
`-- shared/styles/workshop.css # Extender componentes visuales de Compras

tests/
|-- unit/purchases-api.test.js # Ampliar cobertura del adaptador
|-- unit/purchase-orders-api.test.js # Contratos de operaciones de orden
`-- integration/purchase-orders.test.jsx # Lista, transiciones, recepcion y vinculo
```

**Structure Decision**: Mantener las ordenes dentro de `features/purchases`, junto a comprobantes y proveedores. Reutilizar el cliente de compras y crear vistas/hook diferenciados para que el ciclo de orden no se mezcle con el estado de una factura. No agregar una nueva entrada principal de navegacion; la ruta ADMIN Compras existente sigue como punto de entrada.

## Complexity Tracking

No hay violaciones constitucionales que requieran justificacion adicional.

## Phase 0: Research

Las decisiones y alternativas se documentan en [research.md](research.md). Las incertidumbres de contrato se resolvieron consultando los OpenAPI backend 010 y 006 y el codigo frontend existente; no quedan decisiones de negocio pendientes.

## Phase 1: Design and Contracts

- [data-model.md](data-model.md) define los modelos de presentacion y transiciones que consume el frontend, sin duplicar entidades persistidas.
- [contracts/purchase-orders-consumption.md](contracts/purchase-orders-consumption.md) relaciona los flujos de UI con las operaciones backend existentes.
- [quickstart.md](quickstart.md) describe como validar el flujo al implementarlo con la base de prueba.

**Post-design Constitution Check**: PASS. El diseno conserva autorizacion ADMIN, cookie HttpOnly, resultados financieros e inventario autoritativos del backend y usa la clave idempotente requerida para recepciones. No incluye cambios de backend, esquema ni autentificacion.
