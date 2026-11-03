# Quickstart: Validar integración de inventario

**Feature**: 005-inventory-api-integration

## Requisitos previos

- Backend TechFix.AI iniciado y contrato de inventario 005 aplicado.
- Usuario de prueba con rol ADMIN o TECHNICIAN y cookie de sesión vigente.
- Frontend instalado con Node/npm.

## Configurar y arrancar

1. En TechFixAI-frontend/.env, configura VITE_API_URL con la URL base del backend local, por ejemplo http://localhost:8000. No agregues la ruta /api/inventory al valor.
2. Reinicia Vite después de cambiar variables VITE_*.
3. Desde la raíz del frontend, ejecuta npm run dev y abre la URL que informa Vite.
4. Inicia sesión como personal autorizado y abre Taller > Inventario.

## Escenarios de aceptación manual

1. Con datos activos, confirma que tabla/estantes muestran los valores del backend y los filtros de categoría incluyen los valores reales.
2. Prueba búsqueda por SKU, nombre y categoría; combina con orden y paginación y confirma que el conteo coincide.
3. Registra un repuesto con una categoría existente, luego uno con una categoría nueva. Confirma que el valor nuevo aparece después de guardar y al recargar.
4. Edita nombre, descripción, precio y stock; confirma los valores tras recargar. El SKU no debe cambiar.
5. Elimina un repuesto sin presupuesto relacionado y confirma que desaparece.
6. Intenta eliminar un repuesto referenciado por presupuesto; debe mantenerse con mensaje de conflicto.
7. Cierra sesión o usa CUSTOMER; la pantalla debe proteger acceso y no mostrar datos.
8. Detén el backend durante la carga o tras abrir el inventario; aparece error recuperable, sin convertirlo en vacío exitoso ni mostrar datos demo como reales.
9. Deja VITE_API_URL vacío en desarrollo y verifica únicamente el modo demo. En producción, confirma el uso del proxy /backend y que una falla no activa demo.

## Validación automatizada tras implementación

Desde la raíz del frontend:

    npm test
    npm run build

Resultado esperado: pruebas unitarias y de integración de inventario aprobadas; compilación de producción exitosa. Esta guía no modifica ni prueba el backend.
