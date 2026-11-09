import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { calculateLineGrossCents, formatPurchaseMoney, parsePurchaseMoney, validatePurchaseOrderDraft, canEditPurchaseOrder } from "../../domain/purchases.js";
import { BackLink, Field } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { inventoryApi } from "../workshop/inventoryApi.js";
import { PURCHASE_MESSAGES, purchasesApi as defaultApi } from "./purchasesApi.js";
import { usePurchaseOrderDetail, usePurchaseOrders } from "./usePurchaseOrders.js";

const blankLine = () => ({ key: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, type: "free", spare_part_id: null, description: "", quantity: "1", unit_cost: "" });
const initialDraft = () => ({ supplier_id: "", estimated_arrival: "", notes: "", items: [blankLine()] });

export default function PurchaseOrderCreate({ api = defaultApi, catalogApi = inventoryApi }) {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { createOrder } = usePurchaseOrders(api, { loadOnMount: false });
  const { order: existingOrder, state: orderState } = usePurchaseOrderDetail(id, api);
  const [draft, setDraft] = useState(initialDraft);
  const [suppliers, setSuppliers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [supplierState, setSupplierState] = useState(api.mode === "unconfigured" ? "unconfigured" : "loading");
  const [catalogState, setCatalogState] = useState(catalogApi.mode === "api" ? "loading" : "unconfigured");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (api.mode === "unconfigured") {
      setSupplierState("unconfigured");
      setCatalogState(catalogApi.mode === "api" ? "loading" : "unconfigured");
      return;
    }
    let alive = true;
    api.listSuppliers({ active: true, limit: 100, offset: 0 }).then((response) => {
      if (!alive) return;
      setSuppliers((response.items ?? []).filter((supplier) => supplier.active !== false));
      setSupplierState("ready");
    }).catch((apiError) => {
      if (!alive) return;
      if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      setSupplierState(apiError.code === "unconfigured" ? "unconfigured" : "error");
      setError(apiError.message);
    });
    if (catalogApi.mode !== "api") {
      setCatalog([]);
      setCatalogState("unconfigured");
    } else {
      catalogApi.list().then((parts) => {
        if (!alive) return;
        setCatalog(parts.filter((part) => Number.isInteger(part.id) && part.id > 0));
        setCatalogState("ready");
      }).catch((apiError) => {
        if (!alive) return;
        if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
        setCatalog([]);
        setCatalogState("error");
      });
    }
    return () => { alive = false; };
  }, [api, catalogApi, navigate, location]);

  useEffect(() => {
    if (!isEditing || !existingOrder || orderState !== "ready") return;
    setDraft({
      supplier_id: String(existingOrder.supplier_id),
      estimated_arrival: existingOrder.estimated_arrival ?? "",
      notes: existingOrder.notes ?? "",
      items: (existingOrder.items ?? []).map((line) => ({
        key: String(line.id),
        type: line.spare_part_id ? "catalog" : "free",
        spare_part_id: line.spare_part_id,
        description: line.description_snapshot ?? "",
        quantity: String(line.quantity_ordered ?? "1").replace(/\.0+$/, ""),
        unit_cost: line.unit_cost ?? "",
      })),
    });
  }, [isEditing, existingOrder, orderState]);

  const updateDraft = (changes) => {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors({});
    setError("");
  };
  const updateLine = (index, changes) => updateDraft({ items: draft.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line) });
  const chooseCatalogItem = (index, rawId) => {
    const part = catalog.find((item) => String(item.id) === rawId);
    updateLine(index, part
      ? { type: "catalog", spare_part_id: part.id, description: part.name }
      : { type: "free", spare_part_id: null, description: "" });
  };

  const submit = async (event) => {
    event.preventDefault();
    const checked = validatePurchaseOrderDraft(draft);
    setErrors(checked.errors);
    if (!checked.valid) return;
    const payload = {
      supplier_id: Number(draft.supplier_id),
      estimated_arrival: draft.estimated_arrival || null,
      notes: draft.notes.trim() || null,
      items: draft.items.map((line) => ({
        spare_part_id: line.type === "catalog" ? Number(line.spare_part_id) : null,
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unit_cost: line.unit_cost,
      })),
    };
    setSubmitting(true);
    setError("");
    try {
      const saved = isEditing ? await api.updatePurchaseOrder(id, payload) : await createOrder(payload);
      navigate(`/taller/compras/ordenes/${saved.id}`, { replace: true });
    } catch (apiError) {
      if (apiError.code === "session_required") {
        navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
        return;
      }
      if (apiError.field) setErrors((current) => ({ ...current, [apiError.field]: apiError.message }));
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedTotal = draft.items.reduce((total, line) => {
    const lineTotal = calculateLineGrossCents(line.quantity, line.unit_cost);
    return total === null || lineTotal === null ? null : total + lineTotal;
  }, 0n);

  if (api.mode === "unconfigured") return <div className="page purchases-page"><BackLink to="/taller/compras/ordenes"><ArrowLeft size={15} aria-hidden="true" /> Órdenes</BackLink><FormAlert>{PURCHASE_MESSAGES.unconfigured}</FormAlert></div>;
  if (isEditing && orderState === "loading") return <div className="page purchases-page"><p className="empty" role="status">Cargando orden…</p></div>;
  if (isEditing && ["error", "not-found"].includes(orderState)) return <div className="page purchases-page"><FormAlert>{error || (orderState === "not-found" ? "La orden solicitada ya no está disponible." : "No se pudo cargar la orden.")}</FormAlert><Link className="btn" to="/taller/compras/ordenes">Volver a órdenes</Link></div>;
  if (isEditing && orderState === "ready" && !canEditPurchaseOrder(existingOrder.status)) return <div className="page purchases-page"><FormAlert>Solo se pueden editar órdenes en borrador.</FormAlert><Link className="btn" to={`/taller/compras/ordenes/${id}`}>Volver al detalle</Link></div>;

  return <div className="page purchases-page">
    <BackLink to={isEditing ? `/taller/compras/ordenes/${id}` : "/taller/compras/ordenes"}><ArrowLeft size={15} aria-hidden="true" /> {isEditing ? "Detalle de orden" : "Órdenes de compra"}</BackLink>
    <div className="page-head"><div><p className="kicker">TALLER · ADMINISTRACIÓN</p><h1 className="title">{isEditing ? "Editar borrador" : "Nueva orden de compra"}</h1><p className="muted">La orden no cambia las existencias. El stock se actualiza al confirmar una recepción física.</p></div></div>
    {error && <FormAlert>{error}</FormAlert>}
    {supplierState === "error" && <FormAlert>No se pudieron cargar los proveedores. Inténtalo de nuevo.</FormAlert>}
    {catalogState === "error" && <p className="purchases-notice" role="status">No se pudo cargar el inventario. Puedes usar conceptos libres; no se mostrarán repuestos ficticios.</p>}
    {catalogState === "unconfigured" && <p className="purchases-notice" role="status">El catálogo no está configurado. Puedes agregar conceptos libres.</p>}
    <form className="purchases-form" onSubmit={submit}>
      <section className="jobtag purchases-form__section">
        <h2 className="subtitle">Datos de la orden</h2>
        <div className="grid-2">
          <Field label="Proveedor" htmlFor="order-supplier" required error={errors.supplier_id}>
            <select className="input" id="order-supplier" value={draft.supplier_id} onChange={(event) => updateDraft({ supplier_id: event.target.value })} disabled={supplierState !== "ready"}>
              <option value="">Selecciona un proveedor</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>
          <Field label="Entrega estimada" htmlFor="order-arrival">
            <input className="input" id="order-arrival" type="date" value={draft.estimated_arrival} onChange={(event) => updateDraft({ estimated_arrival: event.target.value })} />
          </Field>
          <Field label="Notas" htmlFor="order-notes" error={errors.notes}>
            <textarea className="input" id="order-notes" rows="3" maxLength={2000} value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} />
          </Field>
        </div>
      </section>

      <section className="purchases-form__section">
        <div className="purchases-section__head"><div><h2 className="subtitle">Artículos y conceptos</h2><p className="muted">El costo se registra en la moneda de la orden. Una línea libre no afecta inventario.</p></div><button className="btn" type="button" onClick={() => updateDraft({ items: [...draft.items, blankLine()] })}><Plus size={15} aria-hidden="true" /> Agregar línea</button></div>
        {errors.items && <FormAlert>{errors.items}</FormAlert>}
        {draft.items.map((line, index) => <fieldset className="jobtag purchases-line-form" key={line.key}>
          <legend>Línea {index + 1}</legend>
          <div className="grid-2">
            <Field label="Tipo de línea" htmlFor={`order-line-type-${index}`}>
              <select className="input" id={`order-line-type-${index}`} value={line.type} onChange={(event) => updateLine(index, { type: event.target.value, spare_part_id: null, description: "" })}>
                <option value="free">Concepto libre</option><option value="catalog" disabled={catalogState !== "ready" || !catalog.length}>Repuesto del inventario</option>
              </select>
            </Field>
            {line.type === "catalog" && <Field label="Repuesto" htmlFor={`order-part-${index}`} required error={errors[`items.${index}.spare_part_id`]}>
              <select className="input" id={`order-part-${index}`} value={line.spare_part_id ?? ""} onChange={(event) => chooseCatalogItem(index, event.target.value)}>
                <option value="">Selecciona repuesto</option>{catalog.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.sku} · stock {part.stock}</option>)}
              </select>
            </Field>}
            <Field label="Descripción" htmlFor={`order-description-${index}`} required error={errors[`items.${index}.description`]}>
              <input className="input" id={`order-description-${index}`} maxLength={300} value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} />
            </Field>
            <Field label="Cantidad" htmlFor={`order-quantity-${index}`} required error={errors[`items.${index}.quantity`]}>
              <input className="input" id={`order-quantity-${index}`} type="number" inputMode="numeric" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
            </Field>
            <Field label="Costo unitario (S/)" htmlFor={`order-cost-${index}`} required error={errors[`items.${index}.unit_cost`]}>
              <input className="input" id={`order-cost-${index}`} inputMode="decimal" placeholder="0.00" value={line.unit_cost} onChange={(event) => updateLine(index, { unit_cost: event.target.value })} />
            </Field>
          </div>
          <div className="purchases-line-form__foot"><span>Subtotal estimado: {formatPurchaseMoney(calculateLineGrossCents(line.quantity, line.unit_cost))}</span>{draft.items.length > 1 && <button className="btn btn--danger" type="button" onClick={() => updateDraft({ items: draft.items.filter((_, lineIndex) => lineIndex !== index) })}><Trash2 size={15} aria-hidden="true" /> Quitar línea</button>}</div>
        </fieldset>)}
      </section>

      <section className="jobtag purchases-totals"><h2 className="subtitle">Previsualización</h2><dl><div className="purchases-grand-total"><dt>Total estimado · PEN</dt><dd>{formatPurchaseMoney(estimatedTotal)}</dd></div></dl><p className="muted">El backend calcula y confirma el total definitivo al guardar la orden.</p></section>
      <div className="btn-row"><Link className="btn" to={isEditing ? `/taller/compras/ordenes/${id}` : "/taller/compras/ordenes"}>Cancelar</Link><button className="btn btn--primary" type="submit" disabled={submitting || supplierState !== "ready"}>{submitting ? "Guardando…" : isEditing ? "Guardar borrador" : "Crear borrador"}</button></div>
    </form>
  </div>;
}
