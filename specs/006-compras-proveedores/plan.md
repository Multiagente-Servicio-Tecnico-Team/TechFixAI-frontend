# Implementation Plan: Compras a proveedores en el panel del taller

**Branch**: `006-compras-proveedores` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

## Summary

Agregar al panel administrativo del taller una sección conectada con las rutas backend de proveedores y compras. Reutilizar la sesión por cookie, el control de rol ADMIN, la resolución de URL y componentes/tokens del panel existente. La pantalla cubre listado, filtros, detalle, registro, proveedores y confirmaciones de recepción parcial. No habrá datos ficticios ni confirmaciones locales. El contrato backend de inventario expone el ID numérico estable `spare_parts.id`, requerido para conectar líneas de compra a stock; el frontend debe enviar ese `id` como `spare_part_id` y conservar el SKU únicamente como código visible.

## Technical Context

**Language/Version**: JavaScript ES2022; React 18.3; Vite 5  
**Primary Dependencies**: React Router 6, lucide-react; Vitest y Testing Library ya instalados; sin dependencias nuevas  
**Storage**: Estado del módulo en memoria para formularios/consultas; persistencia exclusiva en backend PostgreSQL  
**Testing**: `npm test` (Vitest + Testing Library), pruebas de dominio/API/componentes; `npm run build`  
**Target Platform**: Aplicación web responsive del taller  
**Project Type**: Frontend React por capas (`domain`, `shared`, `state`, `features`, `app`)  
**Performance Goals**: Usar paginación server-side con límite del backend (máximo 100); cargar proveedores/inventario solo al entrar al flujo que los necesita; no cargar el detalle completo de cada fila  
**Constraints**: Solo ADMIN; cookie HttpOnly con `credentials: include`; importes exactos; contrato backend como fuente de verdad; no usar compras mock; no PLE/pagos parciales/asientos; accesibilidad, español y anchos 360/390/768/1024 px  
**Scale/Scope**: Una sección administrativa con listado, alta, detalle, recepciones y mantenimiento de proveedores; asociación a órdenes queda fuera mientras no se puedan listar órdenes

## Constitution Check

La carpeta `.specify/memory/constitution.md` contiene principios del backend multiagente, no una constitución específica del frontend. Se aplican los principios pertinentes junto con `AGENTS.md`:

| Regla aplicable | Evaluación | Tratamiento |
|---|---|---|
| Reutilizar arquitectura y componentes actuales | PASS | Mantener capas frontend y reutilizar `Field`, `Pagination`, `FormAlert`, tokens y layout del taller. |
| Sesión y seguridad | PASS | Cookie HttpOnly, `credentials: include`, rutas ADMIN; nunca confiar en `sessionStorage` como autorización del servidor. |
| Datos financieros exactos | PASS | Mantener dinero en céntimos (`BigInt`) y serializar importes con dos decimales; el backend confirma totales. |
| Evidencia antes que invención | PASS | Sin compras de demostración; sin asignar proveedor, SKU, precio o stock por inferencia. |
| Contrato entre repos | PASS | Inventario expone el ID estable `spare_parts.id` en runtime y OpenAPI para enviar `spare_part_id`. No usar el código SKU como sustituto de un ID numérico. |
| Lenguaje visual/accesibilidad | PASS | Reusar el patrón Banco/Contabilidad y controles accesibles; mantener diseño responsive y textos en español. |

**Gate inicial**: PASS. El backend publica el ID estable en el listado y detalle de inventario; se puede integrar la selección de artículos de catálogo y las recepciones que actualizan stock usando la relación numérica.

## Phase 0: Research

Ver [research.md](research.md). Las decisiones se basan en la arquitectura y los clientes de API existentes, los requisitos de sesión/estilo del frontend y los contratos backend 005/006. La dependencia de identidad entre inventario y compras quedó resuelta con el campo `id`.

## Phase 1: Design & Contracts

- Modelo del frontend y estados de pantalla: [data-model.md](data-model.md).
- Contrato del cliente y reglas de integración con backend: [contracts/purchases-client.md](contracts/purchases-client.md). El OpenAPI backend permanece como contrato canónico y no se duplica.
- Guía de integración y validación: [quickstart.md](quickstart.md).

### Constitución después del diseño

**Gate post-diseño**: PASS. El diseño toma `id` del contrato de inventario y lo envía como `spare_part_id`; no deriva IDs desde SKU ni crea compras simuladas. Todas las escrituras exigen ADMIN y respuesta backend. La compra no produce cambio local de stock ni asiento contable.

## Project Structure

### Documentation (this feature)

```text
specs/006-compras-proveedores/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── purchases-client.md
```

### Source Code (frontend root)

```text
src/
├── domain/
│   └── purchases.js                 # Formato monetario, cantidades y etiquetas de estado
├── features/
│   ├── purchases/
│   │   ├── purchasesApi.js           # Adaptador de proveedores/compras/recepciones
│   │   ├── usePurchases.js           # Carga, filtros, mutaciones y estados de pantalla
│   │   ├── PurchasesList.jsx         # Lista paginada y filtros
│   │   ├── PurchaseCreate.jsx        # Formulario de encabezado y líneas
│   │   ├── PurchaseDetail.jsx        # Detalle, recibos e historial
│   │   └── SupplierManager.jsx       # Selector, alta y mantenimiento de proveedores
│   ├── auth/RequireRole.jsx          # Mensaje de acceso ADMIN contextualizado
│   └── workshop/                     # Inventario existente para seleccionar artículos
├── app/
│   ├── App.jsx                       # Rutas ADMIN de Compras
│   └── layouts/StaffLayout.jsx       # Navegación desktop/móvil
└── shared/styles/workshop.css        # Reglas visuales nuevas bajo tokens existentes
tests/
├── unit/purchases-domain.test.js
├── unit/purchases-api.test.js
└── integration/purchases-*.test.jsx  # Flujos, acceso, estados y semántica responsive
```

**Structure Decision**: Crear un módulo `src/features/purchases/` separado de contabilidad y tickets, usar `src/domain/` para cantidades/importes/etiquetas puras y dejar `src/state/store.jsx` fuera del flujo de persistencia. Integrar con `/taller/compras`, `/taller/compras/nuevo`, `/taller/compras/proveedores` y `/taller/compras/:id`; proteger estas rutas con rol ADMIN en el árbol actual de `App.jsx`.

## Complexity Tracking

No se agregan dependencias ni una nueva capa global de estado. El pequeño cliente de compras es específico del contrato; no se amplía `accountingApi` ni `ticketsApi` con responsabilidades de proveedores.
