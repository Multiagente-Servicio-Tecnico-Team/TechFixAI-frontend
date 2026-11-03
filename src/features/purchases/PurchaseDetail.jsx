import { useMemo, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { formatPurchaseMoney, parsePurchaseMoney, quantityToMilli, milliToQuantity, PURCHASE_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS, DOCUMENT_TYPE_LABELS } from "../../domain/purchases.js";
import { BackLink } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { purchasesApi as defaultApi } from "./purchasesApi.js";
import { usePurchaseDetail } from "./usePurchases.js";

function Datum({ label, children }) { return <div className="datum"><span className="datum__label">{label}</span><span>{children ?? "—"}</span></div>; }
function dateTime(value) { return value ? new Date(value).toLocaleString("es-PE") : "—"; }

export default function PurchaseDetail({ api = defaultApi }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { purchase, state, error, setError, reload } = usePurchaseDetail(id, api);
  const [receiptAmounts, setReceiptAmounts] = useState({});
  const [reviewingReceipt, setReviewingReceipt] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const [receiptMessage, setReceiptMessage] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const receivedByLine = useMemo(() => {
    const totals = {};
    for (const receipt of purchase?.receipts ?? []) for (const item of receipt.items ?? []) {
      const amount = quantityToMilli(item.quantity_received);
      if (amount !== null) totals[item.purchase_item_id] = (totals[item.purchase_item_id] ?? 0n) + amount;
    }
    return totals;
  }, [purchase]);

  const receivableLines = (purchase?.items ?? []).map((line) => {
    const ordered = quantityToMilli(line.quantity) ?? 0n;
    const received = receivedByLine[line.id] ?? 0n;
    return { ...line, ordered, received, pending: ordered > received ? ordered - received : 0n };
  }).filter((line) => line.pending > 0n);
  const canReceive = ["REGISTERED", "PARTIALLY_RECEIVED"].includes(purchase?.status) && receivableLines.length > 0;
  const canCancel = purchase?.status === "REGISTERED" && !(purchase?.receipts?.length);

  const changeReceiptAmount = (lineId, value) => {
    setReceiptAmounts((current) => ({ ...current, [lineId]: value }));
    setPendingReceipt(null); setReviewingReceipt(false); setReceiptError(""); setReceiptMessage("");
  };

  const reviewReceipt = () => {
    setReceiptError(""); setReceiptMessage("");
    const items = receivableLines.map((line) => {
      const value = receiptAmounts[line.id] ?? milliToQuantity(line.pending);
      const received = quantityToMilli(value);
      return { line, value, received };
    }).filter(({ received }) => received !== null && received > 0n);
    if (!items.length || items.some(({ line, received }) => received > line.pending || (line.spare_part_id && received % 1000n !== 0n))) {
      setReceiptError("Ingresa cantidades positivas que no superen lo pendiente; los repuestos de inventario usan unidades enteras.");
      return;
    }
    setReviewingReceipt(true);
  };

  const confirmReceipt = async () => {
    const items = receivableLines.map((line) => ({
      purchase_item_id: line.id,
      quantity_received: Number(receiptAmounts[line.id] ?? milliToQuantity(line.pending)),
    })).filter((item) => item.quantity_received > 0);
    const payload = { items, notes: null };
    const payloadText = JSON.stringify(payload);
    const idempotencyKey = pendingReceipt?.payloadText === payloadText ? pendingReceipt.idempotencyKey : globalThis.crypto.randomUUID();
    setPendingReceipt({ payloadText, idempotencyKey }); setBusy(true); setReceiptError(""); setReceiptMessage("");
    try {
      const result = await api.receivePurchase(id, payload, idempotencyKey);
      setPendingReceipt(null); setReviewingReceipt(false); setReceiptAmounts({});
      setReceiptMessage(result.replayed ? "Se recuperó la recepción anterior; no se duplicó el movimiento." : "Recepción confirmada. El stock se actualizó en el backend.");
      await reload();
    } catch (apiError) {
      if (apiError.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      setReceiptError(apiError.message);
    } finally { setBusy(false); }
  };

  const markPaid = async () => {
    setBusy(true); setStatusMessage(""); setError("");
    try { await api.updatePurchase(id, { payment_status: "PAID" }); setStatusMessage("Pago actualizado."); await reload(); }
    catch (apiError) { if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); else setError(apiError.message); }
    finally { setBusy(false); }
  };

  const cancelPurchase = async () => {
    setBusy(true); setError("");
    try { await api.cancelPurchase(id); setCancelOpen(false); setStatusMessage("Compra cancelada."); await reload(); }
    catch (apiError) { if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); else setError(apiError.message); }
    finally { setBusy(false); }
  };

  if (state === "loading") return <div className="page purchases-page"><p className="empty" role="status">Cargando detalle…</p></div>;
  if (state === "unconfigured") return <div className="page purchases-page"><BackLink to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</BackLink><FormAlert>{error || "El servicio de Compras no está configurado."}</FormAlert></div>;
  if (state === "not-found") return <div className="page purchases-page"><BackLink to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</BackLink><div className="jobtag empty">Esta compra ya no está disponible.</div></div>;
  if (state === "error" || !purchase) return <div className="page purchases-page"><BackLink to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</BackLink><FormAlert>{error || "No se pudo cargar la compra."}</FormAlert><button className="btn" type="button" onClick={reload}>Reintentar</button></div>;

  return <div className="page purchases-page">
    <BackLink to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</BackLink>
    <div className="page-head"><div><p className="kicker">DETALLE DE COMPRA · {DOCUMENT_TYPE_LABELS[purchase.document_type] ?? purchase.document_type}</p><h1 className="title">{purchase.document_series ? `${purchase.document_series}-` : ""}{purchase.document_number}</h1><p className="muted">{purchase.supplier_name}</p></div><button className="btn" type="button" onClick={reload}><RefreshCw size={15} aria-hidden="true" /> Actualizar</button></div>
    <section className="jobtag purchases-detail">
      <div className="purchases-card__top"><span className={`badge ${purchase.status === "RECEIVED" ? "badge--ok" : purchase.status === "CANCELLED" ? "badge--warn" : ""}`}>{PURCHASE_STATUS_LABELS[purchase.status] ?? purchase.status}</span><span className="badge">Pago: {PAYMENT_STATUS_LABELS[purchase.payment_status] ?? purchase.payment_status}</span></div>
      <dl className="purchases-detail__grid">
        <Datum label="Proveedor">{purchase.supplier_name}</Datum><Datum label="RUC / identificación">{purchase.supplier_tax_id || "—"}</Datum>
        <Datum label="Fecha de emisión">{purchase.issue_date}</Datum><Datum label="Fecha de vencimiento">{purchase.due_date || "—"}</Datum>
        <Datum label="Método de pago">{PAYMENT_METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}</Datum><Datum label="Responsable">{purchase.responsible_name}</Datum>
        <Datum label="Registrada">{dateTime(purchase.created_at)}</Datum><Datum label="Moneda">{purchase.currency || "PEN"}</Datum>
      </dl>
      {purchase.notes && <p className="purchases-notes"><strong>Notas:</strong> {purchase.notes}</p>}
      {(purchase.payment_status === "PENDING" || canCancel) && <div className="btn-row purchases-detail__actions">{purchase.payment_status === "PENDING" && purchase.status !== "CANCELLED" && <button className="btn" type="button" disabled={busy} onClick={markPaid}>Marcar como pagada</button>}{canCancel && <button className="btn btn--danger" type="button" disabled={busy} onClick={() => setCancelOpen(true)}>Cancelar compra</button>}</div>}
    </section>
    {error && <FormAlert>{error}</FormAlert>}{statusMessage && <p className="purchases-success" role="status">{statusMessage}</p>}

    <section className="purchases-section"><h2 className="subtitle">Líneas del comprobante</h2>
      {(purchase.items ?? []).map((line) => <article className="jobtag purchases-line" key={line.id}>
        <div><h3>{line.description}</h3><p className="muted">{line.code_snapshot ? `SKU ${line.code_snapshot} · ` : "Concepto libre · "}{line.quantity} × {formatPurchaseMoney(parsePurchaseMoney(line.unit_cost))}</p></div>
        <dl className="purchases-summary"><div><dt>Descuento</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(line.discount_amount))}</dd></div><div><dt>Impuesto</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(line.tax_amount))}</dd></div><div><dt>Total línea</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(line.line_total))}</dd></div></dl>
      </article>)}
    </section>

    {canReceive && <section className="purchases-section"><h2 className="subtitle">Confirmar recepción</h2><p className="muted">El stock cambia únicamente cuando el backend confirma esta operación.</p>
      {receiptError && <FormAlert>{receiptError}</FormAlert>}{receiptMessage && <p className="purchases-success" role="status">{receiptMessage}</p>}
      {!reviewingReceipt ? <div className="jobtag purchases-receive-form">{receivableLines.map((line) => <Field key={line.id} label={`${line.description} · pendiente ${milliToQuantity(line.pending)}`} htmlFor={`receive-${line.id}`}><input className="input" id={`receive-${line.id}`} inputMode="decimal" min="0" step={line.spare_part_id ? "1" : "0.001"} value={receiptAmounts[line.id] ?? milliToQuantity(line.pending)} onChange={(event) => changeReceiptAmount(line.id, event.target.value)} /></Field>)}<button className="btn btn--primary" type="button" onClick={reviewReceipt}>Revisar cantidades</button></div> : <div className="jobtag purchases-receipt-review"><h3>Revisa la recepción</h3><ul>{receivableLines.map((line) => <li key={line.id}>{line.description}: {receiptAmounts[line.id] ?? milliToQuantity(line.pending)} de {milliToQuantity(line.pending)} pendiente(s)</li>)}</ul><div className="btn-row"><button className="btn" type="button" disabled={busy} onClick={() => setReviewingReceipt(false)}>Volver a editar</button><button className="btn btn--primary" type="button" disabled={busy} onClick={confirmReceipt}>{busy ? "Confirmando…" : "Confirmar recepción"}</button></div></div>}
    </section>}

    <section className="jobtag purchases-totals"><h2 className="subtitle">Resumen</h2><dl>
      <div><dt>Subtotal</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(purchase.subtotal))}</dd></div><div><dt>Descuentos</dt><dd>− {formatPurchaseMoney(parsePurchaseMoney(purchase.discount_total))}</dd></div><div><dt>Impuestos</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(purchase.tax_total))}</dd></div><div><dt>Otros cargos</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(purchase.other_charges))}</dd></div><div className="purchases-grand-total"><dt>Total {purchase.currency || "PEN"}</dt><dd>{formatPurchaseMoney(parsePurchaseMoney(purchase.total_amount))}</dd></div>
    </dl></section>

    <section className="purchases-section"><h2 className="subtitle">Recepciones</h2>
      {purchase.receipts?.length ? purchase.receipts.map((receipt) => <article className="jobtag purchases-event" key={receipt.id}><h3>Recepción #{receipt.id} · {dateTime(receipt.received_at)}</h3><p>Responsable: {receipt.actor_name || receipt.received_by}</p>{receipt.notes && <p>{receipt.notes}</p>}{receipt.items?.map((item) => <div className="purchases-movement" key={`${receipt.id}-${item.purchase_item_id}`}><span>{item.quantity_received} recibido(s)</span>{item.movement ? <span>Stock {item.movement.stock_before} → {item.movement.stock_after} · {item.movement.name_snapshot || item.movement.code_snapshot}</span> : <span>Sin cambio de inventario (concepto libre)</span>}</div>)}</article>) : <div className="jobtag empty">Todavía no hay recepciones.</div>}
    </section>

    <section className="purchases-section"><h2 className="subtitle">Trazabilidad</h2>
      {purchase.audit_events?.length ? <ol className="purchases-audit">{purchase.audit_events.map((event, index) => <li key={`${event.event_type}-${event.created_at}-${index}`}><strong>{event.event_type}</strong><span>{dateTime(event.created_at)} · {event.actor_name || event.actor_user_id}</span><small>{event.changed_fields ? JSON.stringify(event.changed_fields) : ""}</small></li>)}</ol> : <div className="jobtag empty">No hay eventos de auditoría disponibles.</div>}
    </section>
    <div className="btn-row"><button className="btn" type="button" onClick={() => navigate("/taller/compras")}>Volver al listado</button><Link className="btn" to="/taller/compras/proveedores">Gestionar proveedores</Link></div>
    <ConfirmDialog open={cancelOpen} title="Cancelar compra" confirmLabel="Cancelar compra" busyLabel="Cancelando…" busy={busy} onConfirm={cancelPurchase} onCancel={() => setCancelOpen(false)}>La compra se conservará en el historial y no podrá recibir mercancía.</ConfirmDialog>
  </div>;
}
