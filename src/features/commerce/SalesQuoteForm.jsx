import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../shared/ui/ui.jsx";
import { inventoryApi } from "../workshop/inventoryApi.js";
import { formatPEN } from "../../domain/money.js";
import CustomerPicker from "../customers/CustomerPicker.jsx";
import { commerceApi as defaultApi } from "./commerceApi.js";

const expiryDefault = () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

export default function SalesQuoteForm({ api = defaultApi, onCreated, onCancel }) {
  const [customer, setCustomer] = useState(null);
  const [parts, setParts] = useState([]);
  const [lines, setLines] = useState([{ spare_part_id: "", quantity: "1" }]);
  const [expiresAt, setExpiresAt] = useState(expiryDefault);
  const [observations, setObservations] = useState("");
  const [loadingParts, setLoadingParts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (inventoryApi.mode !== "api") { setError("La cotización requiere el inventario real del backend; no se usarán artículos de demostración."); setLoadingParts(false); return undefined; }
    inventoryApi.list().then((items) => { if (active) setParts(items); }).catch((e) => { if (active) setError(e.message || "No se pudo cargar el inventario."); }).finally(() => { if (active) setLoadingParts(false); });
    return () => { active = false; };
  }, []);

  const updateLine = (index, field, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [field]: value } : line));
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!customer?.id) { setError("Selecciona un cliente comercial."); return; }
    const mapped = lines.map(({ spare_part_id, quantity }) => ({ spare_part_id: Number(spare_part_id), quantity: Number(quantity) }));
    if (!mapped.length || mapped.some((line) => !Number.isInteger(line.spare_part_id) || line.spare_part_id < 1 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000)) {
      setError("Selecciona un repuesto y una cantidad válida para cada línea."); return;
    }
    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) { setError("La fecha de vencimiento debe ser futura."); return; }
    setSaving(true);
    try {
      const quote = await api.createAdminSalesQuote({ customer_id: customer.id, lines: mapped, expires_at: expiry.toISOString(), observations: observations.trim() || null });
      onCreated?.(quote);
    } catch (e) { setError(e.message || "No se pudo registrar la cotización."); }
    finally { setSaving(false); }
  };

  return <form className="jobtag commerce-card commerce-form" onSubmit={submit}>
    <div className="commerce-card__head"><h2 className="subtitle">Nueva cotización de venta</h2>{onCancel && <button type="button" className="btn btn--sm" onClick={onCancel}>Cerrar</button>}</div>
    <CustomerPicker value={customer} onChange={setCustomer} label="Cliente de la venta" />
    <section className="commerce-form__lines" aria-label="Artículos de la cotización">
      <div className="commerce-card__head"><h3 className="subtitle">Artículos</h3><button type="button" className="btn btn--sm" onClick={() => setLines((current) => [...current, { spare_part_id: "", quantity: "1" }])}><Plus size={14} aria-hidden="true" /> Añadir línea</button></div>
      {lines.map((line, index) => <div className="grid-2 commerce-line-form" key={index}>
        <Field label={`Repuesto ${index + 1}`} htmlFor={`sale-part-${index}`} required><select id={`sale-part-${index}`} className="input" value={line.spare_part_id} onChange={(e) => updateLine(index, "spare_part_id", e.target.value)} disabled={loadingParts}><option value="">{loadingParts ? "Cargando inventario…" : "Selecciona un repuesto"}</option>{parts.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.stock} disponibles · {formatPEN(part.price)}</option>)}</select></Field>
        <div className="commerce-line-form__quantity"><Field label="Cantidad" htmlFor={`sale-quantity-${index}`} required><input id={`sale-quantity-${index}`} className="input" type="number" min="1" max="1000" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} /></Field>{lines.length > 1 && <button type="button" className="btn btn--sm" aria-label={`Quitar línea ${index + 1}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}><Trash2 size={15} aria-hidden="true" /></button>}</div>
      </div>)}
    </section>
    <Field label="Vencimiento de la oferta" htmlFor="sale-expires" required><input id="sale-expires" className="input" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
    <Field label="Observaciones" htmlFor="sale-observations"><textarea id="sale-observations" className="input textarea" maxLength={2000} value={observations} onChange={(e) => setObservations(e.target.value)} /></Field>
    {error && <p className="form-alert" role="alert">{error}</p>}
    <p className="small muted">El backend calcula el total y reserva inventario al aceptar la oferta. El navegador no modifica stock ni confirma pagos.</p>
    <button className="btn btn--primary" type="submit" disabled={saving || loadingParts || !parts.length}>{saving ? "Guardando…" : "Crear cotización"}</button>
  </form>;
}
