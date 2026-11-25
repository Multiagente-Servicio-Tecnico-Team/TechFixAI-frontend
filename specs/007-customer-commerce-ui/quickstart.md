# Quickstart: integración frontend de clientes y comercio

Guía de validación para el feature frontend 007. Ejecutar solo contra una base de prueba. No ejecuta migraciones ni elimina datos.

## Prerrequisitos

1. Backend con migraciones 006–009 aplicadas y rutas del contrato backend 007 disponibles.
2. Antes de validar el portal en vivo, backend debe crear el customer enlazado para cuentas nuevas y resolverlo desde la sesión autenticada. El código actual todavía no satisface esta dependencia; no continuar una aceptación E2E de portal hasta corregirla en el backend.
3. Configurar `VITE_API_URL` del frontend hacia el backend local o usar el proxy configurado para el entorno. Login, frontend y backend deben compartir el origen/cookie previsto.
4. Preparar una cuenta ADMIN, dos cuentas CUSTOMER con perfil comercial asociado, un customer manual sin cuenta y repuestos vigentes con existencias.
5. Para la cotización de venta, usar una cotización cuyo stock reservado sea suficiente, con vencimiento futuro y método de pago de prueba.

## Preparación local

En una terminal para el backend, usar los comandos documentados en su `app/accounts/README.md` para iniciar la aplicación unificada con cuenta, chat y rutas administrativas. En otra terminal:

```powershell
cd C:\Users\josep\Downloads\Taller\TechFixAI-frontend
npm install
npm run dev
```

La instalación de paquetes solo es necesaria si no existe `node_modules`. No agregar secretos de backend al repositorio frontend.

## Escenarios portal

1. Registra una cuenta CUSTOMER nueva. Confirma que el backend deja una cuenta y su perfil comercial vinculado; no debe aparecer un customer ID como dato solicitado ni almacenado por el navegador.
2. Inicia sesión con una cuenta CUSTOMER existente. Abre “Mis tickets” y “Mis cotizaciones”; los tickets, diagnósticos técnicos, cotizaciones de servicio y ofertas de venta deben quedar en sus vistas correctas. Comprueba con una segunda cuenta que un cliente no puede ver los diagnósticos del primero.
3. Acepta una cotización de servicio y una de venta. La respuesta confirmada reemplaza el estado visible. La cotización de venta queda aceptada con pago pendiente; no aparece como pagada ni como venta confirmada.
4. Consulta pagos y ventas. Antes de la confirmación ADMIN, no debe existir venta pagada ni decremento comunicado por la UI; después de confirmar, el backend devuelve la venta y la interfaz la muestra.
5. Repite la aceptación simulando pérdida de respuesta. El backend debe devolver el resultado idempotente y no crear una segunda operación.
6. Inicia sesión como la segunda cuenta. No debe encontrar tickets, cotizaciones, pagos ni ventas del primer cliente aunque conozca sus códigos.

## Escenarios ADMIN

1. Abre el panel de clientes comerciales. Busca varios clientes con un criterio ambiguo y elige explícitamente el perfil correcto.
2. Crea un customer manual con nombre y teléfono, sin correo opcional, y verifica que se pueda seleccionar en el alta de ticket sin crear una cuenta ni contraseña.
3. Crea un ticket de servicio para el customer seleccionado. Revisa su detalle, cambia un campo permitido y crea una cotización de servicio. Recarga el detalle y verifica que conserva todas las cotizaciones recibidas.
4. Crea una cotización de venta independiente para un cliente con productos del inventario. Comprueba que se envían IDs numéricos estables del catálogo, y no SKU como sustitutos, y que el ticket permanece ausente.
5. Registra la aceptación manual solo con evidencia del cliente; confirma el pago con ADMIN y método/referencia de prueba. La UI debe mostrar oferta, pago y venta como estados separados.
6. Entra como TECHNICIAN y CUSTOMER a las rutas ADMIN. No deben poder leer ni operar clientes, cotizaciones comerciales o pagos.

## Casos de error y presentación

- Perfil comercial sin vincular: mensaje de perfil no disponible; no intentar usar el ID de cuenta como ID comercial.
- Backend no configurado o indisponible: estado recuperable, sin tarjetas o cotizaciones demo presentadas como reales.
- Cotización expirada o stock insuficiente: error de conflicto, conserva el detalle y no marca aceptación local.
- Dos customers con contacto igual: selección explícita; no auto-vincular ni fusionar.
- Confirmación de pago desde CUSTOMER: control ausente; si se fuerza la operación, el backend debe denegarla.
- Revisar los anchos 360, 390, 768 y 1024 px; teclado, foco y mensajes de estado deben seguir accesibles.

## Verificación automatizada

Después de implementar el feature, desde la raíz del frontend ejecutar:

```powershell
npm test
npm run build
```

Resultado local del 2026-11-03: `npm test` aprobó las 236 pruebas en 37 archivos; `npm run build` generó el build de producción correctamente. `git diff --check` no reportó errores de whitespace. La suite usa respuestas simuladas para las rutas comerciales.

La validación manual extremo a extremo y visual en 360, 390, 768 y 1024 px aún requiere levantar el backend con las rutas de clientes/comercio del Spec 007, migraciones aplicadas y resolución de `customers` desde la sesión. No se ejecutaron acciones comerciales contra la base real.
