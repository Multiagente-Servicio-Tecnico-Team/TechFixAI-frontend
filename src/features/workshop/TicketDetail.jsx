import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bot, CalendarDays, CircleCheck, MessageSquareText, Save, UserRound } from "lucide-react";
import { BackLink, Toast } from "../../shared/ui/ui.jsx";
import { useStore } from "../../state/store.jsx";
import { formatPEN } from "../../domain/money.js";
import { REQUEST_TYPE_LABEL, STAFF_STATUSES, TICKET_STATUS_CODES, ADMIN_TICKET_STATUS_LABEL, TICKET_ORIGIN_LABEL } from "../../domain/tickets.js";
import { ticketsApi } from "./ticketsApi.js";

function Datum({ label, children }) {
  return <div className="datum"><p className="datum__label">{label}</p><div>{children}</div></div>;
}

function dateLabel(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const auditLabel = { CREATED: "Ticket creado", UPDATED: "Ticket actualizado", STATUS_CHANGED: "Estado actualizado", CANCELLED: "Ticket cancelado", QUOTE_CREATED: "Cotización registrada" };
const quoteTypeLabel = { REPAIR: "Reparación", DIRECT_SALE: "Venta directa", PC_BUILD: "Armado de PC" };

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { staffTickets, dispatch } = useStore();
  const apiMode = ticketsApi.mode === "api";
  const demoTicket = staffTickets.find((t) => t.id === id);
  const [ticket, setTicket] = useState(apiMode ? null : demoTicket);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(apiMode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!apiMode) { setTicket(demoTicket); setLoading(false); return undefined; }
    let active = true;
    setLoading(true);
    setError("");
    setTicket(null);
    ticketsApi.getTicket(id).then((data) => {
      if (active) setTicket(data);
    }).catch((e) => {
      if (active && e.status === 401) navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      else if (active) setError(e.message || "No se pudo cargar el ticket.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, apiMode, demoTicket, navigate, location.pathname]);

  const persistedStatus = apiMode ? ticket?.statusCode : ticket?.status;
  useEffect(() => setStatus(persistedStatus || ""), [persistedStatus]);

  if (loading) return <div className="page"><BackLink to="/taller">Volver a Gestión de Tickets</BackLink><p className="form-alert" role="status">Cargando ticket…</p></div>;
  if (!ticket) {
    return (
      <div className="page">
        <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
        <div className="jobtag jobtag--lg" role={error ? "alert" : undefined}>
          <h1 className="title">{error ? "No se pudo abrir el ticket" : "Ticket no encontrado"}</h1>
          <p>{error || `No existe un ticket con el código ${id}.`}</p>
          {error && <button type="button" className="btn" onClick={() => { setError(""); setLoading(true); ticketsApi.getTicket(id).then(setTicket).catch((e) => { if (e.status === 401) navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); else setError(e.message || "No se pudo cargar el ticket."); }).finally(() => setLoading(false)); }}>Reintentar</button>}
          {!error && <Link to="/taller" className="btn btn--primary">Ir al Banco</Link>}
        </div>
      </div>
    );
  }

  const statusOptions = apiMode ? TICKET_STATUS_CODES : STAFF_STATUSES;
  const statusText = (code) => apiMode ? ADMIN_TICKET_STATUS_LABEL[code] || "Estado no disponible" : code;
  const dirty = status !== persistedStatus;
  const save = async () => {
    if (!dirty || saving) return;
    setError("");
    if (!apiMode) {
      dispatch({ type: "updateTicket", id: ticket.id, changes: { status } });
      setToast(`Ticket #${ticket.id} actualizado: ${status}.`);
      return;
    }
    setSaving(true);
    try {
      const updated = await ticketsApi.updateTicket(id, { status });
      setTicket(updated);
      setStatus(updated.statusCode);
      setToast(`Ticket ${updated.code} actualizado: ${updated.status}.`);
    } catch (e) {
      setStatus(ticket.statusCode);
      setError(e.message || "No se pudo actualizar el ticket.");
      if (e.status === 401) navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      if (e.status === 403 || e.status === 404) setTicket(null);
    } finally { setSaving(false); }
  };

  const visibleId = apiMode ? ticket.code : ticket.id;
  const originCode = ticket.originCode;
  const online = apiMode ? originCode === "ONLINE" : ticket.origin === "Bot";
  const statusIndex = statusOptions.indexOf(status);
  const whatsappDigits = ticket.phone.replace(/\D/g, "");
  const quote = ticket.quote;

  return (
    <div className="page">
      <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
      <article className="jobtag jobtag--lg">
        <div className="detail__top">
          <div>
            <h1 className="title">Ticket {apiMode ? visibleId : `#${visibleId}`}</h1>
            <p className="detail__device">{ticket.device}</p>
            <div className="detail__meta">
              <span className="stamp stamp--info">{online ? <Bot size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}{apiMode ? TICKET_ORIGIN_LABEL[originCode] || TICKET_ORIGIN_LABEL.UNKNOWN : online ? "Bot IA" : "Presencial"}</span>
              <span className="stamp"><CalendarDays size={13} aria-hidden="true" />{ticket.date}</span>
              {apiMode && <span className="stamp">{REQUEST_TYPE_LABEL[ticket.requestType] || ticket.requestType}</span>}
            </div>
          </div>
        </div>

        <ol className="rail" aria-label="Avance del ticket">
          {statusOptions.map((code, i) => <li key={code} className={i < statusIndex ? "is-done" : i === statusIndex ? "is-now" : ""} aria-current={i === statusIndex ? "step" : undefined}>{statusText(code)}</li>)}
        </ol>

        <div className="detail__move">
          <div className="field">
            <label className="field__label" htmlFor="ticket-status">Estado del ticket</label>
            <select id="ticket-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map((s) => <option key={s} value={s}>{statusText(s)}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={save} disabled={!dirty || saving}><Save size={17} aria-hidden="true" /> {saving ? "Guardando…" : "Guardar Cambios"}</button>
        </div>
        {error && <div className="form-alert" role="alert">{error}</div>}

        <div className="detail__cols">
          <section className="datum" aria-label="Datos del cliente">
            <h2 className="subtitle">Cliente</h2>
            <Datum label="Nombre completo"><strong>{ticket.client}</strong></Datum>
            <Datum label="Teléfono / WhatsApp"><span className="mono datum__row">{ticket.phone}{whatsappDigits && <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer" className="icon-btn" aria-label="Abrir WhatsApp"><MessageSquareText size={17} /></a>}</span></Datum>
            <Datum label="Correo electrónico">{ticket.email || <span className="muted">No registrado</span>}</Datum>
          </section>
          <section className="datum" aria-label="Detalle del equipo y falla">
            <h2 className="subtitle">Equipo y falla</h2>
            <Datum label="Equipo / Marca y modelo"><strong>{ticket.device}</strong></Datum>
            <Datum label="Detalle de la falla / Motivo de ingreso">{ticket.issue}</Datum>
          </section>
          <section className="datum" aria-label="Costo">
            <h2 className="subtitle">Costo</h2>
            <Datum label="Total de la cotización"><span className="amount">{formatPEN(ticket.budget)}</span></Datum>
            <Datum label="Adelanto">{ticket.advance !== null && ticket.advance !== undefined ? <span>{formatPEN(ticket.advance)} · {ticket.method || "Método no registrado"}</span> : <span className="muted">Sin adelanto</span>}</Datum>
            <Datum label="Estado de pago"><span className="ok-text"><CircleCheck size={15} aria-hidden="true" /> {ticket.payment}</span></Datum>
          </section>
        </div>

        {apiMode && <section className="datum ticket-detail__quote" aria-label="Cotización existente">
          <h2 className="subtitle">Cotización más reciente</h2>
          {quote ? <div className="detail__cols">
            <Datum label="Tipo">{quoteTypeLabel[quote.quote_type] || quote.quote_type}</Datum>
            <Datum label="Mano de obra">{formatPEN(quote.laborCents)}</Datum>
            <Datum label="Repuestos">{formatPEN(quote.partsCents)}</Datum>
            <Datum label="Total">{formatPEN(quote.totalCents)}</Datum>
            <Datum label="Estado">{quote.statusLabel || quote.status}</Datum>
            <Datum label="Fecha">{quote.dateLabel || dateLabel(quote.created_at)}</Datum>
            {quote.observations && <Datum label="Observaciones">{quote.observations}</Datum>}
          </div> : <p className="muted">No hay una cotización registrada.</p>}
        </section>}

        {apiMode && <section className="datum ticket-detail__audit" aria-label="Trazabilidad del ticket">
          <h2 className="subtitle">Trazabilidad</h2>
          {ticket.audit_events?.length ? <ol>{ticket.audit_events.map((event, index) => <li key={`${event.created_at}-${index}`}><strong>{auditLabel[event.event_type] || event.event_type}</strong> · Responsable #{event.actor_user_id} · {dateLabel(event.created_at)}{event.changed_fields && <pre>{JSON.stringify(event.changed_fields, null, 2)}</pre>}</li>)}</ol> : <p className="muted">Sin eventos de auditoría disponibles.</p>}
        </section>}
      </article>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
