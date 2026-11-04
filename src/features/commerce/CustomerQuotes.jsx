import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleCheck, RotateCcw } from "lucide-react";
import { BackLink } from "../../shared/ui/ui.jsx";
import { formatPEN, parseMoney } from "../../domain/money.js";
import { commerceApi as defaultApi } from "./commerceApi.js";

const amount = (value) => value == null ? "Importe no disponible" : formatPEN(parseMoney(value));

export default function CustomerQuotes({ api = defaultApi }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const keys = useRef(new Map());
  const navigate = useNavigate();
  const location = useLocation();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setQuotes(await api.listMyQuotes()); }
    catch (e) {
      setQuotes([]); setError(e.message || "No se pudieron cargar tus cotizaciones.");
      if (e.code === "session_required") navigate("/portal/acceso", { replace: true, state: { from: location.pathname } });
    } finally { setLoading(false); }
  }, [api, location.pathname, navigate]);

  useEffect(() => { load(); }, [load]);

  const accept = async (quote) => {
    if (busyId !== null) return;
    const key = keys.current.get(quote.id) ?? globalThis.crypto?.randomUUID?.() ?? `quote-${quote.id}-${Date.now()}`;
    keys.current.set(quote.id, key);
    setBusyId(quote.id); setError("");
    try {
      const updated = await api.acceptMyQuote(quote.id, { idempotencyKey: key });
      setQuotes((current) => current.map((item) => item.id === quote.id ? updated : item));
      keys.current.delete(quote.id);
    } catch (e) {
      setError(e.message || "No se pudo aceptar la cotización.");
      if (e.code === "session_required") navigate("/portal/acceso", { replace: true, state: { from: location.pathname } });
    } finally { setBusyId(null); }
  };

  return (
    <div className="page commerce-page">
      <BackLink to="/portal/tickets">Volver a Mis Tickets</BackLink>
      <div className="page-head"><div><p className="kicker">Portal del cliente</p><h1 className="title">Mis cotizaciones</h1></div><Link className="btn" to="/portal/compras">Ver mis compras</Link></div>
      <p className="muted">Las ofertas de servicio y de productos se muestran por separado de los pagos y las ventas.</p>
      {error && <div className="retry"><p role="alert">{error}</p><button className="btn btn--sm" type="button" onClick={load}><RotateCcw size={14} aria-hidden="true" /> Reintentar</button></div>}
      {loading && <p className="empty" role="status">Cargando cotizaciones…</p>}
      {!loading && !error && quotes.length === 0 && <p className="empty">Todavía no tienes cotizaciones.</p>}
      <div className="commerce-grid" aria-busy={loading}>
        {quotes.map((quote) => (
          <article className="jobtag commerce-card" id={`quote-${quote.id}`} key={quote.id}>
            <div className="commerce-card__head"><div><p className="kicker">Cotización #{quote.id}</p><h2 className="subtitle">{quote.kindLabel}</h2></div><span className="stamp">{quote.statusLabel}</span></div>
            {quote.ticketId && <p className="small muted">Ticket relacionado: #{quote.ticketId}</p>}
            <ul className="commerce-lines">
              {quote.lines.map((line, index) => <li key={`${line.sparePartId ?? line.name}-${index}`}><span>{line.name} × {line.quantity}</span><span className="mono">{amount(line.subtotal)}</span></li>)}
            </ul>
            <div className="commerce-card__total"><span>Total</span><strong>{amount(quote.totalAmount)}</strong></div>
            {quote.expires_at && <p className="small muted">Vence: {new Date(quote.expires_at).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</p>}
            <div className="commerce-statuses"><span>Oferta: {quote.statusLabel}</span>{quote.paymentStatusLabel && <span>Pago: {quote.paymentStatusLabel}</span>}{quote.reservationStatus && quote.kind === "DIRECT_SALE" && <span>Reserva: {quote.reservationStatus}</span>}</div>
            {quote.status === "PENDING" && <button className="btn btn--primary" type="button" disabled={busyId !== null} onClick={() => accept(quote)}><CircleCheck size={16} aria-hidden="true" />{busyId === quote.id ? "Enviando…" : "Aceptar cotización"}</button>}
          </article>
        ))}
      </div>
    </div>
  );
}
