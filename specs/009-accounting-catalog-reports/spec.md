# Feature Specification: Catálogo contable y reportes del taller

**Feature Branch**: `[009-accounting-catalog-reports]`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Continuar el Specify del frontend para que consuma el catálogo contable, los periodos y los reportes añadidos al backend, haciendo las modificaciones necesarias y manteniendo el diseño existente."

## User Scenarios & Testing

### User Story 1 - Administrar planes y cuentas y usarlos en asientos (Priority: P1)

Una persona ADMIN consulta el plan contable activo, busca cuentas por código o denominación y administra planes alternativos y cuentas. Al registrar un asiento elige un plan y selecciona una cuenta válida para cada línea, en vez de escribir libremente su código y nombre. La vista conserva los asientos antiguos con las denominaciones guardadas en su momento.

**Why this priority**: El catálogo compartido evita errores de digitación, permite agrupar los movimientos por cuenta y conecta el registro diario con los reportes.

**Independent Test**: Con una sesión ADMIN y el plan PCGE disponible, buscar una cuenta por código y por nombre, crear un plan alternativo, cambiar explícitamente el plan predeterminado y registrar un asiento balanceado con cuentas imputables del plan seleccionado. Confirmar que los datos históricos siguen mostrando sus snapshots originales.

**Acceptance Scenarios**:

1. **Given** una persona ADMIN en Contabilidad, **When** abre Planes y cuentas, **Then** ve los planes disponibles, identifica el predeterminado y puede explorar las cuentas por jerarquía, código, nombre, estado e imputabilidad.
2. **Given** un catálogo extenso, **When** busca por código o una parte de la denominación, **Then** puede localizar una cuenta sin recorrer manualmente todas las páginas.
3. **Given** una persona ADMIN autorizada, **When** crea un plan alternativo, **Then** queda disponible sin reemplazar el predeterminado hasta que se solicite explícitamente ese cambio.
4. **Given** una cuenta nueva o existente, **When** la persona crea o actualiza su denominación, jerarquía, naturaleza, imputabilidad, estado o vigencia, **Then** la interfaz refleja el resultado confirmado por el backend y no ofrece una acción de borrado físico.
5. **Given** el formulario de asiento, **When** se agrega una línea, **Then** se selecciona una cuenta activa, imputable y vigente a la fecha de operación, y cada línea pertenece al plan escogido.
6. **Given** un cambio de plan en un asiento aún no enviado, **When** las cuentas elegidas pertenecen al plan anterior, **Then** la interfaz pide seleccionarlas de nuevo antes de permitir el envío.
7. **Given** un asiento histórico sin cuenta vinculada, **When** se consulta su detalle, **Then** se presentan el código y la denominación históricos identificándolos como no vinculados, sin intentar asignarles una cuenta automáticamente.

### User Story 2 - Consultar y controlar periodos mensuales (Priority: P1)

Una persona ADMIN revisa los periodos contables mensuales y su historial. Puede cerrar un periodo abierto o reabrir uno cerrado indicando el motivo; antes de confirmar, la interfaz explica que el cierre bloquea nuevos asientos y reversiones en ese mes.

**Why this priority**: El control visible del periodo ayuda a evitar registros en meses cerrados y deja clara la razón de una reapertura.

**Independent Test**: Consultar periodos, cerrar un mes, revisar quién y cuándo lo cerró, comprobar que la interfaz advierte sobre el bloqueo y reabrirlo con motivo, verificando ambos eventos en su historial.

**Acceptance Scenarios**:

1. **Given** una persona ADMIN, **When** abre Periodos, **Then** puede filtrar por rango de meses y estado y ver las fechas y responsables de la última transición.
2. **Given** un mes abierto o aún no inicializado, **When** ADMIN solicita cerrarlo, **Then** la interfaz exige confirmación y muestra el mes afectado y el efecto del cierre.
3. **Given** un mes cerrado, **When** ADMIN solicita reabrirlo, **Then** debe ingresar un motivo antes de confirmar.
4. **Given** el historial de un periodo, **When** ADMIN lo consulta, **Then** ve las transiciones en orden con acción, fecha, responsable y motivo disponible, y puede recorrer todas las páginas.
5. **Given** que otro proceso cerró el periodo mientras el formulario de asiento estaba abierto, **When** el backend rechaza el registro, **Then** se comunica el conflicto y se ofrece actualizar el estado del periodo sin presentar el asiento como guardado.

### User Story 3 - Consultar y exportar reportes contables (Priority: P1)

Una persona ADMIN consulta el diario, el mayor de una cuenta y el balance de comprobación para un rango de fechas. Puede aplicar los filtros disponibles en cada reporte, recorrer los resultados y descargar el mismo conjunto en CSV o XLSX.

**Why this priority**: Los reportes convierten los asientos en consultas útiles para revisar los movimientos y preparar el trabajo administrativo.

**Independent Test**: Para un rango con asientos originales, reversas y líneas históricas, consultar los tres reportes con filtros; comparar las filas y totales con el resultado exportado en ambos formatos.

**Acceptance Scenarios**:

1. **Given** un rango de fechas, **When** ADMIN consulta el diario, **Then** ve movimientos ordenados y los totales de debe y haber, con filtros de plan y estado.
2. **Given** una cuenta del catálogo, **When** ADMIN consulta su mayor, **Then** ve saldo inicial, movimientos ordenados, saldo acumulado y totales del periodo.
3. **Given** una línea histórica no vinculada al catálogo, **When** ADMIN necesita consultar su mayor, **Then** puede filtrar por el código y denominación snapshot exactos sin que la UI los trate como una cuenta nueva.
4. **Given** un plan y un rango, **When** ADMIN consulta el balance de comprobación, **Then** ve por cuenta saldos iniciales, débitos, créditos y saldos finales con sus totales de control.
5. **Given** filtros aplicados a un reporte, **When** ADMIN solicita CSV o XLSX, **Then** recibe un archivo que conserva rango, filtros, filas y totales del mismo reporte.
6. **Given** un reporte JSON paginado, **When** ADMIN avanza o vuelve de página, **Then** los filtros actuales se mantienen.
7. **Given** que un reporte excede el límite de exportación, **When** ADMIN solicita descargarlo, **Then** se informa que debe reducir el rango o aplicar filtros y no se entrega un archivo parcial.

### Edge Cases

- Una sesión expirada o un rol distinto de ADMIN no debe mostrar ni conservar datos contables en pantalla.
- El backend puede no estar disponible; la UI muestra un estado recuperable con reintento y no sustituye datos financieros reales con registros de demostración.
- El catálogo puede estar vacío, la búsqueda puede no encontrar coincidencias o una cuenta puede estar inactiva o fuera de vigencia para la fecha elegida.
- Cambiar el plan de un asiento no enviado invalida las cuentas seleccionadas previamente, pero conserva las fechas, importes y descripciones que aún sean válidos.
- La lista puede cambiar mientras se pagina; filtros nuevos vuelven a la primera página.
- Un periodo sin registro previo se puede cerrar mediante la selección explícita del mes; la UI no lo presenta como periodo abierto hasta recibir la respuesta del backend.
- Una exportación puede responder con un error JSON en vez de archivo; el error debe mostrarse en la interfaz y no descargarse como archivo dañado.
- Una cuenta histórica sin naturaleza conocida debe conservar su marca de dato histórico/desconocido en lugar de inventar una naturaleza.
- Los valores PCGE y las categorías de saldo normal no deben mostrarse como certificación tributaria ni como presentación PLE ante SUNAT.
- Todas las pantallas deben seguir siendo utilizables con teclado, foco visible, tema claro/oscuro y anchos móviles de 360, 390, 768 y 1024 píxeles.

## Requirements

### Functional Requirements

- **FR-001**: Solo ADMIN puede ver y usar los módulos de planes, cuentas, periodos y reportes; los demás roles no pueden acceder a ellos mediante navegación ni ruta directa.
- **FR-002**: La experiencia se integra en el área Contabilidad y conserva las pantallas actuales de listado, alta, detalle y reversión de asientos.
- **FR-003**: ADMIN puede consultar planes contables y reconocer cuál es el predeterminado, su edición, jurisdicción, fuente, vigencia y estado.
- **FR-004**: ADMIN puede crear un plan alternativo y seleccionar de forma explícita el plan predeterminado para nuevas operaciones, sin modificar asientos históricos.
- **FR-005**: ADMIN puede buscar y explorar cuentas por plan, código o denominación, y filtrar por cuenta padre, estado e imputabilidad con paginación.
- **FR-006**: ADMIN puede agregar cuentas con padre opcional, grupo, saldo normal, vigencia e imputabilidad, y actualizar sus atributos permitidos; las cuentas referenciadas se desactivan en vez de borrarse.
- **FR-007**: El alta de asientos presenta la cuenta de cada línea como selección del catálogo del plan elegido. Solo permite enviar cuentas activas, imputables y vigentes para la fecha del asiento, todas pertenecientes al mismo plan.
- **FR-008**: Cada asiento nuevo muestra el plan y las cuentas que el backend confirmó como guardados, conservando las denominaciones aplicadas a sus líneas.
- **FR-009**: La UI conserva los códigos y denominaciones snapshot de las líneas históricas sin vínculo y las identifica como históricas/no vinculadas; no asigna vínculos por coincidencia textual.
- **FR-010**: ADMIN puede consultar periodos mensuales por rango y estado, cerrar un mes, reabrirlo con motivo obligatorio y consultar todas sus transiciones auditadas con paginación.
- **FR-011**: Antes de cerrar o reabrir un mes, la interfaz muestra el periodo y la consecuencia de la acción, y exige confirmación explícita.
- **FR-012**: El formulario advierte si la fecha seleccionada pertenece a un periodo cerrado; si el estado cambia antes de guardar, informa que no se registró el asiento y permite actualizar la información.
- **FR-013**: ADMIN puede consultar diario, mayor y balance de comprobación por rangos inclusivos de fecha, con los filtros disponibles para cada consulta.
- **FR-014**: ADMIN puede recorrer las respuestas paginadas en JSON y descargar CSV o XLSX respetando filtros y totales, sin ocultar truncamiento ni exceso de filas.
- **FR-015**: La UI maneja sesión vencida, falta de autorización, dato inexistente, conflicto de periodo/cuenta, validación, servicio no disponible y límite de exportación con mensajes recuperables, sin revelar trazas ni consultas.
- **FR-016**: La UI no completa con datos financieros ficticios cuando el backend o el catálogo están vacíos o no disponibles.
- **FR-017**: Las vistas reutilizan el estilo y patrones existentes del taller, mantienen contraste en tema claro/oscuro, accesibilidad por teclado y diseños sin desbordamiento horizontal en los anchos definidos.
- **FR-018**: La interfaz identifica el PCGE y sus datos de fuente/edición sin afirmar que el sistema presenta libros PLE o certifica cumplimiento tributario.
- **FR-019**: Los cambios de plan predeterminado, cuenta, periodo y asiento solo se muestran como realizados después de que la operación correspondiente haya sido confirmada.
- **FR-020**: Al seleccionar una cuenta para una línea contable, la interfaz completa la descripción con la denominación de la cuenta padre; si no tiene padre, usa la propia denominación. ADMIN puede editar la descripción después del autocompletado.

### Key Entities

- **Plan contable**: Catálogo versionado con edición, jurisdicción, fuente, vigencia, estado y elección predeterminada.
- **Cuenta contable**: Elemento jerárquico de un plan con código, denominación, padre opcional, grupo, saldo normal, vigencia, estado e imputabilidad.
- **Periodo contable**: Mes calendario con estado y transiciones auditadas por actor, fecha y motivo.
- **Asiento contable**: Registro existente con fecha, categoría, concepto, estado, totales, responsable, plan opcional y sus líneas.
- **Línea contable**: Movimiento debe/haber enlazado a una cuenta cuando se creó con el catálogo; las líneas previas conservan sus snapshots y pueden carecer de vínculo.
- **Reporte contable**: Consulta del diario, mayor o balance de comprobación para un rango y filtros, con filas y totales exportables.

## Success Criteria

### Measurable Outcomes

- **SC-001**: ADMIN encuentra una cuenta entre las 1,192 cuentas del plan inicial mediante código o nombre en menos de 2 segundos en condiciones normales de uso.
- **SC-002**: El 100% de los asientos nuevos que se envían desde la UI tiene un plan seleccionado y una cuenta válida del mismo plan en cada línea.
- **SC-003**: Las consultas JSON, CSV y XLSX con los mismos filtros representan el mismo rango y conjunto de movimientos; ningún archivo excedido se presenta como completo.
- **SC-004**: El 100% de las acciones de cierre y reapertura requieren una confirmación explícita; la reapertura no se envía sin motivo.
- **SC-005**: Los asientos históricos permanecen legibles y conservan la denominación capturada sin asignación automática.
- **SC-006**: Las pantallas contables no presentan desplazamiento horizontal a 360, 390, 768 y 1024 píxeles de ancho.
- **SC-007**: Todos los filtros, campos, selectores, acciones y diálogos pueden operarse por teclado y comunican errores y cambios de estado a tecnologías de asistencia.

## Assumptions

- La autenticación actual por cookie y la protección ADMIN del área del taller se reutilizan sin cambios.
- El plan PCGE Perú Modificado 2019 y sus 1,192 cuentas ya están cargados en la base de pruebas y aparecen como plan predeterminado.
- El backend ya expone las rutas de catálogo, periodos y reportes documentadas en `specs/009-catalogo-cuentas-consultas-contables/contracts/accounting-catalog.openapi.yaml` del repositorio backend.
- Las cuentas de saldo normal e imputabilidad inicial pueden requerir revisión contable; la UI presenta los valores recibidos y no los certifica.
- Esta especificación cubre el frontend; no agrega autenticación, reglas contables, presentación PLE ni cambios de esquema/backend.
- Los asientos históricos no se migran ni se editan desde el frontend.
