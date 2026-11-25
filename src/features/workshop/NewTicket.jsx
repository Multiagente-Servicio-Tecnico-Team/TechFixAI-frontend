import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { BackLink, Field } from "../../shared/ui/ui.jsx";
import { useStore } from "../../state/store.jsx";
import { EMAIL_RE } from "../../domain/validation.js";
import { centsToInput, formatPEN, parseMoney } from "../../domain/money.js";
import { REQUEST_TYPE_CODES, REQUEST_TYPE_LABEL, TICKET_CATEGORIES } from "../../domain/tickets.js";
import { ticketsApi } from "./ticketsApi.js";
import CustomerPicker from "../customers/CustomerPicker.jsx";

const methods = [
  { label: "Yape/Plin", code: "YAPE_PLIN" },
  { label: "Efectivo", code: "CASH" },
  { label: "Tarjeta", code: "CARD" },
];
const methodLabel = Object.fromEntries(methods.map(({ label, code }) => [code, label]));

export default function NewTicket() {
  const { staffTickets, dispatch } = useStore();
  const apiMode = ticketsApi.mode === "api";
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ client: "", phone: "", email: "", device: "", issue: "", category: apiMode ? "REPAIR" : "Reparación", advance: "", method: apiMode ? "YAPE_PLIN" : "Yape/Plin" });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const nextId = apiMode ? "Asignado al guardar" : `TCK-${Math.max(...staffTickets.map((t) => Number(t.id.split("-")[1]))) + 1}`;
  const categories = apiMode ? REQUEST_TYPE_CODES : TICKET_CATEGORIES;
  const categoryLabel = (value) => apiMode ? REQUEST_TYPE_LABEL[value] : value;
  const selectedMethodLabel = apiMode ? methodLabel[form.method] : form.method;

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = {};
    const digits = form.phone.replace(/\D/g, "");
    const contactPhone = `+51${digits}`;
    const email = form.email.trim();
    if (form.client.trim().length < 3 || form.client.trim().length > 200) next.client = "Ingresa un nombre de 3 a 200 caracteres.";
    if (apiMode && (!selectedCustomer?.id || !Number.isInteger(Number(selectedCustomer.id)) || Number(selectedCustomer.id) < 1)) next.customer = "Busca y selecciona un cliente comercial antes de crear el ticket.";
    if (digits.length < 9 || contactPhone.length > 20) next.phone = "Ingresa un número local de 9 a 17 dígitos.";
    if (email && (!EMAIL_RE.test(email) || email.length > 255)) next.email = "Correo no válido (máximo 255 caracteres).";
    if (form.device.trim().length < 2 || form.device.trim().length > 200) next.device = "Indica el equipo (2 a 200 caracteres).";
    if (form.issue.trim().length < 5 || form.issue.trim().length > 10000) next.issue = "Describe la falla o solicitud (5 a 10000 caracteres).";
    const advance = form.advance.trim() ? parseMoney(form.advance) : null;
    if (form.advance.trim() && (advance === null || advance <= 0)) next.advance = "Usa un importe positivo, por ejemplo 30 o 30.00.";
    setErrors(next);
    setServerError("");
    if (Object.keys(next).length) {
      document.getElementById(`nt-${{ client: "client", phone: "phone", email: "email", device: "device", issue: "issue", advance: "adv" }[Object.keys(next)[0]]}`)?.focus();
      return;
    }

    if (apiMode) {
      setSubmitting(true);
      try {
        const ticket = await ticketsApi.createManualTicket({
          customer_id: Number(selectedCustomer.id),
          contact_name: form.client.trim(),
          contact_phone: contactPhone,
          contact_email: email || null,
          title: form.device.trim(),
          failure_description: form.issue.trim(),
          request_type: form.category,
          ...(advance === null ? {} : { advance_amount: centsToInput(advance), advance_payment_method: form.method }),
        });
        navigate(`/taller/tickets/${ticket.id}`, { state: { createdCode: ticket.code } });
      } catch (error) {
        if (error.status === 401) navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
        else setServerError(error.message || "No se pudo registrar el ticket.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    dispatch({
      type: "createTicket",
      ticket: {
        client: form.client.trim(),
        phone: `+51 ${digits.replace(/(\d{3})(\d{3})(\d{3}).*/, "$1 $2 $3")}`,
        email,
        device: form.device.trim(),
        issue: form.issue.trim(),
        category: form.category,
        advance,
        method: advance !== null ? selectedMethodLabel : null,
        payment: advance !== null ? `Adelanto ${formatPEN(advance)} · ${selectedMethodLabel}` : "Pendiente",
      },
    });
    navigate(`/taller/tickets/${nextId}`);
  };

  return (
    <div className="page">
      <BackLink to="/taller">Volver a Gestión de Tickets</BackLink>
      <h1 className="title">Crear Nuevo Ticket</h1>

      <form className="intake" onSubmit={submit} noValidate>
        <div className="intake__main">
          <section className="intake__section">
            <div className="intake__head"><h2 className="subtitle">1. Datos del Cliente</h2><p>Recepción rápida en mostrador</p></div>
            {apiMode && <><CustomerPicker value={selectedCustomer} onChange={(customer) => {
              setSelectedCustomer(customer);
              if (!customer) return;
              const digitsOnly = String(customer.phone || "").replace(/\D/g, "");
              const localPhone = digitsOnly.startsWith("51") && digitsOnly.length > 9 ? digitsOnly.slice(2) : digitsOnly;
              setForm((current) => ({ ...current, client: customer.name ?? customer.display_name ?? "", phone: localPhone, email: customer.email ?? "" }));
            }} />{errors.customer && <p className="field__error" role="alert">{errors.customer}</p>}</>}
            <Field label="Nombre Completo / Razón Social" htmlFor="nt-client" required error={errors.client}>
              <input id="nt-client" maxLength={200} className="input" placeholder="Valeria Marcela Gómez Rivas" value={form.client} onChange={set("client")} autoComplete="off" aria-invalid={!!errors.client || undefined} />
            </Field>
            <div className="grid-2">
              <Field label="WhatsApp / Celular" htmlFor="nt-phone" required error={errors.phone}>
                <div className="input-prefix"><span>+51</span><input id="nt-phone" type="tel" inputMode="tel" maxLength={20} className="input" placeholder="987 654 321" value={form.phone} onChange={set("phone")} autoComplete="off" aria-invalid={!!errors.phone || undefined} /></div>
              </Field>
              <Field label={<>Correo Electrónico <span className="muted">(Opcional)</span></>} htmlFor="nt-email" error={errors.email}>
                <input id="nt-email" type="email" maxLength={255} className="input" placeholder="cliente@empresa.pe" value={form.email} onChange={set("email")} autoComplete="off" aria-invalid={!!errors.email || undefined} />
              </Field>
            </div>
          </section>

          <section className="intake__section">
            <div className="intake__head"><h2 className="subtitle">2. Detalle del Equipo y Falla</h2><p>Identificación y motivo de ingreso</p></div>
            <div className="grid-2">
              <Field label="Equipo / Marca y Modelo" htmlFor="nt-device" required error={errors.device}>
                <input id="nt-device" maxLength={200} className="input" placeholder="Laptop Lenovo Legion 5 15ACH6" value={form.device} onChange={set("device")} aria-invalid={!!errors.device || undefined} />
              </Field>
              <Field label="Categoría" htmlFor="nt-cat">
                <select id="nt-cat" className="input" value={form.category} onChange={set("category")}>
                  {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Detalle de la Falla o Solicitud" htmlFor="nt-issue" required error={errors.issue}>
              <textarea id="nt-issue" maxLength={10000} className="input textarea" rows={4} placeholder="Describe síntomas, accesorios recibidos y lo que solicita el cliente." value={form.issue} onChange={set("issue")} aria-invalid={!!errors.issue || undefined} />
            </Field>
          </section>

          <section className="intake__section">
            <div className="intake__head"><h2 className="subtitle">3. Costo y Adelanto</h2><p>Adelanto cobrado en ventanilla (el presupuesto lo emite el diagnóstico)</p></div>
            <div className="grid-2">
              <Field label="Monto Cobrado / Adelanto" htmlFor="nt-adv" error={errors.advance}>
                <div className="input-prefix"><span>S/.</span><input id="nt-adv" inputMode="decimal" maxLength={11} className="input" placeholder="0.00" value={form.advance} onChange={set("advance")} aria-invalid={!!errors.advance || undefined} /></div>
              </Field>
              <fieldset className="field">
                <legend className="field__label">Método de Pago</legend>
                <div className="choice">
                  {methods.map(({ label, code }) => (
                    <label key={code} className={`choice__item${form.method === (apiMode ? code : label) ? " is-active" : ""}`}>
                      <input type="radio" name="method" value={apiMode ? code : label} checked={form.method === (apiMode ? code : label)} onChange={set("method")} />{label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>
          {serverError && <div className="form-alert" role="alert">{serverError}</div>}
        </div>

        <aside className="intake__side" aria-label="Etiqueta del ticket">
          <div className="jobtag jobtag--lg">
            <p className="kicker">Ticket #{nextId}</p>
            <strong className="subtitle">Listo para Emisión Rápida</strong>
            <div className={`tagfield${form.client ? "" : " tagfield--wait"}`}><span>Cliente</span>{form.client || "Por indicar"}</div>
            <div className={`tagfield${form.device ? "" : " tagfield--wait"}`}><span>Equipo</span>{form.device || "Por indicar"}</div>
            <div className="tagfield"><span>Categoría</span>{categoryLabel(form.category)}</div>
            <div className={`tagfield${form.advance ? "" : " tagfield--wait"}`}><span>Adelanto</span>{form.advance ? `S/. ${form.advance} · ${selectedMethodLabel}` : "Sin adelanto"}</div>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
              <CircleCheck size={19} aria-hidden="true" /> {submitting ? "Registrando…" : "Generar Ticket"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
