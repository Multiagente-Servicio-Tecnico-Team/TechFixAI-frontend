# Quickstart: Inventario con apertura, ajuste e historial

## Prerrequisitos

- Backend actualizado con Spec 008 y la migración `20261108_inventory_movement_traceability.sql` aplicada en la base seleccionada. La base local de prueba ya quedó migrada como ledger `011`; producción u otro entorno requiere su propia aplicación.
- Backend iniciado y accesible desde `VITE_API_URL` durante desarrollo (por ejemplo, `http://localhost:8000`); producción usa el proxy `/backend` existente.
- Iniciar sesión con cuenta ADMIN o TECHNICIAN. CUSTOMER no tiene acceso al inventario.
- Frontend instalado desde su raíz mediante `npm install` o `npm ci`.

## Inicio y validación automatizada

```powershell
npm run dev
npm test
npm run build
```

El test focalizado de inventario puede ejecutarse con `npm test -- tests/unit/inventory.test.js tests/integration/inventory.test.jsx`.

## Verificación manual

1. Abrir `/taller/inventario`; confirmar que el listado y categorías vienen de la API y conservan los filtros y el diseño actual.
2. Crear un artículo nuevo con saldo inicial cero; verificar que se guarda con cero y que la edición de catálogo muestra el saldo confirmado sin permitir modificarlo.
3. Crear otro artículo con saldo inicial positivo y motivo; confirmar apertura y validar saldo e historial. Simular un error de apertura; verificar que el artículo creado se muestra con saldo cero, que aparece **Reintentar apertura** y que el reintento no crea otro SKU ni genera una clave idempotente distinta.
4. Desde la acción **Ajustar stock**, registrar conteos al alza y a la baja; verificar que se exige motivo y que la tarjeta cambia solo cuando el backend confirma.
5. Enviar el mismo conteo: la UI debe indicar que no hubo cambio y no crear un movimiento. Reintentar una solicitud confirmada con su misma clave y comprobar que no se duplica.
6. Intentar una reducción que cruce reservas activas; validar el mensaje de conflicto y que se conserva el saldo anterior.
7. Abrir historial; validar tipo, delta, saldo antes/después, fecha, actor, motivo/origen cuando existan y la etiqueta de historia anterior al corte. Recorrer páginas y filtros por tipo/fecha.
8. Retirar un artículo con historia; verificar que desaparece de activos, la UI dice “retirado del catálogo” y ofrece **Consultar su historial** por el ID numérico del artículo.
9. Verificar 401/403, API desconectada, respuesta vacía y error de carga; ningún caso debe anunciar éxito o reemplazar información conectada por datos demo.
10. Repetir vista y formularios en 360, 390, 768 y 1024 px, navegando los controles con teclado y verificando anuncios de carga/error.

11. Sin URL API configurada, verificar que el aviso identifica el modo de demostración y que ningún cambio se presenta como persistido en el backend.

## Resultado esperado

El catálogo muestra saldo confirmado por backend; toda apertura o ajuste tiene un motivo; recepción/venta y movimiento de stock conservan la misma historia del servidor; el historial permite explicar cambios sin inventar los datos históricos que falten.
