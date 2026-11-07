# Implementation Plan: Gestión de asientos contables en el taller — Frontend

**Branch**: `[003-asientos-contables]` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-asientos-contables/spec.md`

## Summary

Entregar en el panel del taller una experiencia contable exclusiva para `ADMIN`: consulta paginada y filtrable, detalle con líneas e historial, alta de asientos balanceados confirmada al guardar y reversión compensatoria. La interfaz seguirá el sistema Banco y consumirá el contrato backend existente con la cookie de sesión. El backend permanece como autoridad de permisos, validaciones y persistencia. La UI conservará la distinción `ADMIN`/`TECHNICIAN` que actualmente se pierde al convertir el rol a `staff`, usará importes exactos para todo el rango permitido y conservará la referencia de idempotencia al reintentar un alta incierta.

## Technical Context

**Language/Version**: JavaScript ES modules, React 18, JSX; Node.js compatible con Vite 5.

**Primary Dependencies**: Dependencias existentes: React, React Router, lucide-react, Vite, Vitest y Testing Library. No se requiere una dependencia nueva.

**Storage**: PostgreSQL y su persistencia pertenecen al backend. El frontend conserva solo la sesión ya existente (rol, nombre y correo); el borrador del formulario y la clave de idempotencia permanecen en memoria de la página.

**Testing**: Vitest + Testing Library; pruebas unitarias de dominio/formateo, cliente HTTP con `fetch` simulado, pruebas de componentes/rutas con sesión simulada, accesibilidad básica y build de Vite.

**Target Platform**: Navegadores modernos de escritorio y móvil; anchos de aceptación 360, 390, 768 y 1024 px; tema claro y oscuro del sistema Banco.

**Project Type**: Aplicación web frontend React/Vite en repositorio separado del backend.

**Performance Goals**: La lista inicia con el tamaño de página del contrato (50) y permite el máximo admitido (100); filtros y navegación no deben enviar solicitudes duplicadas por un mismo cambio o interacción.

**Constraints**: Mantener capas `domain ← shared ← state ← features ← app`; reutilizar `StaffLayout`, tokens y controles actuales; las peticiones incluyen la cookie; no registrar información financiera en consola; backend es fuente de verdad. No editar ni borrar asientos confirmados. Evitar `Number` para convertir el rango monetario contable de hasta 12 dígitos enteros y 2 decimales: el dinero del formulario y las sumas se representan sin pérdida de precisión.

**Scale/Scope**: Tres vistas principales (lista, alta, detalle), una confirmación de reversión, un cliente del contrato contable y los ajustes acotados de rol/rutas/navegación; sin cambios al backend, base de datos, chat, portal cliente, pagos ni PLE.

## Constitution Check

La constitución disponible en `.specify/memory/constitution.md` pertenece al backend; para este plan se aplican sus principios que atraviesan repositorios y las reglas frontend de `AGENTS.md`.

| Gate | Estado | Evidencia/decisión |
|---|---|---|
| Reglas compartidas y backend autoritativo | PASS | El frontend presenta respuestas; el backend valida balance, identidad, permisos y transición de reversa. |
| Datos financieros exactos | PASS | Los valores viajan como cadenas de dos decimales y el cálculo local usa representación exacta; no se usa aritmética binaria para decidir balance. |
| Evidencia antes que invención | PASS | No se afirma validación PCGE ni cumplimiento PLE; categorías/códigos se muestran como internos. |
| Seguridad y privacidad | PASS | Solo `ADMIN` ve la opción; cookie HttpOnly existente; el servidor autoriza cada petición; no se guardan tokens ni se registran payloads. |
| Persistencia y esquema trazables | PASS | No hay cambios de esquema en el frontend; usa los recursos ya desplegados del backend. |
| Arquitectura frontend | PASS | Dominio sin React/browser; cliente bajo la feature; pantallas bajo `src/features`; rutas en `src/app`; estilos compartidos existentes. |
| Compatibilidad visual y accesibilidad | PASS | Sistema Banco, barra móvil de tres destinos, menú usuario, tema, foco visible, teclado y breakpoints declarados por el repo. |
| Dependencias | PASS | Se reutiliza el stack instalado y no se agrega librería. |

No hay violaciones que requieran Complexity Tracking.

## Research Decisions

Ver [research.md](research.md) para decisiones y alternativas consideradas:

1. Mantener la abstracción `client|staff` para la navegación existente y añadir el rol de cuenta devuelto por backend a la sesión frontend; utilizarlo para la ruta/opción ADMIN. La protección del servidor sigue siendo obligatoria.
2. En escritorio se agrega Contabilidad a las pestañas del taller; en móvil se ubica dentro del menú de usuario para conservar el máximo de tres destinos de la barra inferior Banco.
3. Crear un dominio monetario contable específico que convierta las cadenas decimales a céntimos exactos mediante `BigInt`; no reutilizar `parseMoney` para importes contables máximos porque limita a siete enteros y usa `Number`.
4. Cada borrador de alta conserva una clave UUID. Un reintento idéntico mantiene la clave; al cambiar el payload se crea una clave nueva. Un doble clic no genera una segunda petición.
5. El frontend implementa solo un cliente para el contrato backend, resumen UI del contrato y pruebas de respuestas; no mantiene una copia alternativa del OpenAPI canónico.
6. La conexión contable usa `VITE_API_URL` con fallback same-origin `/backend`; si no se configura en desarrollo, la UI informa que no está disponible y nunca crea asientos demostrativos.

## Project Structure

### Documentation (this feature)

```text
specs/003-asientos-contables/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── accounting-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Fase posterior: speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── App.jsx                         # Rutas protegidas de contabilidad
│   └── layouts/StaffLayout.jsx         # Enlace ADMIN en escritorio y menú móvil
├── domain/
│   └── accounting.js                   # Importes exactos, balance y formato
├── features/
│   ├── auth/                           # Persistencia del rol real conservando client/staff
│   └── accounting/                     # API, lista, formulario, detalle y reversión
├── shared/
│   └── styles/                         # Extensión de estilos del taller/Banco
└── state/                              # Sesión existente

tests/
├── integration/                        # Lista, formulario, detalle, permisos y rutas
└── unit/                               # Dominio monetario y cliente contable
```

**Structure Decision**: Aplicación web única ya existente. La funcionalidad se organiza en `src/features/accounting/`; reglas puras de montos quedan en `src/domain/`; sesión y composición conservan sus capas actuales. No se crean carpetas backend ni nuevas capas globales.

## Phase 0: Research

Ver [research.md](research.md). No quedan decisiones abiertas: el contrato OpenAPI canónico está disponible; el estilo Banco y las reglas de rol/moneda se verificaron en el código del repositorio. Se aclaran expresamente la pérdida actual del rol real y el límite de precisión monetaria de la utilidad compartida.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md): modelos UI derivados del contrato, sin persistencia local.
- [contracts/accounting-ui.md](contracts/accounting-ui.md): vistas, navegación, estados y traducción de respuestas esperadas; referencia el OpenAPI backend.
- [quickstart.md](quickstart.md): validación con servidor de prueba y suite local del frontend.
- Sin migraciones frontend ni copia del OpenAPI backend.

## Constitution Check (post-design)

| Gate | Estado | Resultado del diseño |
|---|---|---|
| Permisos financieros | PASS | Solo navegación/pantallas ADMIN; toda lectura/escritura sigue protegida por sesión y backend. |
| Exactitud monetaria | PASS | Enteros exactos en céntimos con `BigInt` en dominio; cadenas decimales en el límite HTTP. |
| Privacidad | PASS | No persistir formularios financieros ni credenciales en `sessionStorage`/`localStorage`; no loguear cuerpos. |
| No mutación del historial | PASS | No hay edición/borrado; la corrección crea una reversión vinculada. |
| Consistencia backend/frontend | PASS | Filtros, campos, límites, errores y estados se derivan del OpenAPI; backend conserva la autoridad. |
| Diseño y capas | PASS | Se reutilizan navegación, formularios, alertas, diálogos, paginación y tokens Banco. |
| Pruebas | PASS | Cliente con fetch simulado, dominio exacto, rutas por rol y flujos accesibles con Testing Library. |

No se identificaron violaciones posteriores al diseño.
