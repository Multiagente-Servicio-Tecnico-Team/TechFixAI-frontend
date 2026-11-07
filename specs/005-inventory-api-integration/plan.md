# Implementation Plan: Integración del inventario con el backend

**Branch**: 005-inventory-api-integration | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from /specs/005-inventory-api-integration/spec.md

## Summary

Conectar de forma completa y consistente la pantalla existente de inventario con el contrato backend 005. Se reutilizarán el cliente CRUD, las rutas y el estilo del taller que ya existen; el trabajo se concentra en cargar categorías del catálogo, permitir categorías nuevas al guardar repuestos, evitar que el modo API muestre datos demo y corregir la configuración/documentación obsoleta. El contrato backend sigue siendo la fuente de verdad y no se crearán rutas ni tablas nuevas.

## Technical Context

**Language/Version**: JavaScript ES modules; React 18.3; Vite 5.4.

**Primary Dependencies**: React, React Router 6, fetch nativo; cliente de inventario y componentes compartidos existentes. No se agregan dependencias.

**Storage**: Persistencia en backend vía API; estado React/store compartido en frontend. Sin almacenamiento local persistente nuevo.

**Testing**: Vitest 2, Testing Library y jsdom; ampliar los casos existentes en tests/unit/inventory.test.js y tests/integration/inventory.test.jsx.

**Target Platform**: Aplicación web adaptable a móvil y escritorio; backend local o proxy de despliegue configurado.

**Project Type**: Aplicación frontend React separada del repositorio backend.

**Performance Goals**: Mantener la respuesta percibida existente; una tarea de búsqueda se completa en menos de 30 s según SC-002. No se define un SLA nuevo para el backend.

**Constraints**: Mantener cookies de sesión con credentials include; no almacenar tokens; solo ADMIN y TECHNICIAN; importes en céntimos en la UI y como texto decimal de dos posiciones en el contrato; no mostrar datos demo como datos reales cuando el servicio está activo; respetar el contrato backend sin modificarlo.

**Scale/Scope**: Una vista de listado y formularios de alta/edición/baja, tres rutas existentes, categorías dinámicas y estados de carga/error/vacío; sin cambios de backend ni de esquema.

## Constitution Check

**Gates before design**

- Separación de capas del frontend: PASS. Se extiende domain/inventory.js, features/workshop y shared/api existente; no se incorpora lógica de UI al dominio.
- Seguridad de sesión y permisos: PASS. Se mantiene la cookie HttpOnly existente y el control de acceso; no se lee identidad del formulario ni se guarda token.
- Exactitud monetaria: PASS. Se mantienen céntimos enteros en UI y conversión al texto decimal del contrato.
- Fuente de verdad y datos demo: PASS con requisito de diseño. La respuesta del backend prevalece; demo queda solo para desarrollo sin URL y no se muestra cuando el modo API está activo.
- Pruebas: PASS. Se amplían las pruebas unitarias y de integración de inventario existentes.
- Cambios de esquema: PASS. No se requieren migraciones ni modificaciones de base de datos.

No se identifican violaciones que requieran excepción.

## Project Structure

### Documentation (this feature)

    specs/005-inventory-api-integration/
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    ├── contracts/
    │   └── inventory-consumer.md
    └── tasks.md  # generado por speckit-tasks, no por este plan

### Source Code (repository root)

    src/
    ├── domain/
    │   └── inventory.js
    ├── features/
    │   └── workshop/
    │       ├── Inventory.jsx
    │       ├── PartForm.jsx
    │       ├── inventoryApi.js
    │       └── useInventory.js
    ├── shared/
    │   └── api/
    │       └── baseUrl.js
    └── state/
        └── store.jsx

    tests/
    ├── unit/
    │   └── inventory.test.js
    └── integration/
        └── inventory.test.jsx

**Structure Decision**: Aplicación frontend única. Se reutilizan los módulos y pruebas actuales de inventario; no se crea una capa de servicios paralela. El OpenAPI del backend se referencia desde contracts/ y permanece canónico en el repositorio backend.

## Phase 0: Research

Ver research.md. No quedan decisiones bloqueantes: el servicio, sus rutas, el modelo y los permisos están descritos en el contrato backend; la implementación frontend ya tiene cliente CRUD y pruebas.

## Phase 1: Design

Ver data-model.md, contracts/inventory-consumer.md y quickstart.md.

### Design decisions

- Extender el cliente inventoryApi existente con consulta de categorías y manejo de respuesta/errores; mantener un único cliente y la cookie de sesión.
- El endpoint de categorías solo consulta valores existentes. No existe CRUD independiente de categorías: el personal crea un valor nuevo al guardar un repuesto con esa categoría.
- Usar las categorías devueltas por backend para filtros y sugerencias del formulario; permitir texto nuevo válido y conservar literalmente el valor enviado.
- Si falla la consulta de categorías pero carga el listado de repuestos, derivar sugerencias de los artículos cargados y permitir introducir texto; informar de forma recuperable sin bloquear la consulta.
- Separar modo demo de modo API. En desarrollo, URL vacía puede conservar demo. En producción, la resolución debe usar el fallback de mismo origen /backend incluso cuando no se suministra URL absoluta; una falla del backend nunca activa demo.
- En modo API, no mostrar el estado inicial demo mientras carga la primera respuesta ni tras fallar esa carga. Solo renderizar datos confirmados por backend.
- Mantener la conversión de precios existente y validar la forma del payload para no convertir respuestas mal formadas en un catálogo vacío exitoso.
- No modificar OpenAPI, backend, roles, rutas de pantalla ni esquema de datos.

## Constitution Check (post-design)

- Separación de responsabilidades preservada: PASS.
- Sesión, roles y mensajes seguros preservados: PASS.
- Conversión monetaria exacta preservada: PASS.
- Sin fallback engañoso a datos demo en producción/API: PASS.
- Pruebas comparables de la interfaz y cliente: PASS.
- Sin migraciones ni cambios de persistencia: PASS.

## Complexity Tracking

No hay violaciones constitucionales ni nuevas abstracciones que justificar.
