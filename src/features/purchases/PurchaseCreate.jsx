import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { calculateLineGrossCents, formatPurchaseMoney, parsePurchaseMoney, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, validatePurchaseDraft } from "../../domain/purchases.js";
import { BackLink, Field } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { inventoryApi } from "../workshop/inventoryApi.js";
import { PURCHASE_MESSAGES, purchasesApi as defaultApi } from "./purchasesApi.js";

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const blankLine = () => ({ key: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, type: "free", spare_part_id: null, code_snapshot: null, description: "", quantity: "1", unit_cost: "", discount_amount: "0.00", tax_amount: "0.00" });
const initialDraft = () => ({ supplier_id: "", document_type: "FACTURA", document_series: "", document_number: "", issue_date: today(), due_date: "", payment_method: "TRANSFER", payment_status: "PENDING", other_charges: "0.00", notes: "", items: [blankLine()] });

export default function PurchaseCreate({ api = defaultApi, catalogApi = inventoryApi }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState(initialDraft);
  const [suppliers, setSuppliers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [supplierState, setSupplierState] = useState("loading");
  const [catalogState, setCatalogState] = useState(catalogApi.mode === "api" ? "loading" : "unconfigured");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (api.mode === "unconfigured") { setSupplierState("unconfigured"); setCatalogState(catalogApi.mode === "api" ? "loading" : "unconfigured"); return; }
    api.listSuppliers({ active: true, limit: 100, offset: 0 }).then((response) => {
      setSuppliers(response.items ?? []);
      setSupplierState("ready");
    }).catch((apiError) => {
      if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      setSupplierState(apiError.code === "unconfigured" ? "unconfigured" : "error");
      setError(apiError.message);
    });
    if (catalogApi.mode !== "api") { setCatalog([]); setCatalogState("unconfigured"); return; }
    catalogApi.list().then((parts) => {
      setCatalog(parts.filter((part) => Number.isInteger(part.id) && part.id > 0));
      setCatalogState("ready");
    }).catch((apiError) => {
      if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      setCatalog([]);
      setCatalogState("error");
    });
  }, [api, catalogApi, navigate, location]);

  const validation = useMemo(() => validatePurchaseDraft(draft), [draft]);
  const updateDraft = (changes) => { setDraft((current) => ({ ...current, ...changes })); setErrors({}); setError(""); };
  const updateLine = (index, changes) => updateDraft({ items: draft.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line) });
  const chooseCatalogItem = (index, rawId) => {
    const part = catalog.find((item) => String(item.id) === rawId);
    updateLine(index, part ? { type: "catalog", spare_part_id: part.id, code_snapshot: part.sku, description: part.name } : { type: "free", spare_part_id: null, code_snapshot: null, description: "" });
  };

  const submit = async (event) => {
    event.preventDefault();
    const checked = validatePurchaseDraft(draft);
    setErrors(checked.errors);
    if (!checked.valid) return;
    const payload = {
      supplier_id: Number(draft.supplier_id),
      document_type: draft.document_type,
      document_series: draft.document_series.trim() || null,
      document_number: draft.document_number.trim(),
      issue_date: draft.issue_date,
      due_date: draft.due_date || null,
      payment_method: draft.payment_method,
      payment_status: draft.payment_status,
      other_charges: draft.other_charges || "0.00",
      notes: draft.notes.trim() || null,
      items: draft.items.map((line) => ({
        spare_part_id: line.type === "catalog" ? line.spare_part_id : null,
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unit_cost: line.unit_cost,
        discount_amount: line.discount_amount || "0.00",
        tax_amount: line.tax_amount || "0.00",
      })),
    };
    setSubmitting(true); setError("");
    try {
      const purchase = await api.createPurchase(payload);
      navigate(`/taller/compras/${purchase.id}`, { replace: true });
    } catch (apiError) {
      if (apiError.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (apiError.field) setErrors((current) => ({ ...current, [apiError.field]: apiError.message }));
      setError(apiError.message);
    } finally { setSubmitting(false); }
  };

  const totals = validation.totals;
  if (api.mode === "unconfigured") return <div className="page purchases-page"><BackLink to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</BackLink><FormAlert>{PURCHASE_MESSAGES.unconfigured}</FormAlert></div>;

  return <div className="page purchases-page">
    <BackLink to="/taller/compras"><ArrowLeft size={15} aria-hidden="true" /> Compras</BackLink>
    <div className="page-head"><div><p className="kicker">NUEVO COMPROBANTE</p><h1 className="title">Registrar compra</h1><p className="muted">Guardar la factura no cambia existencias. El stock se actualiza al confirmar recepción.</p></div></div>
    {error && <FormAlert>{error}</FormAlert>}
    {supplierState === "error" && <FormAlert>No se pudieron cargar proveedores. Revisa el servicio e inténtalo de nuevo.</FormAlert>}

    <form className="purchases-form" onSubmit={submit} noValidate>
      <section className="jobtag purchases-form__section"><h2 className="subtitle">Proveedor y comprobante</h2>
        <div className="grid-2">
          <Field label="Proveedor" htmlFor="purchase-supplier" required error={errors.supplier_id}><select className="input" id="purchase-supplier" value={draft.supplier_id} disabled={supplierState !== "ready"} onChange={(event) => updateDraft({ supplier_id: event.target.value })}><option value="">Selecciona proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.tax_id ? ` · ${supplier.tax_id}` : ""}</option>)}</select><Link className="purchases-inline-link" to="/taller/compras/proveedores">Gestionar proveedores</Link></Field>
          <Field label="Tipo de comprobante" htmlFor="purchase-document-type" required error={errors.document_type}><select className="input" id="purchase-document-type" value={draft.document_type} onChange={(event) => updateDraft({ document_type: event.target.value })}><option value="FACTURA">Factura</option><option value="BOLETA">Boleta</option><option value="RECIBO">Recibo</option><option value="NOTA_CREDITO">Nota de crédito</option><option value="OTRO">Otro</option></select></Field>
          <Field label="Serie" htmlFor="purchase-series"><input className="input" id="purchase-series" maxLength={30} value={draft.document_series} onChange={(event) => updateDraft({ document_series: event.target.value })} /></Field>
          <Field label="Número" htmlFor="purchase-number" required error={errors.document_number}><input className="input" id="purchase-number" maxLength={40} value={draft.document_number} onChange={(event) => updateDraft({ document_number: event.target.value })} /></Field>
          <Field label="Fecha de emisión" htmlFor="purchase-issue-date" required error={errors.issue_date}><input className="input" id="purchase-issue-date" type="date" value={draft.issue_date} onChange={(event) => updateDraft({ issue_date: event.target.value })} /></Field>
          <Field label="Fecha de vencimiento" htmlFor="purchase-due-date" error={errors.due_date}><input className="input" id="purchase-due-date" type="date" min={draft.issue_date || undefined} value={draft.due_date} onChange={(event) => updateDraft({ due_date: event.target.value })} /></Field>
        </div>
      </section>

      <section className="jobtag purchases-form__section"><h2 className="subtitle">Pago y cargos</h2><div className="grid-2">
        <Field label="Método de pago" htmlFor="purchase-payment-method" required error={errors.payment_method}><select className="input" id="purchase-payment-method" value={draft.payment_method} onChange={(event) => updateDraft({ payment_method: event.target.value })}>{Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="Estado de pago" htmlFor="purchase-payment-status" required error={errors.payment_status}><select className="input" id="purchase-payment-status" value={draft.payment_status} onChange={(event) => updateDraft({ payment_status: event.target.value })}>{Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="Otros cargos (S/)" htmlFor="purchase-other-charges" error={errors.other_charges}><input className="input" id="purchase-other-charges" inputMode="decimal" placeholder="0.00" value={draft.other_charges} onChange={(event) => updateDraft({ other_charges: event.target.value })} /></Field>
        <Field label="Notas" htmlFor="purchase-notes"><textarea className="input" id="purchase-notes" rows="3" maxLength={4000} value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} /></Field>
      </div></section>

      <section className="purchases-form__section"><div className="purchases-section__head"><div><h2 className="subtitle">Artículos y conceptos</h2><p className="muted">El costo se registra desde el comprobante; no se toma el precio de venta del inventario.</p></div><button className="btn" type="button" onClick={() => updateDraft({ items: [...draft.items, blankLine()] })}><Plus size={15} aria-hidden="true" /> Agregar línea</button></div>
        {catalogState === "unconfigured" && <p className="purchases-notice" role="status">El catálogo real no está configurado. Puedes agregar conceptos libres; no se mostrarán repuestos de demostración.</p>}
        {catalogState === "error" && <p className="purchases-notice" role="status">No se pudo cargar el inventario. Puedes registrar conceptos libres; no se usarán datos demo.</p>}
        {errors.items && <FormAlert>{errors.items}</FormAlert>}
        {draft.items.map((line, index) => <fieldset className="jobtag purchases-line-form" key={line.key}><legend>Línea {index + 1}</legend>
          <div className="grid-2">
            <Field label="Tipo de línea" htmlFor={`purchase-line-type-${index}`}><select className="input" id={`purchase-line-type-${index}`} value={line.type} onChange={(event) => updateLine(index, { type: event.target.value, spare_part_id: null, code_snapshot: null, description: "" })}><option value="free">Concepto libre</option><option value="catalog" disabled={catalogState !== "ready" || !catalog.length}>Repuesto del inventario</option></select></Field>
            {line.type === "catalog" && <Field label="Repuesto" htmlFor={`purchase-part-${index}`} required error={errors[`items.${index}.spare_part_id`]}><select className="input" id={`purchase-part-${index}`} value={line.spare_part_id ?? ""} onChange={(event) => chooseCatalogItem(index, event.target.value)}><option value="">Selecciona repuesto</option>{catalog.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.sku} · stock {part.stock}</option>)}</select></Field>}
            <Field label="Descripción" htmlFor={`purchase-description-${index}`} required error={errors[`items.${index}.description`]}><input className="input" id={`purchase-description-${index}`} maxLength={300} value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} /></Field>
            <Field label="Cantidad" htmlFor={`purchase-quantity-${index}`} required error={errors[`items.${index}.quantity`]}><input className="input" id={`purchase-quantity-${index}`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} /></Field>
            <Field label="Costo unitario (S/)" htmlFor={`purchase-cost-${index}`} required error={errors[`items.${index}.unit_cost`]}><input className="input" id={`purchase-cost-${index}`} inputMode="decimal" placeholder="0.00" value={line.unit_cost} onChange={(event) => updateLine(index, { unit_cost: event.target.value })} /></Field>
            <Field label="Descuento (S/)" htmlFor={`purchase-discount-${index}`} error={errors[`items.${index}.discount_amount`]}><input className="input" id={`purchase-discount-${index}`} inputMode="decimal" value={line.discount_amount} onChange={(event) => updateLine(index, { discount_amount: event.target.value })} /></Field>
            <Field label="Impuesto (S/)" htmlFor={`purchase-tax-${index}`} error={errors[`items.${index}.tax_amount`]}><input className="input" id={`purchase-tax-${index}`} inputMode="decimal" value={line.tax_amount} onChange={(event) => updateLine(index, { tax_amount: event.target.value })} /></Field>
          </div>
          <div className="purchases-line-form__foot"><span>Total línea estimado: {formatPurchaseMoney((() => { const gross = calculateLineGrossCents(line.quantity, line.unit_cost); const discount = parsePurchaseMoney(line.discount_amount || "0.00"); const tax = parsePurchaseMoney(line.tax_amount || "0.00"); return gross !== null && discount !== null && tax !== null ? gross - discount + tax : null; })())}</span>{draft.items.length > 1 && <button className="btn btn--danger" type="button" onClick={() => updateDraft({ items: draft.items.filter((_, lineIndex) => lineIndex !== index) })}><Trash2 size={15} aria-hidden="true" /> Quitar línea</button>}</div>
        </fieldset>)}
      </section>

      <section className="jobtag purchases-totals"><h2 className="subtitle">Previsualización</h2><dl><div><dt>Subtotal</dt><dd>{formatPurchaseMoney(totals.subtotal)}</dd></div><div><dt>Descuentos</dt><dd>− {formatPurchaseMoney(totals.discounts)}</dd></div><div><dt>Impuestos</dt><dd>{formatPurchaseMoney(totals.taxes)}</dd></div><div><dt>Otros cargos</dt><dd>{formatPurchaseMoney(totals.charges)}</dd></div><div className="purchases-grand-total"><dt>Total estimado · PEN</dt><dd>{formatPurchaseMoney(totals.total)}</dd></div></dl><p className="muted">El backend confirma y calcula el total definitivo. Guardar la compra no cambia el stock.</p></section>
      <div className="btn-row"><Link className="btn" to="/taller/compras">Cancelar</Link><button className="btn btn--primary" type="submit" disabled={submitting || supplierState !== "ready"}>{submitting ? "Guardando…" : "Registrar compra"}</button></div>
    </form>
  </div>;
}
