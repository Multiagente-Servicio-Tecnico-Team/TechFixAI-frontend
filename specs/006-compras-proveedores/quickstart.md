# Quickstart: Compras a proveedores en frontend

## Prerrequisitos

1. Backend levantado localmente y con migración `005_supplier_purchases.sql` aplicada a la base de prueba autorizada.
2. Contrato backend 006 actualizado/disponible para el frontend.
3. `GET /api/inventory/parts` devuelve `id` entero positivo por artículo. El cliente frontend conserva ese valor y lo envía sin transformación como `spare_part_id`; `code` es solo el SKU visible.
4. Configurar en frontend `.env.local` o `.env` una sola URL raíz para todas las APIs:

```dotenv
VITE_API_URL=http://localhost:8000
```

En producción ambos clientes usan el fallback same-origin `/backend`. Sin `VITE_API_URL`, el selector de repuestos existentes debe quedar no disponible; no se deben mostrar datos demo como opciones de una compra persistida. Mantener secretos únicamente en archivos ignorados; no copiar claves backend.

## Ejecutar frontend

Desde `TechFixAI-frontend`:

```powershell
npm install
npm run dev
```

Iniciar sesión en el taller con cuenta ADMIN. Ir a “Compras” desde la navegación.

## Escenarios manuales

1. Abrir Compras sin sesión y comprobar redirección a acceso; abrir con TECHNICIAN y comprobar denegación; abrir con ADMIN y comprobar carga del listado.
2. Filtrar por proveedor, fechas, número, estado de recepción y pago; verificar paginación y estado sin resultados.
3. Registrar un proveedor, buscarlo, editar datos y desactivarlo; verificar que sigue visible en compras históricas y no aparece para compras nuevas.
4. Consultar `GET /api/inventory/parts` y verificar que cada artículo tiene un `id` entero positivo. Registrar compra con dos líneas vinculadas y comprobar en la solicitud que cada `spare_part_id` coincide con el `id` seleccionado (nunca con el SKU). Verificar resumen monetario y que el stock no cambió al guardar.
5. Repetir el comprobante del mismo proveedor; verificar conflicto y que el formulario conserve los valores.
6. Abrir detalle, revisar snapshots, líneas, responsable, estado pago y auditoría.
7. Confirmar una recepción parcial; revisar cantidades pendientes y stock actualizado tras la respuesta del backend.
8. Simular pérdida de respuesta y reintentar con la misma clave idempotente; verificar que el detalle y stock no muestran un segundo movimiento.
9. Confirmar las unidades restantes y verificar estado “Recibida”; intentar cancelar y verificar conflicto.
10. Cambiar pago de “Pendiente” a “Pagada”; comprobar que el estado se presenta separado del estado de recepción.
11. Registrar compra sin recepciones y cancelarla; verificar estado cancelado y que no se puede recibir después.
12. Probar URL no configurada y backend no disponible; la pantalla debe indicar el problema sin mostrar compras ficticias.
13. Verificar distribución y navegación por teclado a 360, 390, 768 y 1024 px.

## Validación automatizada al implementar

```powershell
npm test
npm run build
```

La suite debe cubrir los helpers de importe/estados, serialización de requests, cookie de sesión, paginación, errores 401/403/404/409/422/5xx, formularios, reintento idempotente, estados de carga/vacío/no configurado y acceso ADMIN.
