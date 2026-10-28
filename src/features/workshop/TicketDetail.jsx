import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Banknote, Bot, CalendarDays, CircleCheck, Laptop, MessageSquareText, Save, UserRound } from "lucide-react";
import { BackLink, Toast } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { useTickets } from "./useTickets.js";
import { formatPEN } from "../../domain/money.js";
import { STAFF_STATUSES } from "../../domain/tickets.js";

function Info({ label, children, wide }) {
  return (
    <div className={`info${wide ? " info--wide" : ""}`}>
      <p className="mono-label">{label}</p>
      <div className="info__value">{children}</div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="panel">
      <h2 className="panel__title">
        <span className="icon-tile icon-tile--sm"><Icon size={18} aria-hidden="true" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function TicketDetail({ api }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { ticket, status: loadStatus, error, reload, updateStatus } = useTickets({ api, id });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState(ticket?.status);
  const [toast, setToast] = useState("");

  useEffect(() => setStatus(ticket?.status), [ticket?.status]);

  useEffect(() => {
    if (location.state?.ticketCreated === id) {
      setToast(`Ticket #${id} creado correctamente.`);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [id, location.state, location.pathname, navigate]);

  if (loadStatus === "loading" || loadStatus === "error") {
    return (
      <div className="staff-page">
        <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
        {loadStatus === "loading" ? <p className="empty" role="status">Cargando ticket…</p> : (
          <div className="panel empty-panel">
            <FormAlert>{error}</FormAlert>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>Reintentar</button>
          </div>
        )}
        <Toast message={toast} onDone={() => setToast("")} />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="staff-page">
        <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
        <div className="panel empty-panel">
          <h1 className="page-title">Ticket no encontrado</h1>
          <p>No existe un ticket con el código <strong>{id}</strong>.</p>
          <Link to="/taller" className="btn btn--primary">Ir a la cola de triage</Link>
        </div>
      </div>
    );
  }

  const dirty = status !== ticket.status;
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const saved = await updateStatus(ticket.id, status);
      setStatus(saved.status);
      setToast(`Ticket #${saved.id} actualizado: ${saved.status}.`);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const whatsapp = `https://wa.me/${ticket.phone.replace(/\D/g, "")}`;

  return (
    <div className="staff-page">
      <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
      <div className="page-head">
        <div className="title-row">
          <h1 className="page-title">Ticket #{ticket.id}</h1>
          <span className="tag tag--blue">
            {ticket.origin === "Bot" ? <Bot size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
            {ticket.origin === "Bot" ? "Bot IA" : "Presencial"}
          </span>
          <span className="tag tag--muted"><CalendarDays size={13} aria-hidden="true" />{ticket.date}</span>
        </div>
        <button type="button" className="btn btn--primary" onClick={save} disabled={!dirty || saving}>
          <Save size={17} aria-hidden="true" /> {saving ? "Guardando…" : "Guardar Cambios"}
        </button>
      </div>

      <FormAlert>{saveError}</FormAlert>
      <Section icon={UserRound} title="1. Datos del Cliente">
        <div className="info-grid info-grid--3">
          <Info label="Nombre completo"><strong>{ticket.client}</strong></Info>
          <Info label="Teléfono / WhatsApp">
            <span className="mono info__split">
              {ticket.phone}
              <a href={whatsapp} target="_blank" rel="noreferrer" className="icon-link" aria-label="Abrir WhatsApp"><MessageSquareText size={17} /></a>
            </span>
          </Info>
          <Info label="Correo electrónico">{ticket.email || <span className="muted">No registrado</span>}</Info>
        </div>
      </Section>

      <Section icon={Laptop} title="2. Detalle del Equipo y Falla">
        <div className="info-grid">
          <Info label="Equipo / Marca y modelo"><strong>{ticket.device}</strong></Info>
          <Info label="Detalle de la falla / Motivo de ingreso" wide>{ticket.issue}</Info>
        </div>
      </Section>

      <Section icon={Banknote} title="3. Costo y Estado">
        <div className="info-grid info-grid--3">
          <Info label="Monto presupuestado / Total">
            <span className="amount">{formatPEN(ticket.budget)}</span>
            {ticket.advance !== null && ticket.advance !== undefined && (
              <span className="mono-small">Adelanto: {formatPEN(ticket.advance)} · {ticket.method}</span>
            )}
          </Info>
          <div className="info">
            <label className="mono-label" htmlFor="ticket-status">Estado del ticket</label>
            <select id="ticket-status" className="input select" value={status ?? ticket.status} disabled={saving} onChange={(e) => setStatus(e.target.value)}>
              {STAFF_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Info label="Método de pago / Condición">
            <span className="ok-text"><CircleCheck size={15} aria-hidden="true" /> {ticket.payment}</span>
          </Info>
        </div>
      </Section>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
