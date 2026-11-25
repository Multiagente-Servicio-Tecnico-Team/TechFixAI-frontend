# Modelo de datos de interfaz: Inventario

**Feature**: 005-inventory-api-integration  
**Source of truth**: contrato backend OpenAPI 005 y estado confirmado de sus respuestas.

## Repuesto del backend

| Campo | Tipo/condición del contrato | Uso en frontend |
|---|---|---|
| code | Texto SKU; único; hasta 50 caracteres y patrón acordado | sku; identificador de fila y ruta de edición |
| name | Texto de 3 a 150 caracteres | name |
| category | Texto o null en lectura; texto no vacío de hasta 50 caracteres al escribir | category; valor exacto para filtrar, seleccionar y guardar |
| description | Texto o null | compat; descripción opcional |
| unit_price | Cadena decimal PEN con dos decimales | Convertir a céntimos enteros al entrar a dominio; regresar como texto al guardar |
| current_stock | Entero de 0 a 999999 | stock |
| minimum_threshold | Entero de 0 a 999999 | min |
| active | booleano; la lista devuelve solo activos | No editable desde el formulario |
| created_at, updated_at | Fecha y hora | Disponibles desde contrato; la UI actual no necesita mostrarlos en esta feature |

## Modelo de vista existente

Part de dominio/frontend:
- sku: string
- name: string
- category: string (puede quedar vacío si una fila histórica de lectura es null)
- compat: string
- stock: entero no negativo
- min: entero no negativo
- price: entero de céntimos
- icon: presentación derivada localmente; no se envía ni reemplaza la categoría

El adaptador existente fromApi/toApi realiza el mapeo. Debe mantenerse la categoría literal y nunca derivar el valor API del icono.

## Categorías

- La consulta devuelve una lista de cadenas distintas de categorías activas.
- Categoría no tiene ciclo de vida independiente. El valor se crea para el catálogo al guardar un repuesto con ese texto.
- Las sugerencias/filtros deben incluir los valores devueltos por backend; no depender exclusivamente de PART_CATEGORIES.
- Si la consulta de categorías falla pero el listado de repuestos está disponible, las categorías presentes en esos repuestos sirven como opciones parciales; el campo permite escribir otra.
- Tras una alta o edición confirmada, la categoría se actualiza en el estado visible sin traducirla.

## Error y estado de acceso

Los errores visibles se derivan del contrato y del cliente existente: sesión requerida, personal no autorizado, repuesto no encontrado, conflicto de unicidad/uso, datos inválidos y servicio no disponible. Las respuestas de red no deben convertirse en catálogo vacío.

## Persistencia y relaciones

No hay nuevo modelo persistente frontend. El backend conserva repuestos y referencias a presupuestos; un conflicto de eliminación mantiene el repuesto en el catálogo.
