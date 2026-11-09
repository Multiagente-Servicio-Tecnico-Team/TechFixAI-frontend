# Implementation Plan: Catálogo contable y reportes del taller

**Branch**: `[009-accounting-catalog-reports]` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Requisitos de interfaz en `specs/009-accounting-catalog-reports/spec.md`.

## Summary

Extender la experiencia de Contabilidad existente para consumir el catálogo de planes y cuentas, administrar cierres mensuales y consultar/exportar diario, mayor y balance de comprobación. La integración se hará en el cliente API de contabilidad ya existente, con rutas protegidas ADMIN y componentes visuales Banco reutilizados. El OpenAPI del backend sigue siendo la fuente de verdad para rutas, payloads y formatos; los nuevos flujos no tendrán datos financieros de demostración.

## Technical Context

**Language/Version**: JavaScript (ES modules), React 18.3, Vite 5.4.
**Primary Dependencies**: React, React Router 6, lucide-react; fetch nativo; Vitest y Testing Library ya instalados.
**Storage**: Sin almacenamiento nuevo en frontend. La API backend y PostgreSQL conservan planes, cuentas, periodos, asientos y auditoría; la sesión se transmite con cookie HttpOnly.
**Testing**: Vitest/Testing Library en las suites de unidad e integración existentes; build con Vite. La validación manual de API requiere backend de prueba, sesión ADMIN y catálogo disponible.
**Target Platform**: Navegadores modernos; Vercel en producción y Vite en desarrollo.
**Project Type**: Aplicación web frontend SPA.
**Performance Goals**: Buscar entre el catálogo de 1,192 cuentas en menos de 2 segundos bajo condiciones normales, usando consultas remotas paginadas con límite de 100; no descargar el catálogo completo para poblar selectores.
**Constraints**: Mantener `/taller/contabilidad` y sus rutas existentes; ADMIN solamente; `credentials: include`; respetar `/backend` same-origin en producción; importes como strings decimales del API; filtrar cuentas por plan, estado, imputabilidad y vigencia; exportaciones completas con el límite backend de 10,000 filas; soporte teclado, tema claro/oscuro y 360/390/768/1024 px.
**Scale/Scope**: Extender `src/features/accounting/` y `src/domain/accounting.js`; añadir vistas para planes/cuentas, periodos e informes y enlaces internos desde Contabilidad; no cambiar frontend de clientes ni implementar lógica contable en el navegador.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

La constitución del directorio `.specify` está redactada para el backend. Para este plan frontend se aplican las reglas compatibles y las instrucciones locales del repositorio.

| Gate | Estado | Evidencia/diseño |
|---|---|---|
| Backend como autoridad de importes, permisos, estados y persistencia | PASS | La interfaz consume resultados confirmados; no calcula informes ni inventa saldos. |
| Seguridad de sesión y autorización | PASS | Se reutiliza RequireRole para ADMIN y cookie HttpOnly con `credentials: include`; el navegador no lee la cookie. |
| Montos exactos | PASS | Los importes y totales del backend se conservan como decimales exactos; no se usa `Number` para cálculos financieros. |
| Separación por capas y llamadas de API | PASS | API dentro de `features/accounting`, reglas puras dentro de `domain`, pantallas bajo `features` y rutas bajo `app`; las vistas no hacen fetch directo. |
| Evidencia y datos reales | PASS | Ante API vacía/no disponible se informa estado vacío/error; no se muestran valores contables simulados. |
| Accesibilidad y diseño adaptable | PASS | Se reutilizan `Field`, alertas, diálogos, paginación, tokens, foco visible y navegación existente. |
| Alcance y compatibilidad | PASS | No requiere excepción: el feature extiende Contabilidad, no cambia autenticación, backend, DB ni PLE. |

**Post-design check**: PASS. Los artefactos conservan el contrato canónico del backend, evitan duplicar reglas de negocio y aprovechan las capas y componentes existentes.

## Research Summary

Las decisiones de integración y los patrones encontrados están documentados en [research.md](research.md). No quedan decisiones técnicas o de negocio bloqueantes: la especificación y el OpenAPI backend definen las capacidades y la autenticación existente determina cómo consumirlas.

## Project Structure

### Documentation (this feature)

```text
specs/009-accounting-catalog-reports/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── spec.md
├── checklists/requirements.md
└── contracts/accounting-catalog-ui.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── App.jsx                         # Rutas ADMIN nuevas bajo /taller/contabilidad
│   └── layouts/StaffLayout.jsx         # Entrada de navegación contable
├── domain/
│   └── accounting.js                   # Validación de borradores y adaptadores puros si hacen falta
├── features/accounting/
│   ├── accountingApi.js                # Cliente único para catálogo, periodos, informes y asientos
│   ├── AccountingList.jsx              # Acceso a las capacidades contables extendidas
│   ├── EntryLinesEditor.jsx             # Selector remoto de cuenta del plan
│   ├── plans/                          # Planes y administración del catálogo de cuentas
│   ├── periods/                        # Consulta, cierre/reapertura e historial mensual
│   └── reports/                        # Diario, mayor, balance y exportaciones
└── shared/
    ├── ui/                             # Reutilizar Field, FormAlert, ConfirmDialog, Pagination
    └── styles/                         # Tokens y estilos del área de taller

tests/
├── unit/                               # Validación, filtros, parámetros y formatos
└── integration/                       # Flujos ADMIN, estados de pantalla y consumo simulado del API
```

**Structure Decision**: Mantener la estructura SPA existente, agrupando las nuevas pantallas por capacidad dentro de `src/features/accounting/`. No se crea una nueva capa global ni un estado duplicado. El cliente `accountingApi.js` centraliza sesión, errores, serialización de filtros y descargas binarias.

## Complexity Tracking

No hay violaciones de los gates ni justificación de complejidad adicional.
