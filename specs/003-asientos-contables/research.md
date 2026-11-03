# Research: Asientos contables frontend

## Decision 1: Conservar el rol real sin romper el área de taller

**Decision**: Mantener el `role` de área actual (`client` o `staff`) para guards existentes y conservar por separado el rol de cuenta recibido del backend (`ADMIN`, `TECHNICIAN` o `CUSTOMER`) dentro del objeto de sesión. La ruta y los enlaces contables verifican el rol real `ADMIN`; el backend vuelve a autorizar cada solicitud.

**Rationale**: `areaForRole` convierte `ADMIN` y `TECHNICIAN` en `staff`, y `LoginForm` guarda actualmente solo esa área. La autorización de la UI quedaría ambigua sin distinguirlos. La cookie HttpOnly sigue siendo la prueba de sesión; la marca de rol del navegador sirve solo para navegación y no es un control de seguridad.

**Alternatives considered**: Convertir todas las rutas existentes a roles de cuenta reales implicaría ampliar el cambio y modificar las guards de cliente/taller. Ocultar el enlace sin proteger la ruta deja una pantalla accesible por URL directa. Confiar solo en el cliente no reemplaza la validación del backend.

## Decision 2: Navegación adaptada al sistema Banco

**Decision**: Agregar Contabilidad en las pestañas del taller en escritorio para ADMIN y en el menú de usuario en móvil.

**Rationale**: `StaffLayout` ya muestra Banco, Repuestos y Nuevo Ticket; el mapa Banco limita la barra inferior móvil a tres destinos. El menú de usuario admite enlaces adicionales y conserva los destinos móviles existentes.

**Alternatives considered**: Agregar un cuarto botón móvil contradice el límite visual de Banco; reemplazar un destino existente quitaría una función del taller.

## Decision 3: Precisión de importes

**Decision**: Crear funciones puras de contabilidad para validar decimal de hasta 12 dígitos enteros y dos decimales, convertir a céntimos exactos con `BigInt`, sumar y formatear PEN sin pasar por `Number`. El cliente serializa cada importe como cadena con dos decimales.

**Rationale**: El OpenAPI admite importes hasta `NUMERIC(14,2)`. `src/domain/money.js` limita `parseMoney` a siete dígitos enteros y convierte a `Number`, que no representa exactamente todos los céntimos del máximo aceptado por backend. La interfaz no debe mostrar como balance un total calculado con pérdida de precisión.

**Alternatives considered**: Reutilizar directamente `parseMoney` no soporta el límite del contrato. Usar `Number` sin límite puede redondear céntimos. Agregar una librería decimal sería una dependencia nueva innecesaria para sumar valores ya acotados a dos decimales.

## Decision 4: Idempotencia de alta y reintentos

**Decision**: Crear una UUID para el borrador al comenzar el envío; conservar la misma UUID y payload en un reintento de resultado incierto. Si cambia cualquier campo tras una respuesta incierta, tratarlo como operación nueva con clave nueva. Bloquear doble envío mientras la solicitud está en curso.

**Rationale**: El backend identifica altas por actor y `Idempotency-Key`; mismo payload devuelve el asiento existente y distinta carga con la misma clave genera conflicto. La API cliente convierte errores de red en errores seguros, por lo que la pantalla debe retener los datos necesarios para reintentar sin duplicar.

**Alternatives considered**: Generar una UUID nueva en cada clic permite duplicados tras timeout. Reutilizar siempre la clave aunque cambie el formulario produce conflicto de payload. Persistir la clave/datos en almacenamiento durable conservaría datos financieros del formulario sin necesidad; el alcance los mantiene en memoria.

## Decision 5: Relación con el backend y pruebas

**Decision**: Usar las rutas y modelos publicados por `accounting.openapi.yaml` del backend como contrato canónico. Probar el cliente con respuestas simuladas y verificar los flujos de UI sin escribir en PostgreSQL desde el frontend.

**Rationale**: Los repositorios son independientes y backend es fuente de verdad; el frontend no modifica la base ni replica la persistencia. `fetch` simulado y Testing Library ya son el patrón de pruebas local.

**Alternatives considered**: Copiar el OpenAPI a este repo crea dos fuentes editables. Ejecutar pruebas UI contra una BD compartida vuelve las pruebas dependientes de datos/credenciales y duplica el alcance de las pruebas PostgreSQL backend.

## Decision 6: Configuración del servicio contable

**Decision**: Añadir `VITE_ACCOUNTING_URL` como URL raíz independiente del backend contable; en producción, usar el proxy same-origin `/backend`. Si falta en desarrollo, mostrar el servicio como no configurado en lugar de simular asientos.

**Rationale**: `VITE_API_URL` apunta hoy a la base de autenticación y `VITE_CHAT_URL` puede estar vacío para dejar el chat en demostración. Reutilizar cualquiera de esas variables acoplaría el registro contable a una capacidad distinta. El inventario ya demuestra el patrón de una base URL propia por función.

**Alternatives considered**: Compartir `VITE_CHAT_URL` hace que una función contable dependa de activar chat; reusar `VITE_API_URL` exigiría recortar `/auth` de una URL ya configurada; crear un mock contable podría confundirse con el libro real.

## Repository evidence

- `src/domain/user.js`: `ADMIN` y `TECHNICIAN` se asignan al área `staff`.
- `src/features/auth/LoginForm.jsx`: el rol de usuario se normaliza al área antes de guardar la sesión.
- `src/state/session.js`: solo almacena el objeto de sesión en `sessionStorage`.
- `src/app/layouts/StaffLayout.jsx`: contiene tres destinos del taller y un menú de usuario extensible.
- `design/DESIGN.md`: limita la barra móvil a tres destinos y define navegación Banco.
- `src/domain/money.js`: `parseMoney` acepta máximo siete enteros y usa `Number` en céntimos.
- Backend `specs/003-asientos-contables/contracts/accounting.openapi.yaml`: sesión ADMIN, filtros, página 50–100, importes en cadenas de dos decimales, alta idempotente, detalle y reversión.
- `package.json`: React/Vite/Vitest/Testing Library están instalados; no se requiere dependencia nueva.
