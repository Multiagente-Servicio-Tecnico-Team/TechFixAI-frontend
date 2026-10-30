import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Barcode, Laptop, Lock, Save, Trash2, X } from "lucide-react";
import { BackLink, Field, InputIcon } from "../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { centsToInput } from "../../domain/money.js";
import { PART_CATEGORIES, validatePart } from "../../domain/inventory.js";
import { useInventory } from "./useInventory.js";

const BACK = "/taller/inventario";

/** Alta de un SKU nuevo (sin parámetro) o edición, ajuste de stock y baja (con :sku). */
export default function PartForm({ api }) {
  const { sku } = useParams();
  const inventory = useInventory(api);
  const editing = Boolean(sku);
  const existing = editing ? inventory.parts.find((p) => p.sku === sku) : null;

  if (editing && inventory.status === "loading") {
    return (
      <div className="page">
        <BackLink to={BACK}>Volver a Inventario de Repuestos</BackLink>
        <p className="empty" role="status">Cargando repuesto…</p>
      </div>
    );
  }
  if (editing && !existing) {
    return (
      <div className="page">
        <BackLink to={BACK}>Volver a Inventario de Repuestos</BackLink>
        <div className="jobtag jobtag--lg">
          <h1 className="title">Repuesto no encontrado</h1>
          <p>No existe el SKU <strong>{sku}</strong>.</p>
          {inventory.error && <FormAlert>{inventory.error}</FormAlert>}
          <Link to={BACK} className="btn btn--primary">Volver al inventario</Link>
        </div>
      </div>
    );
  }
  // El formulario se monta con el repuesto ya cargado para que sus valores iniciales sean los correctos.
  return <PartEditor key={existing?.sku ?? "nuevo"} existing={existing} inventory={inventory} />;
}

function PartEditor({ existing, inventory }) {
  const navigate = useNavigate();
  const editing = Boolean(existing);
  const [form, setForm] = useState(() => ({
    sku: existing?.sku ?? "",
    name: existing?.name ?? "",
    category: existing?.category || PART_CATEGORIES[1],
    compat: existing?.compat ?? "",
    stock: existing ? String(existing.stock) : "",
    min: existing ? String(existing.min) : "",
    price: existing ? centsToInput(existing.price) : "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === "sku" ? e.target.value.toUpperCase() : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const { errors: next, part } = validatePart(editing ? { ...form, sku: existing.sku } : form, {
      editing,
      existingSkus: inventory.parts.map((p) => p.sku),
    });
    setErrors(next);
    setServerError("");
    if (!part) return;
    setSaving(true);
    try {
      await inventory.save({ ...existing, ...part }, { editing });
      navigate(BACK);
    } catch (err) {
      // Un SKU duplicado se muestra en su campo; el resto, arriba de los botones.
      if (err.field && err.field in form) setErrors({ [err.field]: err.message });
      else setServerError(err.message);
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await inventory.remove(existing.sku);
      navigate(BACK);
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <BackLink to={BACK}>Volver a Inventario de Repuestos</BackLink>
      <h1 className="title">{editing ? "Editar Repuesto y Ajustar Stock" : "Registrar Nuevo Repuesto (SKU)"}</h1>

      <form onSubmit={submit} noValidate className="intake">
        <div className="intake__main">
        <section className="intake__section">
          <div className="intake__head">
            <h2 className="subtitle">{editing ? "Datos del Repuesto" : "1. Identificación y Categoría"}</h2>
            <p>Especificaciones técnicas, catalogación y compatibilidad del componente</p>
          </div>
          <div className="grid-2">
            <Field
              label="Código SKU"
              htmlFor="pf-sku"
              required={!editing}
              error={errors.sku}
              aside={editing && <span className="muted small">Identificador único</span>}
            >
              <InputIcon icon={editing ? null : Barcode} suffix={editing ? <Lock size={16} aria-label="No editable" /> : null}>
                <input id="pf-sku" className={`input mono${editing ? " input--locked" : " input--icon"}`} placeholder="SSD-NVME-2TB-KC" value={form.sku} onChange={set("sku")} readOnly={editing} />
              </InputIcon>
            </Field>
            <Field label="Categoría de Componente" htmlFor="pf-cat" required error={errors.category}>
              <select id="pf-cat" className="input" value={form.category} onChange={set("category")}>
                {PART_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Nombre y Descripción del Componente" htmlFor="pf-name" required error={errors.name}>
            <input id="pf-name" className="input" placeholder="SSD NVMe M.2 2TB Kingston KC3000 PCIe 4.0" value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Equipos y Modelos Compatibles" htmlFor="pf-compat">
            <InputIcon icon={Laptop}>
              <input id="pf-compat" className="input input--icon" placeholder="Dell XPS 13/15, ThinkPad X1 Carbon, Universales NVMe M.2 2280" value={form.compat} onChange={set("compat")} />
            </InputIcon>
          </Field>
        </section>

        <section className="intake__section">
          <div className="intake__head">
            <h2 className="subtitle">{editing ? "Stock Operativo y Precios" : "2. Stock Operativo y Precios"}</h2>
            <p>Cantidades disponibles para órdenes de trabajo, alertas de reposición y tarifa de cotización</p>
          </div>
          <div className="grid-3">
            <Field label={editing ? "Stock Actual Disponible" : "Cantidad Inicial"} htmlFor="pf-stock" required error={errors.stock}>
              <InputIcon suffix="Unid.">
                <input id="pf-stock" inputMode="numeric" className="input" placeholder="0" value={form.stock} onChange={set("stock")} />
              </InputIcon>
            </Field>
            <Field label="Stock Mínimo de Alerta" htmlFor="pf-min" required error={errors.min}>
              <InputIcon suffix="Unid.">
                <input id="pf-min" inputMode="numeric" className="input" placeholder="0" value={form.min} onChange={set("min")} />
              </InputIcon>
            </Field>
            <Field label="Precio de Venta / Cotización (PEN)" htmlFor="pf-price" required error={errors.price}>
              <div className="input-prefix">
                <span>S/.</span>
                <input id="pf-price" inputMode="decimal" className="input mono" placeholder="0.00" value={form.price} onChange={set("price")} />
              </div>
            </Field>
          </div>
        </section>
        </div>

        <aside className="intake__side" aria-label="Etiqueta del repuesto">
        <div className="jobtag jobtag--lg">
          <p className="kicker">{form.sku || "SKU por indicar"}</p>
          <strong className="subtitle">{form.name || "Repuesto sin nombre"}</strong>
          <div className="tagfield"><span>Categoría</span>{form.category}</div>
          <div className={`tagfield${form.stock ? "" : " tagfield--wait"}`}><span>Stock</span>{form.stock ? `${form.stock} u. · mínimo ${form.min || "por indicar"}` : "Por indicar"}</div>
          <div className={`tagfield${form.price ? "" : " tagfield--wait"}`}><span>Precio</span>{form.price ? `S/. ${form.price}` : "Por indicar"}</div>
        <FormAlert>{serverError}</FormAlert>
        <div className="intake__actions">
          {editing && (
            <button type="button" className="btn btn--danger-ghost" onClick={() => { setDeleteError(""); setConfirming(true); }} disabled={saving}>
              <Trash2 size={17} aria-hidden="true" /> Eliminar repuesto
            </button>
          )}
          <Link to={BACK} className="btn"><X size={17} aria-hidden="true" /> Cancelar</Link>
          <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
            <Save size={18} aria-hidden="true" /> {saving ? "Guardando…" : editing ? "Guardar Cambios" : "Guardar Repuesto"}
          </button>
        </div>
        </div>
        </aside>
      </form>

      {editing && (
        <ConfirmDialog
          open={confirming}
          title="¿Eliminar este repuesto?"
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(false)}
        >
          <p>
            Se quitará <strong>{existing.name}</strong> (SKU <span className="mono">{existing.sku}</span>) del inventario.
            Esta acción no se puede deshacer.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
