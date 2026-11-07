# Quickstart: Validar la conexión del panel de tickets

## Requisitos previos para extremo a extremo

1. Seguir `../../../Sistema-Multiagente-de-Servicio-T-cnico-Ventas-y-Soporte/docs/23-gestion-admin-tickets.md` para preparar una base PostgreSQL desechable y aplicar `sql/migrations/004_admin_ticket_management.sql`. No usar producción ni una base compartida.
2. Backend iniciado en `http://localhost:8000`, CORS permite el origen Vite y un ADMIN puede iniciar sesión desde el frontend.
3. Frontend instalado con `npm ci`.
4. En PowerShell, configurar URL raíz del backend para la sesión de desarrollo:

```powershell
$env:VITE_API_URL = "http://localhost:8000"
npm run dev
```

En despliegue same-origin, dejar la URL vacía y compilar en producción para usar `/backend`.

## Validación local

```powershell
npm test
npm run build
```

## Escenarios manuales

1. Iniciar sesión como ADMIN y abrir `/taller`; comparar tarjetas y total con tickets existentes en la base de prueba.
2. Buscar por código, teléfono o equipo; combinar origen/tipo/estado; recorrer resultados que superen una página y exportar CSV. Confirmar que CSV incluye todos los registros filtrados.
3. Crear ticket manual sin cuenta asociada; observar el código del backend, volver a Banco y abrir el detalle usando su ID.
4. En detalle, revisar el último total de cotización existente y adelanto por separado; confirmar que no hay editor de cotización.
5. Cambiar estado desde tarjeta y detalle; refrescar y confirmar el estado y evento de auditoría devueltos por backend.
6. Probar contacto inválido, importe sin método, ticket 404, sesión 401, rol TECHNICIAN 403 y backend no disponible; no debe mostrarse como persistido ni cambiar a datos demo.
7. Iniciar sesión como TECHNICIAN y navegar directamente a Banco, alta y detalle; el servicio ADMIN debe denegar las vistas/rutas.
8. Repetir revisión visual con anchos 360, 390, 768 y 1024 px y tema claro/oscuro.

La API solo devuelve resumen de la última cotización; el frontend no muestra líneas que no vengan en el contrato. La validación E2E queda pendiente hasta que se aplique la migración backend a la BD desechable.
