import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Field } from "../../shared/ui/ui.jsx";
import { formatPEN, parseMoney } from "../../domain/money.js";
import { commerceApi as defaultApi } from "./commerceApi.js";
import SalesQuoteForm from "./SalesQuoteForm.jsx";

const methods = [
  ["CASH", "Efectivo"],
  ["BANK_TRANSFER", "Transferencia bancaria"],
  ["CREDIT_CARD", "Tarjeta de crédito"],
  ["DEBIT_CARD", "Tarjeta de débito"],
  ["PAYMENT_GATEWAY", "Pasarela de pago"],
];
const amount = (value) => value == null ? "Importe no disponible" : formatPEN(parseMoney(value));

export default function AdminCommerce({ api = defaultApi }) {
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeQuote, setActiveQuote] = useState(null);
  const [activeAcceptance, setActiveAcceptance] = useState(null);
  const [acceptance, setAcceptance] = useState({ confirmation_channel: "IN_PERSON", notes: "", confirmed: false });
  const [confirmation, setConfirmation] = useState({ method: "CASH", transaction_reference: "", notes: "" });
  const [working, setWorking] = useState(false);
  const acceptanceKeys = useRef(new Map());
  const paymentKeys = useRef(new Map());

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextQuotes, nextOrders, nextPayments] = await Promise.all([
        api.listAdminSalesQuotes(), api.listAdminSalesOrders(), api.listAdminPayments(),
      ]);
      setQuotes(nextQuotes); setOrders(nextOrders); setPayments(nextPayments);
    } catch (e) { setError(e.message || "No se pudo cargar el área comercial."); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const recordManualAcceptance = async (event) => {
    event.preventDefault();
    const quote = activeAcceptance;
    if (!quote) return;
    const idempotencyKey = acceptanceKeys.current.get(quote.id) ?? globalThis.crypto?.randomUUID?.() ?? `accept-${quote.id}-${Date.now()}`;
    acceptanceKeys.current.set(quote.id, idempotencyKey); setWorking(true); setError("");
    try {
      const updated = await api.recordManualAcceptance(quote.id, { confirmation_channel: acceptance.confirmation_channel, notes: acceptance.notes.trim() }, { idempotencyKey });
      setQuotes((current) => current.map((item) => item.id === quote.id ? updated : item)); acceptanceKeys.current.delete(quote.id); setActiveAcceptance(null); setAcceptance({ confirmation_channel: "IN_PERSON", notes: "", confirmed: false });
    } catch (e) { setError(e.message || "No se pudo registrar la aceptación."); }
    finally { setWorking(false); }
  };

  const confirmPayment = async (event) => {
    event.preventDefault();
    if (!activeQuote) return;
    const idempotencyKey = paymentKeys.current.get(activeQuote.id) ?? globalThis.crypto?.randomUUID?.() ?? `payment-${activeQuote.id}-${Date.now()}`;
    paymentKeys.current.set(activeQuote.id, idempotencyKey); setWorking(true); setError("");
    try {
      const order = await api.confirmAdminPayment(activeQuote.id, {
        method: confirmation.method,
        transaction_reference: confirmation.transaction_reference.trim() || null,
        notes: confirmation.notes.trim() || null,
      }, { idempotencyKey });
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
      paymentKeys.current.delete(activeQuote.id); setActiveQuote(null); setConfirmation({ method: "CASH", transaction_reference: "", notes: "" });
      await load();
    } catch (e) { setError(e.message || "No se pudo confirmar el pago."); }
    finally { setWorking(false); }
  };

  const cancel = async (quote) => {
    setWorking(true); setError("");
    try {
      const updated = await api.cancelAdminSalesQuote(quote.id, "Cancelada por ADMIN.");
      setQuotes((current) => current.map((item) => item.id === quote.id ? updated : item));
    } catch (e) { setError(e.message || "No se pudo cancelar la cotización."); }
    finally { setWorking(false); }
  };

  const created = async () => { setShowForm(false); await load(); };
  return <div className="page commerce-page">
    <div className="page-head"><div><p className="kicker">Administración</p><h1 className="title">Ventas y pagos</h1></div><button className="btn btn--primary" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? "Cerrar alta" : "Nueva cotización de venta"}</button></div>
    <p className="muted">La oferta, el pago y la venta son estados separados. La venta se registra después de confirmar el cobro recibido.</p>
    {showForm && <SalesQuoteForm api={api} onCreated={created} onCancel={() => setShowForm(false)} />}
    {error && <div className="retry"><p role="alert">{error}</p><button className="btn btn--sm" type="button" onClick={load}><RotateCcw size={14} aria-hidden="true" /> Actualizar</button></div>}
    {loading ? <p className="empty" role="status">Cargando operaciones comerciales…</p> : <>
      <section className="commerce-section" aria-labelledby="admin-quotes-heading"><h2 id="admin-quotes-heading" className="subtitle">Cotizaciones de venta</h2>
        {quotes.length ? <div className="commerce-grid">{quotes.map((quote) => <article className="jobtag commerce-card" key={quote.id}>
          <div className="commerce-card__head"><div><p className="kicker">Oferta #{quote.id}</p><h3 className="subtitle">{quote.customer_name || quote.customer?.display_name || `Cliente #${quote.customerId}`}</h3></div><span className="stamp">{quote.statusLabel}</span></div>
          <ul className="commerce-lines">{quote.lines.map((line, index) => <li key={`${line.sparePartId}-${index}`}><span>{line.name} × {line.quantity}</span><span className="mono">{amount(line.subtotal)}</span></li>)}</ul>
          <div className="commerce-card__total"><span>Total</span><strong>{amount(quote.totalAmount)}</strong></div>
          <div className="commerce-statuses"><span>Oferta: {quote.statusLabel}</span>{quote.paymentStatusLabel && <span>Pago: {quote.paymentStatusLabel}</span>}<span>Reserva: {quote.reservationStatus || "No informada"}</span></div>
          <div className="btn-row">
            {quote.status === "PENDING" && <button className="btn" type="button" disabled={working} onClick={() => setActiveAcceptance(quote)}>Registrar aceptación presencial</button>}
            {quote.status === "ACCEPTED" && quote.paymentStatus === "PENDING" && <button className="btn btn--primary" type="button" disabled={working} onClick={() => setActiveQuote(quote)}>Confirmar pago recibido</button>}
            {["PENDING", "ACCEPTED"].includes(quote.status) && quote.paymentStatus !== "COMPLETED" && <button className="btn btn--sm" type="button" disabled={working} onClick={() => cancel(quote)}>Cancelar oferta</button>}
          </div>
          {activeAcceptance?.id === quote.id && <form className="commerce-form" onSubmit={recordManualAcceptance}>
            <h4 className="subtitle">Confirmar aceptación explícita</h4>
            <p className="small muted">Registra esta acción solo después de que el cliente confirme la oferta.</p>
            <Field label="Canal de confirmación" htmlFor={`accept-channel-${quote.id}`} required><select id={`accept-channel-${quote.id}`} className="input" value={acceptance.confirmation_channel} onChange={(e) => setAcceptance({ ...acceptance, confirmation_channel: e.target.value })}><option value="IN_PERSON">Presencial</option><option value="PHONE">Teléfono</option><option value="OTHER">Otro canal verificado</option></select></Field>
            <label className="commerce-confirm"><input type="checkbox" required checked={acceptance.confirmed} onChange={(e) => setAcceptance({ ...acceptance, confirmed: e.target.checked })} /> Confirmo que el cliente expresó su aceptación de esta oferta.</label>
            <Field label="Evidencia o nota de aceptación" htmlFor={`accept-notes-${quote.id}`} required><textarea id={`accept-notes-${quote.id}`} className="input textarea" minLength={5} maxLength={1000} required value={acceptance.notes} onChange={(e) => setAcceptance({ ...acceptance, notes: e.target.value })} /></Field>
            <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={working || !acceptance.confirmed || acceptance.notes.trim().length < 5}>{working ? "Registrando…" : "Confirmar aceptación del cliente"}</button><button className="btn" type="button" onClick={() => setActiveAcceptance(null)}>Cancelar</button></div>
          </form>}
          {activeQuote?.id === quote.id && <form className="commerce-form" onSubmit={confirmPayment}>
            <h4 className="subtitle">Confirmar cobro externo</h4>
            <Field label="Método de pago" htmlFor={`payment-method-${quote.id}`} required><select id={`payment-method-${quote.id}`} className="input" value={confirmation.method} onChange={(e) => setConfirmation({ ...confirmation, method: e.target.value })}>{methods.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></Field>
            <Field label="Referencia de transacción (opcional)" htmlFor={`payment-reference-${quote.id}`}><input id={`payment-reference-${quote.id}`} className="input" maxLength={100} value={confirmation.transaction_reference} onChange={(e) => setConfirmation({ ...confirmation, transaction_reference: e.target.value })} /></Field>
            <Field label="Notas (opcional)" htmlFor={`payment-notes-${quote.id}`}><textarea id={`payment-notes-${quote.id}`} className="input textarea" maxLength={1000} value={confirmation.notes} onChange={(e) => setConfirmation({ ...confirmation, notes: e.target.value })} /></Field>
            <button className="btn btn--primary" type="submit" disabled={working}>{working ? "Confirmando…" : "Confirmar pago y registrar venta"}</button>
          </form>}
        </article>)}</div> : <p className="empty">No hay cotizaciones de venta.</p>}
      </section>
      <section className="commerce-section" aria-labelledby="admin-orders-heading"><h2 id="admin-orders-heading" className="subtitle">Ventas confirmadas ({orders.length})</h2>{orders.map((order) => <p className="commerce-row" key={order.id}>Venta #{order.id} · Cotización #{order.quoteId} · {order.statusLabel} · {amount(order.totalAmount)}</p>)}</section>
      <section className="commerce-section" aria-labelledby="admin-payments-heading"><h2 id="admin-payments-heading" className="subtitle">Pagos registrados ({payments.length})</h2>{payments.map((payment) => <p className="commerce-row" key={payment.id}>Pago #{payment.id} · Cotización #{payment.quoteId ?? "—"} · {payment.statusLabel}{payment.paymentMethodLabel ? ` · ${payment.paymentMethodLabel}` : ""} · {amount(payment.amount)}</p>)}</section>
    </>}
  </div>;
}
