# Quickstart: Validar la experiencia de asientos contables

## Prerrequisitos

1. Node.js/npm y dependencias existentes del frontend instaladas (`npm ci`).
2. Backend con migración `003_accounting_entries.sql` aplicada en una base de prueba; seguir el [quickstart backend](../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/003-asientos-contables/quickstart.md).
3. Sesión `ADMIN` activa y acceso a las rutas backend contables. No usar credenciales ni base de producción para esta verificación.
4. Frontend configurado con el endpoint de desarrollo o proxy same-origin previsto por el repo; mantener cookies habilitadas.

## Validación automatizada

Desde la raíz de TechFixAI-frontend:

```powershell
npm test
npm run build
```

La suite específica añadida por tareas debe cubrir el dominio monetario máximo, serialización decimal, errores del cliente, rol ADMIN frente a TECHNICIAN/CUSTOMER, listado/filtros/paginación, formulario confirmado/idempotente, detalle, reversión y estados de error. No debe escribir en PostgreSQL.

## Escenarios de aceptación manual

1. Acceder como `ADMIN`: Contabilidad aparece en la navegación de escritorio; en celular sigue disponible desde el menú de usuario y la barra Banco conserva tres destinos.
2. Acceder como `TECHNICIAN` y `CUSTOMER`: Contabilidad no aparece; navegar manualmente a su ruta no presenta datos; el backend devuelve `403` si se intenta una solicitud contable.
3. Abrir el listado: comprobar carga, empty state y error con reintento. Aplicar filtros de fecha, categoría, estado y correlativo; recorrer páginas y abrir un detalle.
4. Crear un asiento balanceado con varias líneas: revisar totales, confirmar una vez, comprobar correlativo/estado/detalle; repetir una petición con igual clave/body devuelve el asiento existente sin duplicar.
5. Probar una cantidad cercana al límite superior del OpenAPI y otra con más de dos decimales; verificar que el cálculo exacto no pierde céntimos y los valores fuera de rango no se envían.
6. Probar una línea con ambos lados, una con ambos en cero y un total desbalanceado; no se debe confirmar y los errores deben asociarse a los datos que debe corregir.
7. Revertir un original confirmado: capturar fecha y razón, revisar confirmación, comprobar vínculo, estado revertido e historial; volver a abrirlo y comprobar que no se ofrece una segunda reversión.
8. Simular offline/timeout durante el alta: el formulario se conserva y reintenta la misma operación con su clave original; doble clic no genera duplicado.
9. Validar visualización sin scroll horizontal a 360, 390, 768 y 1024 px y en tema claro/oscuro; recorrer filtros, formulario y diálogos solo con teclado y revisar foco/anuncios accesibles.

## Resultado esperado

El frontend solo presenta datos que devuelve el backend, no altera asientos confirmados, maneja reintentos sin duplicar altas y mantiene el sistema visual Banco. Las decisiones contables persisten únicamente en el backend.
