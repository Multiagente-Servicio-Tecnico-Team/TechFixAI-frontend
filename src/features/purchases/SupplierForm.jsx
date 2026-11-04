import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Hash, Mail, Phone, Save, User, X } from "lucide-react";
import { BackLink, Field, InputIcon } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { emptySupplierDraft, leadTimeLabel, SUPPLIER_LIMITS, supplierToDraft, validateSupplier } from "../../domain/suppliers.js";
import { purchasesApi as defaultApi } from "./purchasesApi.js";

const BACK = "/taller/compras/proveedores";
const LOGIN = "/taller/acceso";

/** Alta (sin parámetro) o edición (con :id) de un proveedor. */
export default function SupplierForm({ api = defaultApi }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const editing = Boolean(id);
  // Desde el listado llega el proveedor en la navegación; si se abre el enlace directo, se consulta al backend.
  const fromList = location.state?.supplier?.id === Number(id) ? location.state.supplier : null;
  const [supplier, setSupplier] = useState(fromList);
  const [state, setState] = useState(api.mode === "unconfigured" ? "unconfigured" : editing && !fromList ? "loading" : "ready");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing || fromList || api.mode === "unconfigured") return undefined;
    let alive = true;
    api.getSupplier(id).then(
      (found) => { if (alive) { setSupplier(found); setState("ready"); } },
      (err) => {
        if (!alive) return;
        if (err.code === "session_required") { navigate(LOGIN, { replace: true, state: { from: location.pathname } }); return; }
        setError(err.message);
        setState(err.code === "not_found" ? "not-found" : "error");
      },
    );
    return () => { alive = false; };
  }, [api, editing, fromList, id, navigate, location.pathname]);

  const title = editing ? "Editar proveedor" : "Registrar proveedor";
  if (state !== "ready") {
    return (
      <div className="page">
        <BackLink to={BACK}>Volver a Proveedores</BackLink>
        <h1 className="title">{title}</h1>
        {state === "loading" && <p className="empty" role="status">Cargando proveedor…</p>}
        {state === "unconfigured" && <FormAlert>El servicio de Compras no está configurado en este entorno.</FormAlert>}
        {(state === "error" || state === "not-found") && (
          <div className="retry">
            <FormAlert>{error}</FormAlert>
            <Link to={BACK} className="btn btn--sm">Volver al listado</Link>
          </div>
        )}
      </div>
    );
  }
  return <SupplierEditor key={supplier?.id ?? "nuevo"} api={api} supplier={supplier} title={title} />;
}

function SupplierEditor({ api, supplier, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editing = Boolean(supplier);
  const [draft, setDraft] = useState(() => (supplier ? supplierToDraft(supplier) : emptySupplierDraft()));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const submit = async (event) => {
    event.preventDefault();
    const { errors: next, payload } = validateSupplier(draft);
    setErrors(next);
    setServerError("");
    if (!payload) {
      document.getElementById(`sf-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const saved = editing ? await api.updateSupplier(supplier.id, payload) : await api.createSupplier(payload);
      navigate(BACK, { state: { toast: editing ? `Cambios guardados en ${saved.name}.` : `${saved.name} quedó registrado.` } });
    } catch (err) {
      setSaving(false);
      if (err.code === "session_required") { navigate(LOGIN, { replace: true, state: { from: location.pathname } }); return; }
      // Un RUC repetido llega como conflicto sin campo; se señala en el RUC para corregirlo ahí.
      const field = err.field ?? (err.status === 409 && /tributari/i.test(err.message) ? "tax_id" : null);
      if (field && field in draft) {
        setErrors({ [field]: err.message });
        document.getElementById(`sf-${field}`)?.focus();
      } else {
        setServerError(err.message);
      }
    }
  };

  const input = (key, { icon = false, attrs = {} } = {}) => (
    <input
      id={`sf-${key}`}
      className={`input${icon ? " input--icon" : ""}`}
      value={draft[key]}
      onChange={set(key)}
      maxLength={SUPPLIER_LIMITS[key]}
      aria-invalid={Boolean(errors[key])}
      {...attrs}
    />
  );
  const days = draft.delivery_lead_days.trim();

  return (
    <div className="page">
      <BackLink to={BACK}>Volver a Proveedores</BackLink>
      <h1 className="title">{title}</h1>

      <form onSubmit={submit} noValidate className="intake">
        <div className="intake__main">
          <section className="intake__section">
            <div className="intake__head">
              <h2 className="subtitle">1. Datos legales</h2>
              <p>Así aparecerá el proveedor en los comprobantes de compra</p>
            </div>
            <Field label="Razón social" htmlFor="sf-name" required error={errors.name}>
              {input("name", { attrs: { placeholder: "Distribuidora Tech Lima S.A.C.", autoComplete: "organization" } })}
            </Field>
            <Field label="RUC o identificación tributaria" htmlFor="sf-tax_id" error={errors.tax_id} hint="Opcional. No puede repetirse entre proveedores.">
              <InputIcon icon={Hash}>
                {input("tax_id", { attrs: { placeholder: "20601234567", className: "input input--icon mono" } })}
              </InputIcon>
            </Field>
          </section>

          <section className="intake__section">
            <div className="intake__head">
              <h2 className="subtitle">2. Contacto</h2>
              <p>Persona y medios para coordinar pedidos y entregas</p>
            </div>
            <Field label="Persona de contacto" htmlFor="sf-contact_name" error={errors.contact_name}>
              <InputIcon icon={User}>{input("contact_name", { icon: true, attrs: { placeholder: "Ana Torres", autoComplete: "name" } })}</InputIcon>
            </Field>
            <div className="grid-2">
              <Field label="Correo" htmlFor="sf-contact_email" error={errors.contact_email}>
                <InputIcon icon={Mail}>{input("contact_email", { icon: true, attrs: { type: "email", placeholder: "ventas@proveedor.pe", autoComplete: "email" } })}</InputIcon>
              </Field>
              <Field label="Teléfono" htmlFor="sf-phone" error={errors.phone}>
                <InputIcon icon={Phone}>{input("phone", { icon: true, attrs: { type: "tel", placeholder: "+51 987 654 321", autoComplete: "tel" } })}</InputIcon>
              </Field>
            </div>
            <Field label="Dirección" htmlFor="sf-address" error={errors.address}>
              <textarea id="sf-address" className="input" rows={2} maxLength={SUPPLIER_LIMITS.address} value={draft.address} onChange={set("address")} aria-invalid={Boolean(errors.address)} placeholder="Av. Ejemplo 123, Lima" />
            </Field>
          </section>

          <section className="intake__section">
            <div className="intake__head">
              <h2 className="subtitle">3. Entrega</h2>
              <p>Tiempo habitual desde el pedido hasta que llega al taller</p>
            </div>
            <Field label="Plazo estimado de entrega (días)" htmlFor="sf-delivery_lead_days" error={errors.delivery_lead_days}>
              <InputIcon suffix="días">
                {input("delivery_lead_days", { attrs: { inputMode: "numeric", placeholder: "3", maxLength: 3 } })}
              </InputIcon>
            </Field>
          </section>
        </div>

        <aside className="intake__side" aria-label="Ficha del proveedor">
          <div className="jobtag jobtag--lg">
            <p className="kicker">{draft.tax_id.trim() ? `RUC ${draft.tax_id.trim().toUpperCase()}` : "RUC por indicar"}</p>
            <strong className="subtitle">{draft.name.trim() || "Proveedor sin nombre"}</strong>
            {editing && <span className={`stamp ${supplier.active ? "stamp--ok" : "stamp--warn"}`}>{supplier.active ? "Activo" : "Inactivo"}</span>}
            <div className={`tagfield${draft.contact_name.trim() ? "" : " tagfield--wait"}`}><span>Contacto</span>{draft.contact_name.trim() || "Por indicar"}</div>
            <div className={`tagfield${draft.contact_email.trim() || draft.phone.trim() ? "" : " tagfield--wait"}`}>
              <span>Medios</span>{[draft.contact_email.trim(), draft.phone.trim()].filter(Boolean).join(" · ") || "Por indicar"}
            </div>
            <div className={`tagfield${days ? "" : " tagfield--wait"}`}><span>Entrega</span>{/^\d+$/.test(days) ? leadTimeLabel(Number(days)) : "Por indicar"}</div>
            <FormAlert>{serverError}</FormAlert>
            <div className="intake__actions">
              <Link to={BACK} className="btn"><X size={17} aria-hidden="true" /> Cancelar</Link>
              <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
                <Save size={18} aria-hidden="true" /> {saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar proveedor"}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
