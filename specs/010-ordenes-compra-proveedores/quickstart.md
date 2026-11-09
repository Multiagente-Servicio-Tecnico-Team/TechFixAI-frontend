# Quickstart de validacion: Ordenes de compra

Esta guia se ejecutara despues de implementar la feature. No requiere ni ejecuta migraciones desde el frontend.

## Prerrequisitos

1. Backend levantado con la migracion versionada de ordenes aplicada a la base de prueba `multiagentedb`.
2. Sesion ADMIN valida en el frontend. Verificar que la cookie se envia al backend por el origen/proxy configurado.
3. Proveedor activo y al menos un repuesto activo con identificador numerico; tener tambien un concepto libre para validar el caso sin inventario.
4. Frontend instalado con las dependencias del lockfile y URL base configurada segun el entorno local.

## Ejecucion local

Desde `TechFixAI-frontend`:

```powershell
npm install
npm run dev
```

## Escenarios de validacion

1. Entrar como ADMIN a **Compras > Ordenes**. Confirmar filtros por proveedor, estado y fechas, paginacion, estado vacio y acceso al detalle.
2. Crear borrador con repuesto y concepto libre. Confirmar el detalle, linea y total; consultar inventario antes y despues para verificar que no cambio.
3. Editar el borrador y emitirlo. Confirmar estado e historial; verificar que el stock sigue igual y que ya no se ofrecen cambios del borrador.
4. Recibir una parte de la cantidad de una linea de repuesto. Confirmar recepcion y comprobar que el movimiento del backend aumento existencias una sola vez; una linea libre no debe producir movimiento.
5. Repetir el envio con la misma clave tras simular respuesta perdida. Confirmar que el servicio lo identifica como replay, no duplica el movimiento y la UI refresca el detalle.
6. Completar el saldo y verificar cantidad recibida, pendiente cero y estado recibido. Probar el rechazo de una cantidad mayor al saldo.
7. Cancelar una orden parcialmente recibida con motivo. Confirmar que lo recibido permanece y solo el saldo pendiente se muestra cancelado.
8. Crear un comprobante desde una orden, mapear al menos una linea y dejar otra sin conciliar. Confirmar el vinculo en ambos detalles, que aparece "Sin conciliar" donde corresponde y que no hay una segunda recepcion.
9. Abrir una ruta de orden con rol CUSTOMER o TECHNICIAN y confirmar que se deniega el acceso. Revisar 401, 403, 404, 409, 422 y 503 sin que la UI reporte cambios no confirmados.
10. Revisar lista, formularios y detalle a 360, 390, 768 y 1024 px; operar con teclado y lector de foco visible.

## Validacion de implementacion

Al cerrar la implementacion, ejecutar las pruebas unitarias y de integracion del frontend y `npm run build` siguiendo `AGENTS.md`. Esta especificacion/planificacion no ejecuta pruebas ni modifica la aplicacion.
