# Research: Ordenes de compra a proveedores

**Date**: 2026-11-09  
**Feature**: [spec.md](spec.md)

## Existing frontend structure

**Decision**: Extender el area `src/features/purchases` y su API, con vistas especificas de ordenes. Mantener la ruta ADMIN Compras como punto de entrada y agregar navegacion interna entre ordenes y comprobantes.

**Evidence**: `src/app/App.jsx` ya protege las rutas de Compras con `RequireRole` para `ADMIN`; `StaffLayout.jsx` ya tiene la entrada global Compras. `purchasesApi.js` centraliza URL base, cookies, errores y operaciones de proveedores/comprobantes. `PurchaseCreate.jsx` ya carga proveedores activos y repuestos con ID numerico desde `inventoryApi`.

**Alternatives considered**:
- Crear una nueva seccion global de navegacion: descartada porque duplicaria la entrada Compras.
- Poner el ciclo de orden dentro de `PurchaseCreate`/`PurchaseDetail`: descartada porque una orden es distinta de un comprobante y tiene estados y recepciones propios.
- Crear otro cliente HTTP con autenticacion independiente: descartada porque duplicaria la politica de URL, sesion y errores.

## API and session boundary

**Decision**: Consumir las rutas del contrato backend 010 desde el cliente de Compras, usando la cookie existente y el mismo resolver de URL. Mantener el backend como autoridad para transiciones, importes, cantidades pendientes y movimientos.

**Evidence**: El contrato backend `specs/010-ordenes-compra-proveedores/contracts/purchase-orders.openapi.yaml` define listar, crear, consultar, editar borradores, emitir, cancelar y recibir. `purchasesApi.js` usa `credentials: "include"`; la ruta ADMIN ya protege la interfaz.

**Alternatives considered**:
- Calcular estados de orden en cliente a partir de cantidades: descartada porque puede representar mal concurrencia y cancelaciones.
- Cambiar stock optimistamente al emitir o recibir: descartada; solo la respuesta de recepcion confirmada indica movimiento aplicado.

## Order and invoice separation

**Decision**: Mantener dos flujos relacionados: orden de compra y comprobante. La factura se asocia a una orden solo al crearla; cada linea de factura puede mapearse explicitamente a una linea de orden. Los comprobantes sin orden siguen el flujo existente.

**Evidence**: El contrato backend 006 permite `purchase_order_id` en el encabezado y `purchase_order_item_id` en cada linea de `POST /api/admin/purchases`. El backend no ofrece un vinculo retroactivo. Una compra asociada a orden no debe recibirse por la ruta del comprobante.

**Alternatives considered**:
- Inferir lineas por descripcion, SKU, cantidad o importe: descartada; el backend ofrece mapeo explicito y una cantidad nula si falta conciliacion.
- Usar la factura como recepcion: descartada; la recepcion debe registrarse contra la orden y solo una vez.

## Safe receipt retry

**Decision**: La interfaz crea una clave UUID por intento de recepcion, la conserva mientras el resultado sea incierto y reutiliza la misma clave en el reintento de esa misma operacion. Si el resultado es ambiguo, primero consulta el detalle y el historial antes de habilitar una nueva recepcion.

**Evidence**: POST `/{order_id}/receipts` requiere `Idempotency-Key` UUID. El backend responde `Idempotent-Replayed: true` cuando devuelve una recepcion ya aplicada. El adaptador de compras existente ya reconoce ese encabezado para recepciones de comprobantes.

**Alternatives considered**:
- Crear una nueva clave en cada clic: descartada porque podria registrar dos recepciones tras perder la primera respuesta.
- Limpiar el formulario antes de recibir confirmacion: descartada porque impide recuperar el intento incierto.

## User-facing state and validation

**Decision**: Traducir codigos de orden a etiquetas espanolas en un mapeo unico y mostrar cantidades `quantity_invoiced = null` como "Sin conciliar". Las cantidades de orden y recepcion aceptadas por el contrato son enteras; el costo monetario se trata como dinero decimal y se formatea en PEN.

**Evidence**: El contrato OpenAPI define los estados `DRAFT`, `ISSUED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`; cantidades de orden/recepcion enteras; montos monetarios como cadenas decimales; y `quantity_invoiced` nullable.

**Alternatives considered**:
- Mostrar codigos tecnicos a ADMIN: descartada por claridad de la interfaz en espanol.
- Convertir `null` a cero: descartada porque ocultaria que una linea de factura aun no se concilio.

## No unresolved decisions

El alcance, los roles, el momento en que el stock cambia, la vinculacion de comprobantes y el comportamiento idempotente estan definidos por el spec frontend y los contratos backend. No hay marcadores `NEEDS CLARIFICATION`.
