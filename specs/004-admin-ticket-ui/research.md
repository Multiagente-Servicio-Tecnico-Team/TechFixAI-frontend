# Research: Conexión del panel administrativo de tickets

## Decision 1: Cliente API independiente para tickets administrativos

**Decision**: Añadir un cliente en `src/features/workshop/ticketsApi.js`, con `VITE_API_URL` como raíz backend, `credentials: "include"` y las rutas administrativas del OpenAPI backend. En producción sin URL explícita, usar el proxy same-origin `/backend`; en desarrollo sin URL, conservar el modo demo existente. Si la API configurada falla, mostrar error y reintento sin volver a datos demo.

**Rationale**: todas las funciones comparten una URL raíz. Los clientes agregan sus prefijos (`/auth` o `/api/...`) y mantienen separados sus contratos, permisos y manejo de errores.

**Alternatives considered**: Compartir cliente de API mezclaría contratos y políticas de errores; se comparte únicamente el origen configurado.

## Decision 2: El contrato OpenAPI del backend es la fuente de verdad

**Decision**: Consumir `GET/POST /api/admin/tickets`, `GET/PATCH /api/admin/tickets/{ticket_id}` y no duplicar el OpenAPI en el frontend. Enviar tipo, estado y origen como códigos canónicos; traducir únicamente las etiquetas visibles. Usar `items/total/limit/offset` para listados.

**Rationale**: El backend separado es la fuente de verdad. La ruta del portal `/api/customer/tickets` tiene permisos y proyección distintos y se conserva sin cambios.

**Alternatives considered**: Crear un segundo contrato editable en frontend produciría divergencias. Reusar `chatApi.listMyTickets()` entrega tickets del cliente, no del tablero administrativo.

## Decision 3: Normalizar el DTO de la API a un modelo de vista del taller

**Decision**: Mantener en `src/domain/tickets.js` mapas canónicos de cinco tipos y diez estados, y normalizar respuestas del backend a los campos que usan las tarjetas, el formulario y el detalle. Para tickets en línea, mostrar `customer_name`, `customer_phone` y `customer_email` cuando las columnas snapshot `contact_*` vengan vacías. Usar el entero `id` para rutas/operaciones y `code` como identificador visible. Tratar `origin=null` como desconocido.

**Rationale**: Las pantallas actuales esperan propiedades demo (`client`, `device`, `issue`, estados traducidos e ID `TCK-...`). El OpenAPI y el serializador backend devuelven nombres/códigos distintos; para online, el nombre del usuario viene como `customer_name`.

**Alternatives considered**: Adaptar cada componente a diferentes nombres del DTO multiplica condicionales. Usar `code` como parámetro de ruta falla porque el backend requiere `ticket_id` entero.

## Decision 4: Conservar los flujos de Banco, alta y detalle, y limitar edición a lo visible hoy

**Decision**: El Banco consulta el conjunto filtrado usando `status`, `request_type`, `origin` y `search`, recibe todas sus páginas con `limit` máximo 200 y mantiene el comportamiento de estaciones/«Mostrar más». Exportar todas las páginas con los filtros actuales. Las tarjetas y el detalle envían PATCH solo cuando cambia el estado, que es el control editable actual. El alta crea MANUAL y navega con el ID/código que devuelve el servidor. Los demás campos del detalle quedan de solo lectura.

**Rationale**: Es el alcance ya presente en `Workshop.jsx`, `NewTicket.jsx` y `TicketDetail.jsx`. El backend admite más campos PATCH, pero añadir un editor de contacto/equipo requeriría decisiones de UX que no forman parte de esta especificación.

**Alternatives considered**: Mantener el estado global como persistencia falsa deja de reflejar errores, IDs y auditoría del backend. Añadir un formulario completo de edición amplía el diseño sin solicitud ni controles actuales.

## Decision 5: Aislar rutas administrativas por rol real

**Decision**: Añadir un guard local de tickets que conserva acceso a la demostración cuando la URL de tickets está vacía y exige `accountRole="ADMIN"` cuando se usa el API; la denegación navega a una pantalla estática de acceso restringido, sin loop. En modo API se ocultan Banco/Nuevo Ticket al TECHNICIAN. Mantener `role="staff"` para el área y otras rutas permitidas. El backend vuelve a validar la sesión en cada solicitud.

**Rationale**: `ADMIN` y `TECHNICIAN` son ambos `staff` en `areaForRole`; las rutas backend se protegen con `require_admin`. La marca guardada en `sessionStorage` solo decide navegación, nunca sustituye la cookie HttpOnly ni la autorización backend.

**Alternatives considered**: Ocultar solo el enlace deja accesibles las rutas por URL. Aplicar `RequireRole accountRole=ADMIN` siempre rompe la demo de personal sin rol real; cambiar globalmente el modelo de roles afectaría inventario y rutas no relacionadas.

## Decision 6: Cotizaciones existentes de solo lectura

**Decision**: Mostrar en lista el `quote_total` disponible y en detalle los datos agregados de la última cotización (`quote_type`, mano de obra, repuestos, total, estado, observaciones y fecha) junto al adelanto. No llamar a `POST /quotes` ni calcular importes de cotización en frontend.

**Rationale**: El usuario limitó esta entrega a mostrar cotizaciones existentes. La ruta de cotizaciones requiere IDs numéricos y no hay actualmente ruta backend GET para enumerar repuestos/IDs. La proyección del detalle tampoco incluye líneas `quote_details`.

**Alternatives considered**: Inventar IDs, usar el SKU como ID o leer inventario demo generaría solicitudes inválidas o montos que no representan la fuente canónica.

## Decision 7: Errores y estado transitorio

**Decision**: Mapear 401, 403, 404, 409, 422, 503 y errores de red a mensajes seguros; mantener los datos del formulario al fallar el POST/PATCH; bloquear envío simultáneo; refrescar la consulta después de un cambio exitoso. No persistir formularios ni datos de tickets en `sessionStorage` o `localStorage`.

**Rationale**: La API devuelve `{detail, code?}` y sigue siendo responsable de permisos/validaciones. El frontend guarda solo los campos de sesión ya previstos y no debe convertir una respuesta HTTP fallida en éxito.

**Alternatives considered**: Exponer el detalle crudo puede filtrar información interna. Guardar cambios locales como confirmados ocultaría divergencias de persistencia.

## Repository evidence

- `src/features/workshop/Workshop.jsx`: tablero local, filtros demo por texto/categoría/estado, actualiza reducer y CSV de tickets cargados.
- `src/features/workshop/NewTicket.jsx`: formulario de contacto, equipo, detalle y adelanto; inventa ID y despacha `createTicket`.
- `src/features/workshop/TicketDetail.jsx`: busca ticket por ID local y solo edita el estado.
- `src/state/store.jsx`: `staffTickets` demo y acciones `createTicket`/`updateTicket` locales.
- `src/features/tickets/Tickets.jsx` y `src/features/chat/chatApi.js`: `/api/customer/tickets` pertenece al cliente y no sirve para ADMIN.
- `src/features/accounting/accountingApi.js`: patrón vigente para URL raíz separada, credenciales, mapeo de errores y no usar mock cuando el servicio no esté configurado.
- `src/features/auth/RequireRole.jsx`, `src/features/auth/LoginForm.jsx` y `src/app/layouts/StaffLayout.jsx`: rol `accountRole` ya está disponible y se usa en el acceso contable ADMIN.
- `src/domain/money.js`: `parseMoney` representa centavos con `Number` y hoy limita a siete dígitos enteros; el adelanto del backend permite hasta ocho. Extender la validación a ocho enteros permanece seguro bajo `Number.MAX_SAFE_INTEGER` y alinea inventario/tickets con `NUMERIC(10,2)`.
- Backend `specs/004-gestion-admin-tickets/contracts/admin-tickets.openapi.yaml`: contrato administrativo y códigos de respuesta.
- Backend `app/adapters/api/admin_tickets.py` y `app/database/repository.py`: contrato runtime; en respuestas online el contacto puede provenir del usuario y la cotización del detalle es la más reciente.
- Backend `sql/migrations/004_admin_ticket_management.sql`: migración aditiva; su aplicación PostgreSQL aún no se verificó porque no hay `TICKETS_TEST_DATABASE_URL` configurada.
- `package.json`, `tests/integration/workshop.test.jsx` y pruebas contables: Vitest/Testing Library y clientes aislables con `fetchImpl` ya están disponibles; no se requiere nueva dependencia.
