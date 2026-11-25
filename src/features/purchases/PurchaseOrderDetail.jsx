import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FilePlus2, Pencil, RefreshCw, Send, Ban, PackageCheck } from "lucide-react";
import { canCancelPurchaseOrder, canEditPurchaseOrder, canIssuePurchaseOrder, canReceivePurchaseOrder, formatPurchaseMoney, parsePurchaseMoney, PURCHASE_ORDER_STATUS_LABELS } from "../../domain/purchases.js";
import { BackLink, Field } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { purchasesApi as defaultApi } from "./purchasesApi.js";
import PurchaseOrderReceiptForm from "./PurchaseOrderReceiptForm.jsx";
import { usePurchaseOrderDetail } from "./usePurchaseOrders.js";

function dateTime(value) { return value ? new Date(value).toLocaleString("es-PE") : "—"; }
function quantity(value) { return value === null || value === undefined ? "—" : String(value).replace(/\.0+$/, ""); }

export default function PurchaseOrderDetail({ api = defaultApi }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { order, state, error, reload } = usePurchaseOrderDetail(id, api);
  const [busy, setBusy] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  const runAction = async (action) => {
    setBusy(true);
    setActionError("");
    setMessage("");
    try {
      await action();
      await reload();
      return true;
    } catch (apiError) {
      if (apiError.code === "session_required") {
        navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
        return false;
      }
      setActionError(apiError.message);
      if (apiError.status === 409) await reload();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    const succeeded = await runAction(() => api.issuePurchaseOrder(id));
    if (succeeded) {
      setIssueOpen(false);
      setMessage("Orden emitida. Las existencias no cambian hasta registrar una recepción.");
    }
  };

  const cancel = async (event) => {
    event.preventDefault();
    const reason = cancelReason.trim();
    if (reason.length < 1 || reason.length > 500) {
      setActionError("El motivo debe contener entre 1 y 500 caracteres.");
      return;
    }
    const succeeded = await runAction(() => api.cancelPurchaseOrder(id, reason));
    if (succeeded) {
      setCancelOpen(false);
      setCancelReason("");
      setMessage("Orden cancelada. Las recepciones anteriores se conservaron.");
    }
  };

  if (state === "loading") return <div className="page purchases-page"><p className="empty" role="status">Cargando orden…</p></div>;
  if (state === "unconfigured") return <div className="page purchases-page"><FormAlert>El servicio de Compras no está configurado en este entorno.</FormAlert></div>;
  if (state === "not-found") return <div className="page purchases-page"><FormAlert>La orden solicitada ya no está disponible.</FormAlert><Link className="btn" to="/taller/compras/ordenes">Volver a órdenes</Link></div>;
  if (state === "error" || !order) return <div className="page purchases-page"><FormAlert>{error || "No se pudo cargar la orden."}</FormAlert><button className="btn" type="button" onClick={reload}>Reintentar</button></div>;

  const orderLines = order.items ?? [];
  return <div className="page purchases-page">
    <BackLink to="/taller/compras/ordenes"><ArrowLeft size={15} aria-hidden="true" /> Órdenes de compra</BackLink>
    <div className="page-head">
      <div><p className="kicker">ORDEN DE COMPRA</p><h1 className="title">Orden #{order.id}</h1><p className="muted">{order.supplier_name}</p></div>
      <div className="btn-row">
        <span className={`badge ${order.status === "RECEIVED" ? "badge--ok" : order.status === "CANCELLED" ? "badge--warn" : ""}`}>{PURCHASE_ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
        <button className="btn" type="button" onClick={reload}><RefreshCw size={15} aria-hidden="true" /> Actualizar</button>
        {canEditPurchaseOrder(order.status) && <Link className="btn" to={`/taller/compras/ordenes/${id}/editar`}><Pencil size={15} aria-hidden="true" /> Editar borrador</Link>}
        {canIssuePurchaseOrder(order.status) && <button className="btn btn--primary" type="button" onClick={() => { setActionError(""); setIssueOpen(true); }}><Send size={15} aria-hidden="true" /> Emitir</button>}
        {canCancelPurchaseOrder(order.status) && <button className="btn btn--danger" type="button" onClick={() => { setActionError(""); setCancelOpen((value) => !value); }}><Ban size={15} aria-hidden="true" /> Cancelar orden</button>}
      </div>
    </div>

    {message && <p className="purchases-success" role="status">{message}</p>}
    {actionError && <FormAlert>{actionError}</FormAlert>}
    {cancelOpen && <form className="jobtag purchases-form__section" onSubmit={cancel} aria-labelledby="cancel-order-heading">
      <h2 className="subtitle" id="cancel-order-heading">Confirmar cancelación</h2>
      <p className="muted">Las cantidades ya recibidas y sus movimientos se conservarán. Se cancelará el saldo pendiente.</p>
      <Field label="Motivo" htmlFor="order-cancel-reason" required>
        <textarea className="input" id="order-cancel-reason" rows="3" maxLength={500} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
      </Field>
      <div className="btn-row"><button className="btn" type="button" disabled={busy} onClick={() => setCancelOpen(false)}>Volver</button><button className="btn btn--danger" type="submit" disabled={busy || !cancelReason.trim()}>{busy ? "Cancelando…" : "Confirmar cancelación"}</button></div>
    </form>}

    <section className="jobtag purchases-detail">
      <dl className="purchases-detail__grid">
        <div><dt>Proveedor</dt><dd>{order.supplier_name}</dd></div>
        <div><dt>Creada</dt><dd>{dateTime(order.created_at)}</dd></div>
        <div><dt>Entrega estimada</dt><dd>{order.estimated_arrival || "No indicada"}</dd></div>
        <div><dt>Emitida</dt><dd>{dateTime(order.issued_at)}</dd></div>
        <div><dt>Responsable de creación</dt><dd>{order.created_by ?? "—"}</dd></div>
        {order.cancelled_at && <div><dt>Cancelada</dt><dd>{dateTime(order.cancelled_at)} · responsable {order.cancelled_by ?? "—"}</dd></div>}
        {order.cancellation_reason && <div><dt>Motivo de cancelación</dt><dd>{order.cancellation_reason}</dd></div>}
        {order.notes && <div><dt>Notas</dt><dd>{order.notes}</dd></div>}
      </dl>
    </section>

    <section className="purchases-section">
      <h2 className="subtitle">Líneas de la orden</h2>
      {orderLines.map((line) => <article className="jobtag purchases-line" key={line.id}>
        <div className="purchases-card__top"><h3 className="subtitle">{line.description_snapshot ?? line.code_snapshot ?? `Línea ${line.id}`}</h3><span>{line.spare_part_id ? "Repuesto de inventario" : "Concepto libre"}</span></div>
        {line.code_snapshot && <p className="muted">Código: {line.code_snapshot}</p>}
        <dl className="purchases-summary">
          <div><dt>Pedida</dt><dd>{quantity(line.quantity_ordered)}</dd></div>
          <div><dt>Recibida</dt><dd>{quantity(line.quantity_received)}</dd></div>
          <div><dt>Pendiente</dt><dd>{quantity(line.quantity_pending)}</dd></div>
          <div><dt>Facturada</dt><dd>{line.quantity_invoiced === null ? "Sin conciliar" : quantity(line.quantity_invoiced)}</dd></div>
          <div><dt>Cancelada</dt><dd>{quantity(line.quantity_cancelled)}</dd></div>
          <div><dt>Costo unitario</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(line.unit_cost))}</dd></div>
          <div><dt>Subtotal</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(line.subtotal))}</dd></div>
        </dl>
      </article>)}
    </section>

    <section className="jobtag purchases-totals"><h2 className="subtitle">Total de la orden</h2><p className="purchases-grand-total">{formatPurchaseMoney(parsePurchaseMoney(order.total_amount))} · {order.currency || "PEN"}</p><p className="muted">Importe calculado y confirmado por el backend.</p></section>

    {canReceivePurchaseOrder(order.status) && <section className="purchases-section"><div className="purchases-section__head"><div><h2 className="subtitle">Registrar recepción física</h2><p className="muted">Solo se recibirá lo que indique el comprobante de entrega.</p></div><PackageCheck size={20} aria-hidden="true" /></div><PurchaseOrderReceiptForm order={order} api={api} onReceived={reload} onConflict={reload} /></section>}

    <section className="purchases-section">
      <div className="purchases-section__head"><div><h2 className="subtitle">Comprobantes vinculados</h2><p className="muted">La factura, el pago y la recepción son registros separados.</p></div>{order.status !== "CANCELLED" && <Link className="btn" to={`/taller/compras/nuevo?purchase_order_id=${order.id}`}><FilePlus2 size={15} aria-hidden="true" /> Registrar comprobante</Link>}</div>
      {(order.linked_purchases ?? []).length ? <div className="purchases-list">{order.linked_purchases.map((purchase) => <article className="jobtag purchases-card" key={purchase.id}>
        <div className="purchases-card__top"><Link className="purchases-card__document" to={`/taller/compras/${purchase.id}`}>{purchase.document_type} {purchase.document_number}</Link><span className="badge">Pago: {purchase.payment_status === "PAID" ? "Pagado" : "Pendiente"}</span></div>
        <dl className="purchases-summary"><div><dt>Fecha</dt><dd>{purchase.issue_date}</dd></div><div><dt>Estado del comprobante</dt><dd>{purchase.status}</dd></div><div><dt>Total</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(purchase.total_amount))}</dd></div></dl>
      </article>)}</div> : <div className="jobtag empty">Todavía no hay comprobantes vinculados.</div>}
    </section>

    <section className="purchases-section"><h2 className="subtitle">Recepciones</h2>
      {(order.receipts ?? []).length ? order.receipts.map((receipt) => <article className="jobtag purchases-event" key={receipt.id}>
        <h3>Recepción #{receipt.id} · {dateTime(receipt.received_at)}</h3><p>Responsable: {receipt.actor_name || receipt.received_by}</p>{receipt.notes && <p>{receipt.notes}</p>}
        {(receipt.items ?? []).map((line) => {
          const orderLine = orderLines.find((item) => item.id === line.purchase_order_item_id);
          return <div className="purchases-movement" key={`${receipt.id}-${line.purchase_order_item_id}`}>
            <span>{orderLine?.description_snapshot ?? `Línea ${line.purchase_order_item_id}`}: {quantity(line.quantity_received)} recibido(s)</span>
            {line.movement ? <span>Stock {line.movement.stock_before} → {line.movement.stock_after}</span> : <span>Sin cambio de inventario (concepto libre)</span>}
          </div>;
        })}
      </article>) : <div className="jobtag empty">Todavía no hay recepciones.</div>}
    </section>

    <section className="purchases-section"><h2 className="subtitle">Trazabilidad</h2>
      {(order.audit_events ?? []).length ? <ol className="purchases-audit">{order.audit_events.map((event) => <li key={event.id}><strong>{event.event_type}</strong><span>{dateTime(event.created_at)} · responsable {event.actor_user_id}</span>{event.changed_fields && <small>{JSON.stringify(event.changed_fields)}</small>}</li>)}</ol> : <div className="jobtag empty">No hay eventos de auditoría disponibles.</div>}
    </section>

    <div className="btn-row"><Link className="btn" to="/taller/compras/ordenes">Volver a órdenes</Link><Link className="btn" to="/taller/compras">Comprobantes</Link></div>
    <ConfirmDialog open={issueOpen} title="Emitir orden" confirmLabel="Emitir orden" busyLabel="Emitiendo…" busy={busy} error={actionError} onConfirm={issue} onCancel={() => setIssueOpen(false)}>La orden dejará de ser editable. La emisión no modifica el stock; la recepción se registra después.</ConfirmDialog>
  </div>;
}
