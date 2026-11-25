import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Barcode, Laptop, Lock, Save, Trash2, X } from "lucide-react";
import { BackLink, Field, InputIcon } from "../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { centsToInput } from "../../domain/money.js";
import { validatePart } from "../../domain/inventory.js";
import { createIdempotencyKey } from "./inventoryApi.js";
import { useInventory } from "./useInventory.js";

const BACK = "/taller/inventario";

/** Alta/edición de catálogo. Las existencias se crean o ajustan con operaciones separadas. */
export default function PartForm({ api }) {
  const { sku } = useParams();
  const inventory = useInventory(api);
  const editing = Boolean(sku);
  const existing = editing ? inventory.parts.find((p) => p.sku === sku) : null;

  if (editing && inventory.status === "loading") {
    return <div className="page"><BackLink to={BACK}>Volver a Inventario de Repuestos</BackLink><p className="empty" role="status">Cargando repuesto…</p></div>;
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
  return <PartEditor key={existing?.sku ?? "nuevo"} existing={existing} inventory={inventory} />;
}

function PartEditor({ existing, inventory }) {
  const navigate = useNavigate();
  const editing = Boolean(existing);
  const [form, setForm] = useState(() => ({
    sku: existing?.sku ?? "",
    name: existing?.name ?? "",
    category: existing ? (existing.category ?? "") : (inventory.categories[0] ?? ""),
    compat: existing?.compat ?? "",
    stock: existing ? String(existing.stock) : "",
    openingReason: "",
    min: existing ? String(existing.min) : "",
    price: existing ? centsToInput(existing.price) : "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [pendingOpening, setPendingOpening] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: key === "sku" ? e.target.value.toUpperCase() : e.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (pendingOpening) {
      setSaving(true);
      try {
        await inventory.recordOpening(pendingOpening.part.id, pendingOpening.payload, pendingOpening.idempotencyKey);
        navigate(BACK);
      } catch (err) {
        setServerError(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    const { errors: next, part } = validatePart(editing ? { ...form, sku: existing.sku } : form, {
      editing,
      existingSkus: inventory.parts.map((p) => p.sku),
    });
    const openingReason = form.openingReason.trim();
    if (!editing && Number(part?.stock) > 0 && !openingReason) next.openingReason = "Indica el motivo del saldo inicial.";
    if (!editing && openingReason.length > 500) next.openingReason = "El motivo debe tener como máximo 500 caracteres.";
    setErrors(next);
    if (!part || Object.values(next).some(Boolean)) return;

    setSaving(true);
    try {
      const saved = await inventory.save({ ...existing, ...part, stock: editing || !inventory.live ? part.stock : 0 }, { editing });
      if (!editing && inventory.live && part.stock > 0) {
        const draft = {
          part: saved,
          payload: { counted_stock: part.stock, reason: openingReason },
          idempotencyKey: createIdempotencyKey(),
        };
        setPendingOpening(draft);
        setForm((current) => ({ ...current, stock: "0" }));
        await inventory.recordOpening(saved.id, draft.payload, draft.idempotencyKey);
        setPendingOpening(null);
      }
      navigate(BACK);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await inventory.remove(existing.sku);
      navigate(BACK, { state: { retiredPart: { id: existing.id, sku: existing.sku, name: existing.name } } });
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <BackLink to={BACK}>Volver a Inventario de Repuestos</BackLink>
      <h1 className="title">{editing ? "Editar Repuesto" : "Registrar Nuevo Repuesto (SKU)"}</h1>
      {!inventory.live && <p className="inventory-demo-note" role="note">Modo demostración: estos cambios se conservan solo en memoria y no se guardan en el backend.</p>}
      {pendingOpening && <FormAlert role="status">El repuesto ya existe con saldo cero. La apertura inicial no se confirmó; reintenta con los mismos datos para evitar duplicarla.</FormAlert>}

      <form onSubmit={submit} noValidate className="intake">
        <div className="intake__main">
          <section className="intake__section">
            <div className="intake__head">
              <h2 className="subtitle">{editing ? "Datos del Repuesto" : "1. Identificación y Categoría"}</h2>
              <p>Especificaciones técnicas, catalogación y compatibilidad del componente</p>
            </div>
            <div className="grid-2">
              <Field label="Código SKU" htmlFor="pf-sku" required={!editing} error={errors.sku} aside={editing && <span className="muted small">Identificador único</span>}>
                <InputIcon icon={editing ? null : Barcode} suffix={editing ? <Lock size={16} aria-label="No editable" /> : null}>
                  <input id="pf-sku" className={`input mono${editing ? " input--locked" : " input--icon"}`} placeholder="SSD-NVME-2TB-KC" value={form.sku} onChange={set("sku")} readOnly={editing} disabled={Boolean(pendingOpening)} />
                </InputIcon>
              </Field>
              <Field label="Categoría de Componente" htmlFor="pf-cat" required error={errors.category}>
                <input id="pf-cat" className="input" list="pf-category-options" maxLength={50} value={form.category} onChange={set("category")} autoComplete="off" disabled={Boolean(pendingOpening)} />
                <datalist id="pf-category-options">{inventory.categories.map((category) => <option key={category} value={category} />)}</datalist>
              </Field>
            </div>
            <Field label="Nombre y Descripción del Componente" htmlFor="pf-name" required error={errors.name}>
              <input id="pf-name" className="input" placeholder="SSD NVMe M.2 2TB Kingston KC3000 PCIe 4.0" value={form.name} onChange={set("name")} disabled={Boolean(pendingOpening)} />
            </Field>
            <Field label="Equipos y Modelos Compatibles" htmlFor="pf-compat">
              <InputIcon icon={Laptop}><input id="pf-compat" className="input input--icon" placeholder="Dell XPS 13/15, ThinkPad X1 Carbon, Universales NVMe M.2 2280" value={form.compat} onChange={set("compat")} disabled={Boolean(pendingOpening)} /></InputIcon>
            </Field>
          </section>

          <section className="intake__section">
            <div className="intake__head">
              <h2 className="subtitle">{editing ? "Stock disponible y precios" : "2. Conteo inicial y precios"}</h2>
              <p>{editing ? "El stock se cambia desde la acción de ajuste por conteo físico." : "El repuesto se crea con saldo cero; un conteo positivo se registra como apertura con motivo."}</p>
            </div>
            <div className="grid-3">
              {editing ? (
                <Field label="Stock confirmado" htmlFor="pf-stock-confirmed">
                  <output id="pf-stock-confirmed" className="input input--locked" aria-live="polite">{existing.stock} unidades</output>
                </Field>
              ) : (
                <Field label="Cantidad inicial" htmlFor="pf-stock" required error={errors.stock}>
                  <InputIcon suffix="Unid."><input id="pf-stock" inputMode="numeric" className="input" placeholder="0" value={form.stock} onChange={set("stock")} disabled={Boolean(pendingOpening)} /></InputIcon>
                </Field>
              )}
              <Field label="Stock Mínimo de Alerta" htmlFor="pf-min" required error={errors.min}>
                <InputIcon suffix="Unid."><input id="pf-min" inputMode="numeric" className="input" placeholder="0" value={form.min} onChange={set("min")} disabled={Boolean(pendingOpening)} /></InputIcon>
              </Field>
              <Field label="Precio de Venta / Cotización (PEN)" htmlFor="pf-price" required error={errors.price}>
                <div className="input-prefix"><span>S/.</span><input id="pf-price" inputMode="decimal" className="input mono" placeholder="0.00" value={form.price} onChange={set("price")} disabled={Boolean(pendingOpening)} /></div>
              </Field>
            </div>
            {!editing && Number(form.stock) > 0 && (
              <Field label="Motivo del saldo inicial" htmlFor="pf-opening-reason" required error={errors.openingReason}>
                <textarea id="pf-opening-reason" className="input" maxLength={500} rows={3} placeholder="Por ejemplo: conteo físico al iniciar el control de inventario" value={form.openingReason} onChange={set("openingReason")} disabled={Boolean(pendingOpening)} />
              </Field>
            )}
          </section>
        </div>

        <aside className="intake__side" aria-label="Etiqueta del repuesto">
          <div className="jobtag jobtag--lg">
            <p className="kicker">{form.sku || "SKU por indicar"}</p>
            <strong className="subtitle">{form.name || "Repuesto sin nombre"}</strong>
            <div className="tagfield"><span>Categoría</span>{form.category}</div>
            <div className={`tagfield${(editing ? existing.stock : Number(form.stock)) ? "" : " tagfield--wait"}`}>
              <span>{pendingOpening ? "Saldo confirmado" : editing ? "Stock confirmado" : "Conteo inicial"}</span>
              {pendingOpening ? "0 unidades; apertura pendiente" : editing ? `${existing.stock} unidades` : Number(form.stock) > 0 ? `${form.stock} unidades por registrar` : "0 unidades"}
            </div>
            <div className={`tagfield${form.price ? "" : " tagfield--wait"}`}><span>Precio</span>{form.price ? `S/. ${form.price}` : "Por indicar"}</div>
            <FormAlert>{serverError}</FormAlert>
            <div className="intake__actions">
              {editing && <button type="button" className="btn btn--danger-ghost" onClick={() => { setDeleteError(""); setConfirming(true); }} disabled={saving}><Trash2 size={17} aria-hidden="true" /> Retirar del catálogo</button>}
              <Link to={BACK} className="btn"><X size={17} aria-hidden="true" /> Cancelar</Link>
              <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
                <Save size={18} aria-hidden="true" /> {saving ? "Guardando…" : pendingOpening ? "Reintentar apertura" : editing ? "Guardar Cambios" : "Guardar Repuesto"}
              </button>
            </div>
          </div>
        </aside>
      </form>

      {editing && (
        <ConfirmDialog open={confirming} title="¿Retirar este repuesto del catálogo?" confirmLabel="Retirar" busyLabel="Retirando…" busy={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setConfirming(false)}>
          <p>Se retirará <strong>{existing.name}</strong> (SKU <span className="mono">{existing.sku}</span>) del catálogo activo. Si tiene movimientos, el historial se conservará.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
