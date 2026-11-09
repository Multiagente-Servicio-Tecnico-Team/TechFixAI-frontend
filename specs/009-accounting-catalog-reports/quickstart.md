# Quickstart: validar el feature de contabilidad

## Prerrequisitos

- Backend de pruebas iniciado con la versión del contrato `specs/009-catalogo-cuentas-consultas-contables/contracts/accounting-catalog.openapi.yaml` y sus migraciones ya aplicadas.
- Cuenta ADMIN autenticable y plan PCGE/catálogo disponibles en la base de pruebas.
- Frontend configurado con una sola `VITE_API_URL` apuntando a la raíz del backend. La sesión se transporta mediante cookie; no copies credenciales al navegador.
- Desde la raíz del frontend: `npm install`, luego `npm run dev`.

En el entorno de desarrollo, la raíz API sin configurar deja el servicio de contabilidad en estado no configurado; no se deben usar registros financieros demo para suplir al API.

## Escenarios de validación manual

1. **Acceso y catálogo**: iniciar como ADMIN, abrir Contabilidad y planes/cuentas. Verificar que aparece el plan predeterminado y que al seleccionarlo se carga una primera página de cuentas sin escribir. En el alta de asiento, revisar que el desplegable presenta opciones al elegir el plan; buscar por código y por parte de una denominación; comprobar estado/vigencia/imputabilidad.
2. **Plan y asiento**: crear un plan alternativo y verificar que no se vuelve predeterminado automáticamente. Cambiar explícitamente el predeterminado. Crear un asiento balanceado, elegir cuentas del plan y verificar que la descripción de cada línea se completa con la denominación de su padre (por ejemplo, 101 Caja → Efectivo y equivalentes de efectivo), que puede editarse y que una cuenta raíz completa su propia denominación. Confirmar que el detalle muestra el plan y snapshots devueltos por backend. Cambiar el plan en el borrador y confirmar que se deben elegir cuentas otra vez.
3. **Histórico**: abrir un asiento antiguo con líneas sin `account_id`; verificar que se conserva su código/nombre histórico y que no aparece seleccionado como cuenta actual.
4. **Periodo mensual**: consultar meses, cerrar un periodo tras revisar el diálogo, inspeccionar actor/fecha en el historial y reabrirlo indicando motivo. Recargar y confirmar el estado y eventos recibidos del servidor.
5. **Conflicto de periodo**: mientras hay un borrador de asiento abierto, cerrar su mes desde otra sesión o vista. Al guardar, comprobar que el mensaje informa del conflicto y el asiento no se presenta como creado.
6. **Reportes**: para un rango de fechas con asientos, consultar diario, mayor y balance; recorrer páginas manteniendo filtros. Exportar CSV y XLSX y comprobar que cada archivo corresponde a todo el conjunto filtrado, no solo a la página.
7. **Límite y errores**: solicitar una exportación que supere 10,000 filas y verificar que el JSON 413 se muestra como error recuperable sin descargar un archivo dañado. Probar error de red y reintento.
8. **Roles y diseño**: iniciar como CUSTOMER/TECHNICIAN y probar URL directa; Contabilidad no debe abrirse ni exponer datos. Revisar teclado, foco visible, tema claro/oscuro y anchos de 360, 390, 768 y 1024 px.

## Validación automatizada prevista para implementación

- `npm test` para pruebas de dominio, cliente API y pantallas.
- `npm run build` para compilar la SPA.

Estos comandos se documentan como pasos para la implementación; no se ejecutan durante la fase de planificación.

## Referencias

- Requisitos: [spec.md](spec.md).
- Modelo de presentación: [data-model.md](data-model.md).
- Mapeo de pantallas y contrato canónico: [contracts/accounting-catalog-ui.md](contracts/accounting-catalog-ui.md).
