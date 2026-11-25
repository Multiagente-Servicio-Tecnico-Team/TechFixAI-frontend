import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bot, CalendarDays, CircleCheck, MessageSquareText, Save, UserRound } from "lucide-react";
import { BackLink, Field, Toast } from "../../shared/ui/ui.jsx";
import { useStore } from "../../state/store.jsx";
import { formatPEN, parseMoney } from "../../domain/money.js";
import { REQUEST_TYPE_LABEL, STAFF_STATUSES, TICKET_STATUS_CODES, ADMIN_TICKET_STATUS_LABEL, TICKET_ORIGIN_LABEL } from "../../domain/tickets.js";
import { normalizeTicketQuote, ticketsApi } from "./ticketsApi.js";
import { inventoryApi } from "./inventoryApi.js";

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
const diagnosisTypeLabel = { NONE: "Sin diagnóstico", HARDWARE: "Hardware", SOFTWARE: "Software", HYBRID: "Hardware y software" };
const SERVICE_REPAIR_TYPES = new Set(["REPAIR", "SUPPORT", "WARRANTY_CLAIM"]);

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
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState({ laborTaskType: "maintenance", parts: [], observations: "" });
  const [parts, setParts] = useState([]);
  const [quoteError, setQuoteError] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [quoteSaving, setQuoteSaving] = useState(false);

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
  const quoteHistory = Array.isArray(ticket.quotes) ? ticket.quotes : quote ? [quote] : [];
  const serviceQuoteType = ticket.requestType === "PC_BUILD"
    ? "PC_BUILD"
    : SERVICE_REPAIR_TYPES.has(ticket.requestType) ? "REPAIR" : null;
  const laborTaskOptions = serviceQuoteType === "PC_BUILD"
    ? [{ value: "pc_build", label: "Armado de PC" }]
    : [{ value: "maintenance", label: "Mantenimiento / reparación" }, { value: "diagnosis", label: "Diagnóstico" }];

  const openQuoteForm = async () => {
    setQuoteFormOpen(true); setQuoteError(""); setInventoryError("");
    if (!serviceQuoteType) {
      setQuoteError("Este tipo de ticket no admite cotizaciones de servicio desde esta pantalla.");
      return;
    }
    setQuoteDraft({ laborTaskType: serviceQuoteType === "PC_BUILD" ? "pc_build" : "maintenance", parts: [], observations: "" });
    if (inventoryApi.mode !== "api") { setParts([]); setInventoryError("El inventario no está conectado; puedes continuar con una cotización solo de mano de obra."); return; }
    try { setParts(await inventoryApi.list()); }
    catch (e) { setParts([]); setInventoryError(`${e.message || "No se pudo cargar el inventario."} Puedes continuar con una cotización solo de mano de obra.`); }
  };

  const createQuote = async (event) => {
    event.preventDefault();
    if (!serviceQuoteType) {
      setQuoteError("Este tipo de ticket no admite cotizaciones de servicio desde esta pantalla."); return;
    }
    const selectedParts = [];
    for (const line of quoteDraft.parts) {
      const sparePartId = Number(line.sparePartId);
      const quantity = Number(line.quantity);
      const selectedPart = parts.find((part) => part.id === sparePartId);
      if (!Number.isInteger(sparePartId) || sparePartId < 1 || !selectedPart) {
        setQuoteError("Selecciona un repuesto válido o elimina la línea vacía."); return;
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
        setQuoteError("Cada cantidad debe ser un número entre 1 y 1000."); return;
      }
      if (quantity > selectedPart.stock) {
        setQuoteError(`La cantidad de «${selectedPart.name}» supera las ${selectedPart.stock} unidades disponibles.`); return;
      }
      selectedParts.push({ spare_part_id: sparePartId, quantity });
    }
    setQuoteSaving(true); setQuoteError("");
    try {
      const created = await ticketsApi.createServiceQuote(id, {
        quote_type: serviceQuoteType,
        labor_task_type: serviceQuoteType === "PC_BUILD" ? "pc_build" : quoteDraft.laborTaskType,
        parts: selectedParts,
        observations: quoteDraft.observations.trim() || null,
      });
      const updated = await ticketsApi.getTicket(id);
      const createdQuote = normalizeTicketQuote({
        ...created,
        lines: selectedParts.map((line) => {
          const part = parts.find((item) => item.id === line.spare_part_id);
          return {
            spare_part_id: part.id,
            name_snapshot: part.name,
            quantity: line.quantity,
          };
        }),
      });
      const previousQuotes = [
        ...(updated.quotes ?? []),
        ...(ticket.quotes ?? []),
        ...(ticket.quote ? [ticket.quote] : []),
      ];
      const history = [createdQuote, ...previousQuotes.filter((item) => item.id !== createdQuote.id)];
      setTicket({ ...updated, quote: createdQuote, quotes: history });
      setQuoteFormOpen(false); setToast("Cotización de servicio registrada.");
    } catch (e) {
      setQuoteError(e.message || "No se pudo crear la cotización.");
      if (e.status === 401) navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
    } finally { setQuoteSaving(false); }
  };

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

        {(ticket.hardware_diagnosis?.trim() || ticket.software_diagnosis?.trim()) && <section className="datum ticket-detail__diagnosis" aria-label="Diagnóstico técnico del ticket">
          <div className="commerce-card__head"><h2 className="subtitle">Diagnóstico técnico</h2><span className="stamp">{diagnosisTypeLabel[ticket.diagnosis_type] || "Evaluación del equipo"}</span></div>
          {ticket.hardware_diagnosis?.trim() && <Datum label="Hardware">{ticket.hardware_diagnosis}</Datum>}
          {ticket.software_diagnosis?.trim() && <Datum label="Software">{ticket.software_diagnosis}</Datum>}
        </section>}

        {apiMode && <section className="datum ticket-detail__quote" aria-label="Cotización existente">
          <div className="commerce-card__head"><h2 className="subtitle">Cotizaciones de servicio ({quoteHistory.length})</h2><button type="button" className="btn btn--sm" disabled={!serviceQuoteType} onClick={openQuoteForm}>Añadir cotización de servicio</button></div>
          {!serviceQuoteType && <p className="small muted">Las cotizaciones de venta se registran desde el apartado Ventas y pagos; aquí se cotizan servicios asociados al equipo.</p>}
          {quoteHistory.length ? <div className="commerce-grid">{quoteHistory.map((item, index) => <article className="quote-history" key={item.id ?? index}>
            <div className="commerce-card__head"><strong>Cotización #{item.id ?? index + 1}</strong><span className="stamp">{item.statusLabel || item.status}</span></div>
            <div className="detail__cols">
              <Datum label="Tipo">{quoteTypeLabel[item.kind ?? item.quote_type] || item.kind || item.quote_type}</Datum>
              {item.laborCents !== undefined && <Datum label="Mano de obra">{formatPEN(item.laborCents)}</Datum>}
              {item.partsCents !== undefined && <Datum label="Repuestos">{formatPEN(item.partsCents)}</Datum>}
              <Datum label="Total">{formatPEN(item.totalCents ?? item.total_amount)}</Datum>
              <Datum label="Fecha">{item.dateLabel || dateLabel(item.created_at)}</Datum>
              {item.observations && <Datum label="Observaciones">{item.observations}</Datum>}
            </div>
            {item.lines?.length > 0 && <ul className="commerce-lines">{item.lines.map((line, lineIndex) => <li key={`${line.spare_part_id ?? line.name_snapshot}-${lineIndex}`}><span>{line.name_snapshot ?? line.name} × {line.quantity}</span>{line.subtotal != null && <span className="mono">{formatPEN(parseMoney(line.subtotal))}</span>}</li>)}</ul>}
          </article>)}</div> : <p className="muted">No hay una cotización registrada.</p>}
          {quoteFormOpen && <form className="commerce-form" onSubmit={createQuote}>
            <h3 className="subtitle">Nueva cotización</h3>
            <p className="small muted">Tipo de cotización: {quoteTypeLabel[serviceQuoteType]}. Se determina por el tipo de ticket.</p>
            {serviceQuoteType === "PC_BUILD"
              ? <p className="small muted">Mano de obra: armado de PC. El importe lo calcula el backend.</p>
              : <Field label="Tipo de mano de obra" htmlFor="service-quote-labor-task" required><select id="service-quote-labor-task" className="input" value={quoteDraft.laborTaskType} onChange={(e) => setQuoteDraft({ ...quoteDraft, laborTaskType: e.target.value })}>{laborTaskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>}
            <section className="commerce-form__lines" aria-label="Repuestos de la cotización">
              <div className="commerce-card__head"><h4 className="subtitle">Repuestos (opcional)</h4><button type="button" className="btn btn--sm" disabled={!parts.length} onClick={() => setQuoteDraft((current) => ({ ...current, parts: [...current.parts, { sparePartId: "", quantity: "1" }] }))}>Añadir repuesto</button></div>
              {!quoteDraft.parts.length && <p className="small muted">Puedes crear una cotización solo de mano de obra.</p>}
              {quoteDraft.parts.map((line, index) => <div className="grid-2 commerce-line-form" key={index}>
                <Field label={`Repuesto ${index + 1}`} htmlFor={`service-quote-part-${index}`} required><select id={`service-quote-part-${index}`} className="input" value={line.sparePartId} onChange={(e) => setQuoteDraft((current) => ({ ...current, parts: current.parts.map((item, itemIndex) => itemIndex === index ? { ...item, sparePartId: e.target.value } : item) }))}><option value="">Selecciona un artículo</option>{parts.map((part) => <option key={part.id} value={part.id} disabled={part.stock < 1}>{part.name} · {part.stock} disponibles · {formatPEN(part.price)}</option>)}</select></Field>
                <div className="commerce-line-form__quantity"><Field label="Cantidad" htmlFor={`service-quote-quantity-${index}`} required><input id={`service-quote-quantity-${index}`} className="input" type="number" min="1" max="1000" value={line.quantity} onChange={(e) => setQuoteDraft((current) => ({ ...current, parts: current.parts.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: e.target.value } : item) }))} /></Field><button type="button" className="btn btn--sm" onClick={() => setQuoteDraft((current) => ({ ...current, parts: current.parts.filter((_, itemIndex) => itemIndex !== index) }))}>Quitar</button></div>
              </div>)}
            </section>
            {inventoryError && <p className="small muted" role="status">{inventoryError}</p>}
            <Field label="Observaciones" htmlFor="service-quote-observations"><textarea id="service-quote-observations" className="input textarea" maxLength={2000} value={quoteDraft.observations} onChange={(e) => setQuoteDraft({ ...quoteDraft, observations: e.target.value })} /></Field>
            {quoteError && <p className="form-alert" role="alert">{quoteError}</p>}
            <div className="btn-row"><button type="submit" className="btn btn--primary" disabled={quoteSaving || !serviceQuoteType}>{quoteSaving ? "Guardando…" : "Crear cotización"}</button><button type="button" className="btn" onClick={() => setQuoteFormOpen(false)}>Cancelar</button></div>
          </form>}
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
