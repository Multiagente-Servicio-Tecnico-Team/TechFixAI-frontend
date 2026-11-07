# Research: Integración del inventario con el backend

**Feature**: 005-inventory-api-integration  
**Date**: 2026-11-03

## Decision 1: Reutilizar el cliente y el flujo de inventario existentes

**Decision**: Extender src/features/workshop/inventoryApi.js y src/features/workshop/useInventory.js. No crear un segundo cliente ni mover el estado de esta pantalla a un almacenamiento persistente del navegador.

**Rationale**: El cliente ya implementa GET/POST/PUT/DELETE de repuestos, mapea el código a SKU, mantiene el precio como céntimos en la UI, envía el importe como cadena decimal y usa credentials include. useInventory ya espera confirmación del servidor antes de aplicar altas, ediciones y bajas al store.

**Alternatives considered**: Reemplazar todo el flujo o introducir otra librería de estado/red. Se descartan porque duplican comportamiento existente sin cubrir una necesidad de la feature.

## Decision 2: Usar categorías del backend y permitir un valor nuevo desde el formulario de repuesto

**Decision**: Añadir lectura de categorías al cliente. El filtro y las opciones existentes se forman con valores actuales del backend. El campo de categoría permite seleccionar un valor conocido o escribir uno nuevo; el nuevo valor se incorpora al catálogo cuando se confirma un repuesto que lo usa.

**Rationale**: El backend expone GET /api/inventory/categories y acepta category como texto no vacío de hasta 50 caracteres en las escrituras. No hay entidad ni operación de creación/borrado independiente para categorías. La UI actual define cinco constantes en src/domain/inventory.js y validatePart las impone, así que rechaza valores permitidos por el backend.

**Alternatives considered**: Mantener los cinco valores locales (incompatible con el catálogo real); crear CRUD separado de categorías (no existe en el backend y requeriría ampliar alcance); traducir o normalizar etiquetas (cambia el valor canónico). Se descartan.

## Decision 3: Degradación independiente de la carga de categorías

**Decision**: El listado de partes es la operación principal. Si GET categorías falla pero GET repuestos funciona, permitir el uso del listado, deducir opciones de las categorías presentes en los repuestos y permitir escribir otra categoría válida. Mostrar un aviso recuperable si la UI no pudo consultar las opciones completas.

**Rationale**: Las categorías se derivan de los repuestos activos y la escritura permite un valor nuevo. Un fallo auxiliar no debe ocultar datos que sí se cargaron correctamente.

**Alternatives considered**: Bloquear todo el inventario si falla la lista de categorías (acopla dos consultas de lectura); usar silenciosamente la lista fija (muestra opciones divergentes). Se descartan.

## Decision 4: Evitar que el store demo se confunda con datos del servicio

**Decision**: En modo API, ocultar el estado demo inicial hasta que la primera lectura del servidor tenga éxito; tras un fallo inicial mostrar error/reintento sin presentar demo. Después de una lectura satisfactoria, un fallo de recarga puede conservar la última respuesta confirmada con aviso de error.

**Rationale**: El store compartido se inicializa con repuestos demo. El hook puede cargar al servidor sin vaciar primero el store y el componente deriva estantes de los datos presentes mientras la carga ocurre. Eso puede presentar datos demo debajo del indicador de carga.

**Alternatives considered**: Vaciar permanentemente el store al montar el hook o borrar los datos al cualquier error. Se prefiere controlar qué datos del store se exponen, conservando el último estado confirmado después de una carga real.

## Decision 5: Configuración por entorno sin demo en despliegue

**Decision**: En desarrollo, VITE_API_URL vacío mantiene el modo demo existente. Con una URL configurada se usa como base del servicio. En producción, resolver el fallback /backend aun cuando la variable esté vacía; el estado API debe permanecer activo y presentar errores si el proxy/servicio falla.

**Rationale**: resolveApiBaseUrl ya implementa fallback de producción, pero inventoryApi solo llama al resolver si la variable tiene contenido. Además, el comentario de .env.example y inventoryApi indica que backend no publica rutas, contradiciendo el contrato backend 005.

**Alternatives considered**: Permitir demo automático en producción o cambiar despliegue/proxy del backend. Se descarta demo por ocultar problemas de conexión; no hay evidencia de que esta feature requiera cambiar la infraestructura/proxy existente.

## Decision 6: Mantener el contrato del backend como única fuente de rutas y campos

**Decision**: Consumir el OpenAPI backend en ../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/005-api-inventario/contracts/inventory.openapi.yaml; documentar en este repo solo la adaptación frontend y referenciar al contrato, sin copiar su esquema completo.

**Rationale**: Los repositorios están separados y el backend es fuente de verdad para rutas, campos, permisos y respuestas.

**Alternatives considered**: Copiar OpenAPI completo al frontend (riesgo de contratos divergentes) o inventar rutas de categorías (rompe integración).

## Unknowns resolved

No quedan NEEDS CLARIFICATION. Los nombres de URL configurada se conservan conforme a VITE_API_URL, existente en .env.example. La configuración concreta del proxy de despliegue queda fuera de esta feature, pero el fallback esperado ya está establecido en el cliente compartido.
