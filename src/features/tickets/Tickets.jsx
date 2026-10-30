import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, Plus, Search, Store } from "lucide-react";
import { ItemIcon } from "../../shared/ui/ui.jsx";
import { formatPEN, parseMoney } from "../../domain/money.js";
import { useStore } from "../../state/store.jsx";
import { chatApi } from "../chat/chatApi.js";

const statusInfo = {
  NEW: { id: "received", label: "Recibido · En triage", tone: "blue" },
  IN_DIAGNOSIS: { id: "workshop", label: "En diagnóstico / taller", tone: "blue" },
  QUOTED: { id: "approval", label: "Presupuesto enviado", tone: "teal" },
  PAYMENT_PENDING: { id: "payment", label: "Pago pendiente", tone: "teal" },
  PAID: { id: "workshop", label: "Pago registrado", tone: "blue" },
  IN_REPAIR: { id: "workshop", label: "En reparación / taller", tone: "blue" },
  READY_FOR_DELIVERY: { id: "ready", label: "Listo para retiro o despacho", tone: "green" },
  DELIVERED: { id: "done", label: "Entregado", tone: "muted" },
  CANCELLED: { id: "done", label: "Cancelado", tone: "muted" },
  WARRANTY_IN_REVIEW: { id: "workshop", label: "Garantía en revisión", tone: "blue" },
};

const requestLabels = {
  REPAIR: "Reparación",
  SUPPORT: "Soporte técnico",
  SALE: "Venta de productos",
  PC_BUILD: "Armado de PC",
  WARRANTY_CLAIM: "Reclamo de garantía",
};

const filters = [
  { id: "all", label: "Todos", match: () => true },
  { id: "process", label: "En Proceso", match: (t) => ["received", "workshop", "approval", "payment"].includes(t.status) },
  { id: "ready", label: "Listo para Retiro", match: (t) => t.status === "ready" },
  { id: "done", label: "Finalizado", match: (t) => t.status === "done" },
];

/** Ticket de demostración (estado en memoria) con la etiqueta y el tono de su estado. */
function cardFromDemo(ticket) {
  const state = Object.values(statusInfo).find((s) => s.id === ticket.status) || statusInfo.NEW;
  return { ...ticket, statusLabel: state.label, tone: state.tone };
}

function cardFromTicket(ticket) {
  const state = statusInfo[ticket.status] || statusInfo.NEW;
  const quote = ticket.quote;
  const lines = quote ? [
    { label: "Mano de obra", amount: parseMoney(quote.labor_cost) },
    ...quote.lines.map((line) => ({
      label: `${line.name}${line.quantity > 1 ? ` × ${line.quantity}` : ""}`,
      amount: parseMoney(line.subtotal),
    })),
  ].filter((line) => line.amount !== null && line.amount > 0) : [];
  const date = ticket.created_at ? new Date(ticket.created_at) : null;
  return {
    id: ticket.code,
    when: date && !Number.isNaN(date.valueOf())
      ? date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
      : "Fecha no disponible",
    kind: requestLabels[ticket.request_type] || "Consulta",
    device: ticket.title,
    icon: ticket.request_type === "PC_BUILD" ? "monitor" : "laptop",
    summary: ticket.failure_description,
    note: ticket.status === "QUOTED" ? "Tienes una cotización disponible." : "",
    status: state.id,
    statusLabel: state.label,
    tone: state.tone,
    lines,
    total: quote ? parseMoney(quote.total_amount) : null,
  };
}

export default function Tickets({ api = chatApi }) {
  const { clientTickets } = useStore();
  const demo = api.mode !== "api";
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTickets = async () => {
    if (demo) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.listMyTickets();
      setTickets(data.map(cardFromTicket));
    } catch (err) {
      setError(err?.message || "No se pudieron cargar tus tickets.");
    } finally {
      setLoading(false);
    }
  };

  // Sin backend (modo demostración) se muestran los tickets del estado, incluidas las consultas del chat.
  useEffect(() => {
    if (!demo) return;
    setTickets(clientTickets.map(cardFromDemo));
    setLoading(false);
  }, [demo, clientTickets]);

  useEffect(() => { if (!demo) loadTickets(); }, [demo]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters.find((x) => x.id === filter);
    return tickets.filter((t) => f.match(t) && (!q || `${t.id} ${t.device} ${t.summary}`.toLowerCase().includes(q)));
  }, [tickets, filter, query]);

  const groups = [
    { id: "needs", title: "Necesita tu aprobación", urgent: true, items: visible.filter((t) => ["approval", "payment"].includes(t.status)) },
    { id: "active", title: "En curso", items: visible.filter((t) => ["received", "workshop", "ready"].includes(t.status)) },
    { id: "closed", title: "Finalizados", items: visible.filter((t) => t.status === "done") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="portal">
      <div className="page-head">
        <h1 className="title">Mis Tickets de Atención</h1>
        <Link to="/portal/asistente" className="btn btn--primary">
          <Plus size={18} aria-hidden="true" /> Nueva Consulta / Chat IA
        </Link>
      </div>

      <div className="tools">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Buscar por código o equipo..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar tickets" />
        </label>
        <div className="toggle-group" role="tablist" aria-label="Filtrar por estado">
          {filters.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className="toggle" onClick={() => setFilter(f.id)}>
              {f.label} ({tickets.filter(f.match).length})
            </button>
          ))}
        </div>
      </div>

      <div className="portal" aria-busy={loading}>
        {loading && <p className="empty">Cargando tus tickets...</p>}
        {!loading && error && (
          <div className="retry">
            <p role="alert">{error}</p>
            <button type="button" className="btn btn--sm" onClick={loadTickets}>Reintentar</button>
          </div>
        )}
        {!loading && !error && visible.length === 0 && (
          <p className="empty">{tickets.length ? "No hay tickets que coincidan con la búsqueda." : "Todavía no tienes tickets. Inicia una consulta en el chat para crear uno."}</p>
        )}
        {!loading && !error && groups.map((g) => (
          <section key={g.id} className={`group${g.urgent ? " group--urgent" : ""}`} aria-labelledby={`group-${g.id}`}>
            <div className="group__head">
              <h2 id={`group-${g.id}`} className="subtitle">{g.title}</h2>
              <span className="mono small">{g.items.length}</span>
            </div>
            <div className="group__list">
              {g.items.map((t) => <TicketTag key={t.id} ticket={t} canApprove={demo && g.urgent} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const STEPS = ["Ingreso", "Presupuesto", "En taller", "Listo", "Entregado"];
const STEP_OF = { received: 0, approval: 1, payment: 1, workshop: 2, ready: 3, done: 4 };
const STAMP_TONE = { blue: "info", teal: "warn", green: "ok", muted: "" };

function TicketTag({ ticket: t, canApprove }) {
  const cancelled = t.statusLabel === "Cancelado";
  const step = STEP_OF[t.status] ?? 0;
  const tone = STAMP_TONE[t.tone];
  return (
    <article className={`jobtag tticket${t.status === "done" ? " tticket--done" : ""}`}>
      <div className="tticket__top">
        <span className="kicker">#{t.id}</span>
        <span className="small muted">{t.when}</span>
        <span className="small muted">{t.kind}</span>
        <span className={`stamp${tone ? ` stamp--${tone}` : ""}`}>
          {t.status === "done" && <CircleCheck size={13} aria-hidden="true" />}
          {t.statusLabel}
        </span>
      </div>
      <div className="tticket__main">
        <div>
          <h3 className="tticket__name"><ItemIcon name={t.icon} /> {t.device}</h3>
          <p className="tticket__sum">{t.summary}</p>
          {t.note && <p className="small muted">{t.note}</p>}
        </div>
        {(t.total !== null || t.status === "received") && (
          <div className="tticket__amount">
            <span className="small muted">{t.total !== null ? "Total cotizado" : "Presupuesto"}</span>
            <strong>{formatPEN(t.total)}</strong>
          </div>
        )}
      </div>
      {!cancelled && (
        <ol className="rail" style={{ "--rail-steps": STEPS.length }} aria-label="Avance del ticket">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? "is-done" : i === step ? "is-now" : ""} aria-current={i === step ? "step" : undefined}>{s}</li>
          ))}
        </ol>
      )}
      {t.lines.length > 0 && (
        <div className="budget">
          {t.lines.map((line) => (
            <div key={line.label} className="budget__row"><span>{line.label}</span><span className="mono">{formatPEN(line.amount)}</span></div>
          ))}
          <div className="budget__row budget__row--total"><span>Total</span><span className="mono">{formatPEN(t.total)}</span></div>
        </div>
      )}
      {(t.status === "ready" || (canApprove && t.lines.length > 0)) && (
        <div className="tticket__foot">
          {t.status === "ready" && <span className="stamp stamp--ok"><Store size={14} aria-hidden="true" /> Disponible para retiro o despacho</span>}
          {canApprove && t.lines.length > 0 && <Link to={`/portal/asistente?ticket=${t.id}`} className="btn btn--primary btn--sm">Revisar y aprobar</Link>}
        </div>
      )}
    </article>
  );
}
