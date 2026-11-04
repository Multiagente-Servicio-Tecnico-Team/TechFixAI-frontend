import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bot, CalendarDays, CircleCheck, MessageSquareText, Save, UserRound } from "lucide-react";
import { BackLink, Toast } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { useTickets } from "./useTickets.js";
import { formatPEN } from "../../domain/money.js";
import { STAFF_STATUSES } from "../../domain/tickets.js";

function Datum({ label, children }) {
  return (
    <div className="datum">
      <p className="datum__label">{label}</p>
      <div>{children}</div>
    </div>
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
      <div className="page">
        <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
        {loadStatus === "loading" ? <p className="empty" role="status">Cargando ticket…</p> : (
          <div className="jobtag jobtag--lg">
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
      <div className="page">
        <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
        <div className="jobtag jobtag--lg">
          <h1 className="title">Ticket no encontrado</h1>
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
    <div className="page">
      <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
      <article className="jobtag jobtag--lg">
        <div className="detail__top">
          <div>
            <h1 className="title">Ticket #{ticket.id}</h1>
            <p className="detail__device">{ticket.device}</p>
            <div className="detail__meta">
              <span className="stamp stamp--info">
                {ticket.origin === "Bot" ? <Bot size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
                {ticket.origin === "Bot" ? "Bot IA" : "Presencial"}
              </span>
              <span className="stamp"><CalendarDays size={13} aria-hidden="true" />{ticket.date}</span>
            </div>
          </div>
        </div>

        <ol className="rail" aria-label="Avance del ticket">
          {STAFF_STATUSES.map((s, i) => {
            const at = STAFF_STATUSES.indexOf(status);
            return <li key={s} className={i < at ? "is-done" : i === at ? "is-now" : ""} aria-current={i === at ? "step" : undefined}>{s}</li>;
          })}
        </ol>

        <FormAlert>{saveError}</FormAlert>
        <div className="detail__move">
          <div className="field">
            <label className="field__label" htmlFor="ticket-status">Estado del ticket</label>
            <select id="ticket-status" className="input" value={status ?? ticket.status} disabled={saving} onChange={(e) => setStatus(e.target.value)}>
              {STAFF_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={save} disabled={!dirty || saving}>
            <Save size={17} aria-hidden="true" /> {saving ? "Guardando…" : "Guardar Cambios"}
          </button>
        </div>

        <div className="detail__cols">
          <section className="datum" aria-label="Datos del cliente">
            <h2 className="subtitle">Cliente</h2>
            <Datum label="Nombre completo"><strong>{ticket.client}</strong></Datum>
            <Datum label="Teléfono / WhatsApp">
              <span className="mono datum__row">
                {ticket.phone}
                <a href={whatsapp} target="_blank" rel="noreferrer" className="icon-btn" aria-label="Abrir WhatsApp"><MessageSquareText size={17} /></a>
              </span>
            </Datum>
            <Datum label="Correo electrónico">{ticket.email || <span className="muted">No registrado</span>}</Datum>
          </section>
          <section className="datum" aria-label="Detalle del equipo y falla">
            <h2 className="subtitle">Equipo y falla</h2>
            <Datum label="Equipo / Marca y modelo"><strong>{ticket.device}</strong></Datum>
            <Datum label="Detalle de la falla / Motivo de ingreso">{ticket.issue}</Datum>
          </section>
          <section className="datum" aria-label="Costo">
            <h2 className="subtitle">Costo</h2>
            <Datum label="Monto presupuestado / Total">
              <span className="amount">{formatPEN(ticket.budget)}</span>
              {ticket.advance !== null && ticket.advance !== undefined && (
                <span className="small muted"> Adelanto: {formatPEN(ticket.advance)} · {ticket.method}</span>
              )}
            </Datum>
            <Datum label="Método de pago / Condición">
              <span className="ok-text"><CircleCheck size={15} aria-hidden="true" /> {ticket.payment}</span>
            </Datum>
          </section>
        </div>
      </article>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
