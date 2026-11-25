# Contrato de consumo frontend: Inventario

**Feature**: 005-inventory-api-integration

El contrato completo y canónico está en el repositorio backend:
../../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/specs/005-api-inventario/contracts/inventory.openapi.yaml

Este documento describe únicamente cómo la UI consume ese contrato. No define endpoints alternos ni duplica los esquemas OpenAPI.

## Operaciones utilizadas

| Operación | Propósito en la UI | Resultado esperado |
|---|---|---|
| GET /api/inventory/parts | Cargar el inventario activo | Objeto con lista de repuestos |
| GET /api/inventory/categories | Poblar filtros y opciones del campo categoría | Objeto con categorías distintas |
| POST /api/inventory/parts | Crear repuesto | Repuesto persistido devuelto por el servicio |
| PUT /api/inventory/parts/{code} | Actualizar datos de repuesto sin cambiar su código | Repuesto actualizado devuelto por el servicio |
| DELETE /api/inventory/parts/{code} | Retirar repuesto con confirmación del usuario | Sin cuerpo; el listado solo se actualiza tras éxito |

## Reglas de consumo

- Enviar la cookie de sesión existente; el navegador administra la cookie HttpOnly.
- Roles aceptados: ADMIN y TECHNICIAN. Un CUSTOMER no debe ver ni usar el inventario.
- El cuerpo de escritura y la respuesta siguen exactamente el contrato OpenAPI; no enviar campos extra.
- Traducir code/name/category/description/unit_price/current_stock/minimum_threshold a sku/name/category/compat/price/stock/min, manteniendo category literal y price en céntimos en dominio.
- La selección de categoría puede sugerir valores leídos del servicio y admitir texto nuevo. El valor nuevo queda disponible en el catálogo después de guardar el repuesto que lo contiene; no existe operación independiente de alta de categoría.
- Manejar 401, 403, 404, 409, 422 y 503 con mensajes ya definidos o específicos equivalentes en español.
- En 409 al borrar, mantener el artículo visible e informar que está referenciado por un presupuesto.
- Una respuesta inválida, una falla de red o un error HTTP no equivale a una lista vacía ni a una confirmación de escritura.
- Modo desarrollo sin VITE_API_URL puede usar la demostración existente. En producción se consume el proxy configurado por el frontend (/backend) y el fallo se muestra como error.

## Compatibilidad de tipos

- Precios: UI usa céntimos enteros; el contrato usa cadena decimal de dos posiciones.
- Stock y umbral: enteros no negativos.
- Categoría en lectura puede ser null; en escritura se requiere texto no vacío.
