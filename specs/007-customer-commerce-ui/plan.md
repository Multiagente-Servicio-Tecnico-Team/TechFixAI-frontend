# Implementation Plan: Integración frontend de clientes y comercio

**Branch**: `007-customer-commerce-ui` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-customer-commerce-ui/spec.md`

## Summary

Alinear el portal y el panel ADMIN con la separación entre cuenta `users` y cliente comercial `customers`. El login/registro actual permanece intacto; las vistas portal consultan tickets, cotizaciones, pagos y ventas propias desde la sesión del backend. ADMIN selecciona o crea clientes manuales, crea tickets/cotizaciones de servicio y gestiona cotizaciones de venta y confirmaciones. Se crean clientes API separados por funcionalidad, normalizadores de DTO y vistas que conservan el diseño Banco. El prerrequisito crítico es que backend cree y resuelva el perfil comercial ligado a cada cuenta; el frontend no suplanta esa relación enviando IDs.

## Technical Context

**Language/Version**: JavaScript ES2022; React 18.3; Vite 5.

**Primary Dependencies**: React Router 6, lucide-react; `fetch` nativo; Vitest y Testing Library existentes. No se requieren dependencias nuevas.

**Storage**: El backend PostgreSQL es persistencia de clientes y comercio. En el navegador se mantiene únicamente el estado de presentación y los campos de sesión que ya usa la aplicación; no se guarda perfil comercial, contraseña ni token.

**Testing**: `npm test` (Vitest + Testing Library) y `npm run build`; se añadirán pruebas unitarias de dominio/clientes API y pruebas de integración de páginas/rutas, permisos, estados de error y aislamiento visual. No se ejecutan durante esta fase de planificación.

**Target Platform**: SPA web responsive para cliente y personal del taller.

**Project Type**: Aplicación frontend React organizada por capas `domain`, `shared`, `state`, `features` y `app`.

**Performance Goals**: Respetar paginación del backend; cargar detalles al abrirlos y cargar inventario solo al crear cotizaciones; evitar solicitudes duplicadas de quote lists y operaciones repetidas de aceptación.

**Constraints**: No cambiar el mecanismo de autenticación; incluir sesión en solicitudes; no usar IDs de cuenta como IDs comerciales; autorización final del backend; no activar datos demo tras error de un servicio configurado; precios/estados proceden del backend; crear tickets solo para servicio; mantener español, accesibilidad, Banco y breakpoints 360/390/768/1024; no añadir dependencias ni modificar backend desde este feature.

**Scale/Scope**: Cuatro recorridos: acceso portal y perfil resuelto, consultas del cliente, gestión ADMIN de clientes/tickets/cotizaciones de servicio y flujo de cotizaciones de venta/pagos/ventas.

## Constitution Check

El archivo `.specify/memory/constitution.md` contiene principios del backend multiagente, no una constitución específica para este frontend. Se aplican los principios pertinentes junto con `AGENTS.md` del repositorio:

| Regla | Evaluación | Tratamiento |
|---|---|---|
| Capas y módulos por funcionalidad | PASS | Reusar `authApi`, `chatApi`, `ticketsApi`, `inventoryApi` y crear clientes para customers/commerce sin concentrar todo en un API global. |
| Sesión y ownership | PASS condicionado | Cookie de sesión existente; frontend no envía ownership cliente. El backend debe provisionar y resolver el perfil customer. |
| Datos sensibles | PASS | No persistir contraseñas, tokens ni perfil comercial en almacenamiento del navegador. |
| Precio, pago y stock | PASS | Mostrar valores/estados confirmados; aceptación no confirma pago; confirmación ADMIN y actualización de inventario pertenecen al backend. |
| Datos de demostración | PASS | Solo conservar modo demo donde ya se permite sin servicio configurado; nunca enmascarar fallos de servicio conectado. |
| Contratos entre repos | PASS condicionado | Consumo de contrato backend 007; aclarar `quotes[]` versus campo `quote` legacy y el perfil de sesión antes de aceptación E2E. |
| Diseño, accesibilidad y responsive | PASS | Reutilizar componentes/tokens de Banco y conservar los tamaños objetivo del repositorio. |

**Gate inicial**: PASS para el diseño y la implementación frontend con dobles de contrato. La aceptación extremo a extremo del portal queda bloqueada hasta cumplir el prerrequisito backend documentado en [research.md](research.md) y [contracts/customer-commerce-ui.md](contracts/customer-commerce-ui.md). No se considera excepción válida enviar customer IDs desde el frontend.

## Phase 0: Research

Decisiones y discrepancias observadas en [research.md](research.md):

- Auth preserva `users`; el backend debe provisionar/resolver customers.
- Módulos API separados por dominio y normalización compatible de una o varias cotizaciones.
- Administración usa búsqueda paginada y no auto-vincula cuentas por correo.
- Cotizaciones, pagos, pedidos y stock conservan estados/dimensiones separadas.
- UI usa ID estable numérico de inventario para líneas y no usa SKU como sustituto.

No quedan decisiones de producto sin resolver. El hallazgo de registro/sesión es una dependencia externa conocida.

## Phase 1: Design & Contracts

- Proyecciones de UI y borradores: [data-model.md](data-model.md).
- Contrato frontend y matriz de operaciones contra backend: [contracts/customer-commerce-ui.md](contracts/customer-commerce-ui.md). OpenAPI backend permanece como autoridad de rutas, campos y respuestas.
- Guía manual/automatizada de aceptación post-implementación: [quickstart.md](quickstart.md).

### Constitución después del diseño

**Gate post-diseño**: PASS condicionado al prerrequisito backend de perfil comercial. El diseño mantiene el ownership derivado de sesión; tickets y cotizaciones se tipifican por su uso; reintentos no confirman estado localmente; admin confirma pagos, el backend consume reservas/stock y el frontend conserva snapshots y DTOs. No se crea una interfaz insegura de vinculación manual de cuenta.

## Project Structure

### Documentation (this feature)

```text
specs/007-customer-commerce-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── customer-commerce-ui.md
```

### Source Code (frontend root)

```text
src/
├── domain/
│   └── customerCommerce.js           # Normalización pura de estados/tipos y proyecciones
├── features/
│   ├── auth/                         # Auth actual conservado; sin customer ID
│   ├── chat/                         # Referencia quote_id/estado en la conversación
│   ├── customers/                    # Cliente API y selección/gestión ADMIN de customers
│   ├── commerce/                     # Cotizaciones, pagos y ventas del cliente y ADMIN
│   ├── tickets/                      # Mis tickets con historial de quotes de servicio
│   └── workshop/                     # Selección de customer y cotizaciones desde tickets
├── app/
│   ├── App.jsx                       # Rutas portal y ADMIN nuevas
│   └── layouts/                      # Navegación cliente/taller
└── shared/styles/                    # Extensión Banco mediante tokens existentes

tests/
├── unit/                             # dominio, adaptadores API y seguridad del payload
└── integration/                      # registro, portal, administración y acceso por rol
```

**Structure Decision**: Añadir `customers` y `commerce` como features independientes de `auth`, `chat` y `tickets`. Reusar componentes y APIs existentes según responsabilidad: `authApi.js` sigue autenticando; `ticketsApi.js` sigue siendo dueño de tickets ADMIN; `chatApi.js` mantiene conversación y lista portal existente con una adaptación para quotes múltiples; inventario provee artículos. Nuevas vistas comerciales y operaciones customer/admin se alojan en `src/features/commerce/` y `src/features/customers/`. Las rutas se montan en `App.jsx`, y navegación/denegación se integra en `PortalLayout.jsx` y `StaffLayout.jsx`.

## Complexity Tracking

No se introducen librerías ni estado global nuevo. La separación en módulos `customers` y `commerce` corresponde a ciclos y permisos distintos. El enlace manual de una cuenta queda fuera hasta que backend provea selección/verificación segura de cuentas candidatas.
