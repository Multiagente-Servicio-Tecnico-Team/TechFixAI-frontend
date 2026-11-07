# UI Contract: Contabilidad del taller

Este contrato establece qué debe poder hacer y ver una persona en el frontend y cómo la UI refleja las respuestas del backend. El contrato HTTP completo y canónico sigue en [backend OpenAPI](../../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/003-asientos-contables/contracts/accounting.openapi.yaml); no se duplica aquí.

## Navegación y acceso

- La capacidad se encuentra en el área del taller.
- ADMIN ve Contabilidad en navegación de escritorio y en el menú de usuario en móvil.
- TECHNICIAN y CUSTOMER no ven el acceso; la ruta directa muestra el resultado de acceso restringido definido por el frontend.
- Una sesión vencida vuelve al acceso del personal. La autorización del backend sigue siendo obligatoria en cada lectura/escritura.
- La barra inferior móvil mantiene los tres destinos de Banco ya existentes.

## Vistas

### Listado

- Encabezado de página «Contabilidad» y acción principal «Nuevo asiento».
- Resumen por fila/tarjeta: correlativo, fecha de operación, concepto, categoría, monto PEN, estado y responsable.
- Filtros: desde, hasta, categoría, estado y correlativo; acción visible para limpiar filtros.
- Orden descendente por fecha de operación y correlativo.
- Paginación según backend: 50 por defecto, máximo 100; mostrar total y contexto de página.
- Estados accesibles: carga (`role=status`), error con reintento, lista vacía y sin coincidencias.
- Escritorio conserva jerarquía y bordes/tipografía Banco; móvil reorganiza cada fila como tarjeta sin scroll horizontal.

### Alta

- Campos generales: fecha de operación, categoría, concepto y detalle.
- Líneas editables: código de cuenta, nombre, descripción opcional, debe y haber; añadir y quitar filas manteniendo mínimo dos y máximo 100.
- Cada línea habilita un único lado con importe positivo y limpia/inhabilita el lado contrario; la UI muestra debe, haber y diferencia.
- Los importes mantienen dos decimales exactos hasta 12 dígitos enteros. El monto se transforma a texto decimal para el envío; no se redondea con coma flotante.
- La acción de confirmar abre una revisión que explica que el asiento se registrará confirmado y no podrá editarse/eliminarse; doble envío bloqueado.
- Alta usa el header `Idempotency-Key` UUID; 201 y replay 200 muestran el mismo resultado aceptado. 409 con payload distinto ofrece revisar/iniciar operación nueva sin presentar alta exitosa.
- Tras alta, mostrar correlativo, datos clave y enlaces a detalle/listado.

### Detalle

- Presentar encabezado, estado, correlativo, fecha operación, fecha creación/actualización, categoría, responsable, concepto y detalle.
- Presentar todas las líneas en orden con código/nombre/descripción y columnas debe/haber; totales deben coincidir.
- Mostrar cronología con actor, fecha, tipo de evento, razón y asiento relacionado cuando existan.
- Si `reversal_of_entry_id` o `reversal_entry_id` existe, ofrecer enlace al registro asociado.
- No incluir acciones de edición/eliminación. Mostrar «Revertir asiento» solo al original confirmado que no tenga reversión.

### Reversión

- Solicitar fecha de operación y razón obligatoria (máximo 2000 caracteres).
- Confirmación explica que se creará un nuevo asiento compensatorio con lados intercambiados y el original pasará a «Revertido».
- 201 muestra original y nueva reversa; 200 es replay de la misma reversión; 409 vuelve a consultar y actualiza el estado; 401/403 no exponen datos.
- Cancelar no modifica el original.

## Respuestas y mensajes

| Resultado backend | Comportamiento UI |
|---|---|
| 200/201 | Mostrar el registro devuelto; no inferir correlativo, responsable ni resultado desde el formulario. |
| 401 | Limpiar estado financiero sensible en memoria y dirigir a acceso con retorno a la pantalla. |
| 403 | Mensaje de acceso restringido; no mostrar la respuesta financiera. |
| 404 | Informar que el asiento ya no está disponible y permitir volver a lista. |
| 409 | Alta: distinguir clave/payload en conflicto. Reversión: actualizar el detalle existente. |
| 422 | Mensaje de validación seguro; asociar a campo/línea cuando el error identifique el campo. |
| 503/red | Mensaje genérico, conservar formulario para reintento; no exponer trazas/SQL. En alta incierta, mantener la misma UUID y carga. |

## Visual y accesibilidad

- Reutilizar `Field`, `Input`, `FormAlert`, paginación, diálogo, sellos, tokens y patrones de página existentes donde correspondan.
- Sin nueva paleta ni sombra/superficie que contradiga Banco; respetar tema claro/oscuro y foco visible.
- Inputs y botones con nombre accesible, errores asociados al campo, resumen anunciado, tablas con encabezados; usar tarjetas con etiquetas en móvil.
- Confirmaciones usan diálogo accesible con foco atrapado/devuelto, Escape/cancelación antes de enviar y estado ocupado.
