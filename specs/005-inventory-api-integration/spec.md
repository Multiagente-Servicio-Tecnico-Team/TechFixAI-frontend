# Feature Specification: Integración del inventario con el backend

**Feature Branch**: 005-inventory-api-integration  
**Created**: 2026-11-02  
**Status**: Draft  
**Input**: User description: Usa speckit-specify para el frontend; revisa el inventario para que consuma la API del backend y sea consistente.

## User Scenarios & Testing

### User Story 1 - Consultar el inventario vigente (Priority: P1)

Como integrante autorizado del taller, quiero consultar los repuestos activos y encontrar artículos por nombre, código o categoría para revisar existencias y precios vigentes.

**Why this priority**: La consulta fiable es la base del inventario y evita tomar decisiones con datos locales de demostración cuando el backend está configurado.

**Independent Test**: Iniciar sesión como ADMIN o TECHNICIAN y abrir Inventario; comprobar que aparecen los artículos devueltos por el backend, sus existencias, precios y categorías, y que búsqueda, filtros, orden y paginación operan sobre esos datos.

**Acceptance Scenarios**:

1. **Given** el personal inició sesión y hay artículos activos, **When** abre Inventario, **Then** ve los valores de precio, existencias, mínimo y categoría recibidos del backend.
2. **Given** hay categorías distintas en el catálogo, **When** el personal filtra por una categoría, **Then** ve únicamente los artículos cuyo valor de categoría coincide.
3. **Given** el catálogo está vacío, **When** el personal abre Inventario, **Then** ve un estado vacío con una acción para registrar el primer repuesto, no datos de demostración.
4. **Given** el backend no responde, **When** el personal intenta cargar Inventario, **Then** ve un error recuperable y puede reintentar; la pantalla no presenta datos de demostración como vigentes.

---

### User Story 2 - Registrar y actualizar repuestos (Priority: P2)

Como integrante autorizado del taller, quiero registrar repuestos y mantener sus datos al día para que el inventario compartido refleje los cambios confirmados.

**Why this priority**: La consulta por sí sola no permite mantener el catálogo y las existencias correctas.

**Independent Test**: Crear un repuesto con una categoría existente y otro con una categoría nueva; editar nombre, descripción, precio y existencias; volver al listado y comprobar los valores confirmados.

**Acceptance Scenarios**:

1. **Given** el formulario está completo con datos válidos, **When** el personal registra un repuesto, **Then** aparece en el inventario únicamente después de que el backend confirme su creación.
2. **Given** el personal está editando un repuesto, **When** guarda cambios válidos, **Then** el listado refleja la respuesta confirmada y el código SKU permanece asociado al mismo repuesto.
3. **Given** el backend rechaza un código duplicado o datos inválidos, **When** el personal guarda, **Then** se muestra un mensaje asociado al problema y se conservan los datos introducidos para corregirlos.
4. **Given** el personal registra o actualiza un repuesto con una categoría nueva, **When** el backend confirma el cambio, **Then** el valor aparece como opción y conserva exactamente el texto canónico.

---

### User Story 3 - Eliminar repuestos con referencias protegidas (Priority: P3)

Como integrante autorizado del taller, quiero retirar repuestos que ya no deben estar disponibles y entender por qué no se pueden retirar si forman parte de un presupuesto.

**Why this priority**: La eliminación requiere proteger el historial comercial y explicar los conflictos al personal.

**Independent Test**: Eliminar un repuesto no referenciado y confirmar que desaparece; intentar eliminar uno asociado a un presupuesto y confirmar que permanece y se informa el motivo.

**Acceptance Scenarios**:

1. **Given** el repuesto no está referenciado por un presupuesto, **When** el personal confirma su eliminación, **Then** desaparece del catálogo tras la confirmación del backend.
2. **Given** el repuesto está referenciado por un presupuesto, **When** el personal intenta eliminarlo, **Then** el repuesto se conserva y la interfaz explica que no se puede eliminar por esa referencia.
3. **Given** el repuesto dejó de existir antes de completar una edición o eliminación, **When** el backend informa que no existe, **Then** la interfaz lo comunica y permite volver a cargar el inventario.

### Edge Cases

- La sesión caduca mientras se consulta o modifica el inventario: informar que se debe iniciar sesión de nuevo y evitar simular una operación exitosa.
- Una cuenta CUSTOMER intenta acceder a inventario: no permitir la consulta ni mostrar controles de gestión.
- El catálogo no contiene categorías todavía: el formulario debe permitir introducir una categoría válida sin depender de una lista precargada.
- El valor de categoría tiene espacios, tildes o diferencias de mayúsculas: conservarlo y no traducirlo ni reemplazarlo silenciosamente.
- Una solicitud de escritura falla por red o indisponibilidad: conservar el formulario y el estado previo hasta reintentar o recibir confirmación.
- Un artículo desaparece o entra en conflicto mientras el usuario lo tiene abierto: mostrar el error recuperable sin descartar sus datos de formulario.
- Los precios incluyen centavos: mostrar y enviar importes con dos decimales, sin pérdida de precisión.
- La respuesta no contiene una lista válida o es incompleta: mostrar un error recuperable en vez de renderizar datos falsos o marcar la operación como exitosa.

## Requirements

### Functional Requirements

- **FR-001**: El personal ADMIN y TECHNICIAN debe poder consultar el catálogo de repuestos activos desde el backend.
- **FR-002**: El listado debe mostrar código, nombre, categoría, descripción disponible, precio, existencias y umbral mínimo usando valores confirmados por el backend.
- **FR-003**: El personal debe poder buscar y filtrar el catálogo por código, nombre y categoría sin alterar los valores almacenados.
- **FR-004**: Las categorías visibles deben derivarse de los valores del backend, no de una lista fija que pueda divergir del catálogo.
- **FR-005**: El personal debe poder seleccionar una categoría existente o introducir una nueva categoría no vacía dentro del límite aceptado por el servicio.
- **FR-006**: La aplicación debe conservar el valor original de la categoría para filtrar, editar y enviar; la presentación visual no debe cambiar el dato canónico.
- **FR-007**: El personal debe poder registrar un repuesto con código, nombre, categoría, precio, existencias y umbral mínimo, además de descripción opcional.
- **FR-008**: El personal debe poder actualizar los datos permitidos de un repuesto sin cambiar su código de identificación.
- **FR-009**: La aplicación debe validar los campos antes de enviarlos y presentar errores de duplicidad y validación para que el usuario pueda corregirlos.
- **FR-010**: Los importes deben conservar dos posiciones decimales entre el formulario, el listado y el backend.
- **FR-011**: El personal debe poder solicitar la eliminación de un repuesto y recibir confirmación antes de retirarlo del listado.
- **FR-012**: Si el backend impide eliminar un repuesto usado en un presupuesto, la interfaz debe conservarlo y explicar el conflicto.
- **FR-013**: La interfaz debe distinguir entre sesión vencida, falta de permisos, artículo inexistente, conflicto de eliminación, datos inválidos e indisponibilidad temporal mediante mensajes en español.
- **FR-014**: Las operaciones confirmadas deben actualizar la vista; ante fallas, no se deben presentar cambios optimistas como persistidos.
- **FR-015**: Cuando el acceso al backend está configurado, una falla de carga no debe reemplazar el catálogo por información de demostración.
- **FR-016**: La experiencia debe conservar la identidad visual actual del taller, sus estados de carga y error, y el comportamiento adaptable a móvil.
- **FR-017**: El inventario debe seguir restringido al personal del taller y mantener la protección de rutas existente.

### Key Entities

- **Repuesto**: artículo del catálogo con código, nombre, categoría, descripción opcional, precio unitario, existencias, umbral mínimo y estado activo.
- **Categoría**: texto asociado a repuestos; su valor canónico procede del backend y puede ampliarse.
- **Sesión de personal**: identidad autenticada que determina si ADMIN o TECHNICIAN puede consultar y gestionar inventario.
- **Referencia de presupuesto**: vínculo que puede impedir retirar un repuesto y protege la integridad del historial.

## Success Criteria

### Measurable Outcomes

- **SC-001**: En una sesión válida de personal, el 100 % de artículos activos devueltos por el servicio se puede consultar sin sustituirlos por datos de demostración.
- **SC-002**: El personal puede localizar un repuesto por código, nombre o categoría en menos de 30 segundos en una prueba manual de aceptación.
- **SC-003**: El 100 % de las altas y ediciones confirmadas muestra los valores devueltos por el servicio, incluidos precio y existencias.
- **SC-004**: El 100 % de los intentos de eliminación bloqueados por una referencia conserva el repuesto y explica el conflicto.
- **SC-005**: Una falla de red, sesión o permisos nunca aparece como una carga vacía exitosa ni como una modificación persistida.
- **SC-006**: Las tareas de consultar, filtrar, registrar, editar y eliminar se completan en anchos de 360, 390, 768 y 1024 píxeles sin desplazamiento horizontal.

## Assumptions

- El contrato canónico está en ../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/005-api-inventario/contracts/inventory.openapi.yaml; esta especificación frontend no redefine sus rutas ni esquemas.
- El servicio implementa consulta y CRUD de repuestos, categorías activas, errores de sesión/permisos y conflicto al eliminar artículos usados por presupuestos.
- La sesión autenticada usa el mecanismo de cookie existente; el frontend no obtiene ni almacena un token de sesión.
- Se conservan pantallas, rutas, validaciones de dominio y estilo visual existentes, ampliándolos para usar el servicio configurado.
- El modo de demostración sin servicio configurado puede mantenerse para desarrollo; al configurar el servicio, sus errores se presentan como errores y no como datos reales.
- El servicio es la fuente de verdad para categorías y artículos activos; categorías nuevas aparecen en las opciones después de confirmar un repuesto con ese valor.

## Dependencies

- Backend: contrato y disponibilidad del servicio definido en la especificación OpenAPI referenciada.
- Autenticación: sesión vigente de ADMIN o TECHNICIAN.
- Interfaz existente: área Taller, rutas y componentes actuales de inventario.
