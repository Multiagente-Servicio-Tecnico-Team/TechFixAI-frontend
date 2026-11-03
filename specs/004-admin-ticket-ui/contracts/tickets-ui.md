# Contrato UI: Gestión administrativa de tickets

El backend OpenAPI es la fuente de verdad HTTP: [admin-tickets.openapi.yaml](../../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/004-gestion-admin-tickets/contracts/admin-tickets.openapi.yaml). Este documento define presentación e interacción; no duplica el contrato HTTP.

## Acceso y navegación

- Con el cliente administrativo configurado, el Banco, alta y detalle solo se presentan a `accountRole=ADMIN`.
- TECHNICIAN conserva las rutas no administrativas del taller, pero no los enlaces ni acciones de tickets ADMIN.
- El backend vuelve a comprobar ADMIN con la cookie HttpOnly en todas las rutas. No se manda el rol, correo ni ID del actor en los cuerpos.
- En modo demo sin URL de tickets en desarrollo se conserva la experiencia actual. Errores de una URL configurada nunca activan modo demo.

## Banco

- Mantener el diseño Banco, tablero por estaciones, tarjetas, filtros, estado accesible y comportamiento móvil existente.
- Mostrar cinco tipos, diez estados y los tres orígenes (incluyendo Desconocido cuando `origin` sea nulo), con etiquetas en español.
- Búsqueda y filtros combinables se envían al listado backend. Cada resultado del API se normaliza; las estaciones agrupan por estado canónico.
- Los estados `total`, carga, sin resultados, error y reintento se anuncian mediante elementos accesibles.
- El selector de estación y «Mostrar más» mantienen su comportamiento visual sobre los resultados recibidos.
- Exportar todos los resultados coincidentes recorriendo páginas del backend, no únicamente los primeros 50/200 ni la página actualmente visible.
- Cambiar estado desde una tarjeta envía PATCH. La tarjeta refleja la respuesta confirmada; ante error conserva estado anterior y permite reintento.

## Alta manual

- Conservar el formulario Banco de mostrador: nombre, teléfono, correo opcional, equipo/modelo, tipo de solicitud, detalle y adelanto opcional.
- Mostrar los cinco tipos traducidos; enviar el código canónico del selector.
- Traducir el método visible Yape/Plin, Efectivo o Tarjeta a `YAPE_PLIN`, `CASH` o `CARD`. Sin importe se omite el método.
- Bloquear doble envío; mantener campos en errores 401/403/409/422/503 o red; mostrar mensajes seguros y asociados al campo cuando aplique.
- Navegar con el `id` de ruta devuelto por el backend y presentar su `code`. No calcular un `TCK-*` local ni confirmar éxito antes de la respuesta 201.

## Detalle

- Consultar por `id` numérico backend, no por código visible.
- Presentar contacto con fallbacks para tickets ONLINE, fecha, equipo, detalle, tipo, origen, estado, cotización actual, adelanto, pago y auditoría disponibles.
- En esta feature el estado es el único campo editable; guardar envía un PATCH parcial y la UI usa el DTO devuelto.
- Mostrar el adelanto y la cotización como importes separados; no sumar, recalcular ni inferir saldo.
- La cotización existente es de solo lectura: el contrato expone solo la última cotización agregada y no sus líneas. No mostrar formulario para crear/editar cotización.
- Ofrecer cancelar cambiando estado a `CANCELLED`; no mostrar botón DELETE.
- Ticket faltante ofrece regreso al Banco; errores de autenticación/acceso no exponen trazas ni datos de API.

## Respuestas y mensajes

| Resultado | Comportamiento UI |
|---|---|
| 200/201 | Usar la respuesta del servidor, sin generar IDs/estados localmente. |
| 401 | Cerrar estado transitorio sensible y llevar al acceso del taller, preservando ruta de retorno. |
| 403 | Mensaje de permiso insuficiente; no mostrar datos. |
| 404 | Informar que el ticket ya no existe y volver al Banco. |
| 409 | Conflicto: conservar formulario/estado previo y ofrecer actualización. |
| 422 | Mensaje seguro y asociación a contacto/título/detalle/adelanto cuando se identifique. |
| 503/red | Mensaje genérico y reintento; no reemplazar datos reales por demo. |

## Accesibilidad y visual

- Reutilizar `Field`, `FormAlert`, `Toast`, botones, sellos, iconos y tokens del sistema Banco.
- Labels explícitos, errores vinculados, foco visible, navegación por teclado y estados de carga con `role=status`.
- En 360, 390, 768 y 1024 px no debe aparecer desplazamiento horizontal de página; conservar el tablero móvil por estación.
