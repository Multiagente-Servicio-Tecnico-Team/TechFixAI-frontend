import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { BackLink } from "../../shared/ui/ui.jsx";
import { formatPEN, parseMoney } from "../../domain/money.js";
import { commerceApi as defaultApi } from "./commerceApi.js";

const amount = (value) => value == null ? "Importe no disponible" : formatPEN(parseMoney(value));

export default function CustomerOrders({ api = defaultApi }) {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextPayments, nextOrders] = await Promise.all([api.listMyPayments(), api.listMySalesOrders()]);
      setPayments(nextPayments); setOrders(nextOrders);
    } catch (e) {
      setPayments([]); setOrders([]); setError(e.message || "No se pudieron cargar tus compras.");
      if (e.code === "session_required") navigate("/portal/acceso", { replace: true, state: { from: location.pathname } });
    } finally { setLoading(false); }
  }, [api, location.pathname, navigate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page commerce-page">
      <BackLink to="/portal/cotizaciones">Volver a Mis Cotizaciones</BackLink>
      <div className="page-head"><div><p className="kicker">Portal del cliente</p><h1 className="title">Mis compras y pagos</h1></div><Link className="btn" to="/portal/cotizaciones">Ver cotizaciones</Link></div>
      {error && <div className="retry"><p role="alert">{error}</p><button className="btn btn--sm" type="button" onClick={load}><RotateCcw size={14} aria-hidden="true" /> Reintentar</button></div>}
      {loading && <p className="empty" role="status">Cargando compras y pagos…</p>}
      {!loading && !error && !orders.length && !payments.length && <p className="empty">Todavía no tienes compras ni pagos registrados.</p>}
      {!loading && !error && <>
        <section className="commerce-section" aria-labelledby="orders-heading"><h2 id="orders-heading" className="subtitle">Ventas confirmadas</h2>
          {orders.length ? <div className="commerce-grid">{orders.map((order) => <article className="jobtag commerce-card" key={order.id}>
            <div className="commerce-card__head"><div><p className="kicker">Venta #{order.id}</p><h3 className="subtitle">Cotización #{order.quoteId}</h3></div><span className="stamp stamp--ok">{order.statusLabel}</span></div>
            <ul className="commerce-lines">{order.lines.map((line, index) => <li key={`${line.spare_part_id ?? line.name_snapshot}-${index}`}><span>{line.name_snapshot ?? line.name} × {line.quantity}</span><span className="mono">{amount(line.subtotal)}</span></li>)}</ul>
            <div className="commerce-card__total"><span>Total registrado</span><strong>{amount(order.totalAmount)}</strong></div>
          </article>)}</div> : <p className="empty">Aún no hay ventas confirmadas.</p>}
        </section>
        <section className="commerce-section" aria-labelledby="payments-heading"><h2 id="payments-heading" className="subtitle">Historial de pagos</h2>
          {payments.length ? <div className="commerce-grid">{payments.map((payment) => <article className="jobtag commerce-card" key={payment.id}>
            <div className="commerce-card__head"><div><p className="kicker">Pago #{payment.id}</p><p className="small muted">Cotización #{payment.quoteId ?? "—"}</p></div><span className="stamp">{payment.statusLabel}</span></div>
            <div className="commerce-card__total"><span>Importe registrado</span><strong>{amount(payment.amount)}</strong></div>
            {payment.paymentMethodLabel && <p>Método: {payment.paymentMethodLabel}</p>}
          </article>)}</div> : <p className="empty">Aún no hay pagos registrados.</p>}
        </section>
      </>}
    </div>
  );
}
