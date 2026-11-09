import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { History, Laptop, Pencil, PlusCircle, RotateCcw, Search, SlidersHorizontal, Trash2, TriangleAlert } from "lucide-react";
import { ItemIcon, Pagination, Toast } from "../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { formatPEN } from "../../domain/money.js";
import { isLowStock } from "../../domain/inventory.js";
import { useInventory } from "./useInventory.js";
import StockAdjustmentDialog from "./StockAdjustmentDialog.jsx";

const PAGE_SIZE = 4;
const sorters = {
  relevance: { label: "Relevancia", fn: () => 0 },
  stockAsc: { label: "Stock: menor a mayor", fn: (a, b) => a.stock - b.stock },
  stockDesc: { label: "Stock: mayor a menor", fn: (a, b) => b.stock - a.stock },
  priceAsc: { label: "Precio: menor a mayor", fn: (a, b) => a.price - b.price },
  priceDesc: { label: "Precio: mayor a menor", fn: (a, b) => b.price - a.price },
};

export default function Inventory({ api }) {
  const { parts, categories, status, error, categoryError, reload, remove, adjustStock, live } = useInventory(api);
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState("");
  const [retiredPart, setRetiredPart] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [adjustingBusy, setAdjustingBusy] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  useEffect(() => {
    const retired = location.state?.retiredPart;
    if (!retired) return;
    setRetiredPart(retired);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const totalUnits = parts.reduce((sum, part) => sum + part.stock, 0);
  const critical = parts.filter(isLowStock);

  const askDelete = (part) => {
    setDeleteError("");
    setPending(part);
  };
  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await remove(pending.sku);
      setRetiredPart({ id: pending.id, sku: pending.sku, name: pending.name });
      setPending(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const submitAdjustment = async (payload, idempotencyKey) => {
    setAdjustingBusy(true);
    setAdjustError("");
    try {
      const result = await adjustStock(adjusting.id ?? adjusting.sku, payload, idempotencyKey);
      setAdjusting(null);
      setToast(result.changed
        ? `Stock de ${adjusting.sku} actualizado a ${result.part.current_stock} unidades.`
        : `El conteo coincide con el stock de ${adjusting.sku}; no hubo variación.`);
    } catch (err) {
      setAdjustError(err.message);
    } finally {
      setAdjustingBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts
      .filter((part) =>
        (!category || part.category === category) &&
        (!onlyCritical || isLowStock(part)) &&
        (!q || `${part.sku} ${part.name} ${part.compat}`.toLowerCase().includes(q))
      )
      .sort(sorters[sort].fn);
  }, [parts, query, category, onlyCritical, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const reset = (fn) => (value) => { fn(value); setPage(1); };
  const shelves = sort === "relevance"
    ? [...new Set(rows.map((part) => part.category || "Sin categoría"))].map((name) => ({
        name,
        parts: rows.filter((part) => (part.category || "Sin categoría") === name),
      }))
    : rows.length ? [{ name: sorters[sort].label, parts: rows }] : [];

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="title">Inventario de Repuestos</h1>
        <Link to="/taller/inventario/nuevo" className="btn btn--primary"><PlusCircle size={17} aria-hidden="true" /> Nuevo Repuesto (SKU)</Link>
      </div>

      {!live && <p className="inventory-demo-note" role="note">Modo demostración: los cambios se conservan solo en memoria y no se guardan en el backend.</p>}
      {retiredPart && (
        <div className="inventory-retired-notice" role="status">
          <span>{retiredPart.name || `Repuesto ${retiredPart.sku}`} fue retirado del catálogo activo.</span>
          {live && Number.isInteger(retiredPart.id) && <Link to={`/taller/inventario/${retiredPart.id}/movimientos`}>Consultar su historial</Link>}
          <button type="button" className="icon-btn" aria-label="Cerrar aviso de retiro" onClick={() => setRetiredPart(null)}>×</button>
        </div>
      )}

      <div className="alerts">
        <button type="button" className="alert-btn" onClick={() => reset(setOnlyCritical)(!onlyCritical)} aria-pressed={onlyCritical}>
          <span><TriangleAlert size={18} aria-hidden="true" /> Alertas de stock crítico<br /><small>{onlyCritical ? "Mostrando críticos" : "Reponer urgente"}</small></span>
          <strong>{critical.length}</strong>
        </button>
        <div className="total-box"><span>Stock total de repuestos<span>{parts.length} SKU activos</span></span><strong>{totalUnits.toLocaleString("en-US")}</strong></div>
      </div>

      <div className="tools">
        <label className="search"><Search size={18} aria-hidden="true" /><input type="search" placeholder="Buscar por SKU (ej. SSD-NVME-2TB), descripción o marca..." value={query} onChange={(event) => reset(setQuery)(event.target.value)} aria-label="Buscar repuestos" /></label>
        <select className="select-tool" value={onlyCritical ? "critical" : "all"} onChange={(event) => reset(setOnlyCritical)(event.target.value === "critical")} aria-label="Filtros">
          <option value="all">Todos los estados</option><option value="critical">Solo stock crítico</option>
        </select>
        <select className="select-tool" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar">
          {Object.entries(sorters).map(([key, sorter]) => <option key={key} value={key}>{sorter.label}</option>)}
        </select>
      </div>
      <div className="toggle-group" role="group" aria-label="Categoría">
        <button type="button" aria-pressed={!category} className="toggle" onClick={() => reset(setCategory)("")}>Todos ({parts.length})</button>
        {categories.map((name) => <button key={name} type="button" aria-pressed={category === name} className="toggle" onClick={() => reset(setCategory)(name)}>{name} ({parts.filter((part) => part.category === name).length})</button>)}
      </div>
      {categoryError && <p className="muted small" role="status">{categoryError}</p>}
      <p className="list-note"><span>Listado de componentes</span><span aria-live="polite">Mostrando {rows.length} de {filtered.length} ítems</span></p>

      {status === "loading" && <p className="empty" role="status">Cargando inventario…</p>}
      {status === "error" && <div className="retry"><FormAlert>{error}</FormAlert><button type="button" className="btn btn--sm" onClick={reload}><RotateCcw size={14} aria-hidden="true" /> Reintentar</button></div>}
      {status === "ready" && rows.length === 0 && <p className="empty">{parts.length ? "No hay repuestos con estos filtros." : "Todavía no hay repuestos registrados."}</p>}

      {shelves.map((shelf) => (
        <section key={shelf.name} className="shelf" aria-label={`Estante ${shelf.name}`}>
          <h2 className="shelf__title">{shelf.name}</h2>
          <ul className="bins">
            {shelf.parts.map((part) => {
              const low = isLowStock(part);
              const scale = Math.max(part.min * 4, part.stock, 1);
              return (
                <li key={part.sku} className={`jobtag bin${low ? " jobtag--alert" : ""}`}>
                  <div className="bin__top"><ItemIcon name={part.icon} size={20} /><div><p className="bin__name">{part.name}</p><p className="bin__sku">SKU: {part.sku}</p></div></div>
                  {part.compat && <p className="bin__compat"><Laptop size={14} aria-hidden="true" /> {part.compat}</p>}
                  <div className={`gauge${low ? " gauge--low" : ""}`}>
                    <div className="gauge__bar" aria-hidden="true"><span className="gauge__fill" style={{ width: `${(part.stock / scale) * 100}%` }} /><span className="gauge__min" style={{ left: `${(part.min / scale) * 100}%` }} /></div>
                    <div className="gauge__row"><span><strong>{part.stock} u.</strong> libres · mínimo {part.min}</span><span className={`stamp ${low ? "stamp--danger" : "stamp--ok"}`}>{low ? "Stock crítico" : "En stock"}</span></div>
                  </div>
                  <div className="bin__foot">
                    <span className="bin__price">{formatPEN(part.price)}</span>
                    <div className="bin__tools">
                      <button type="button" className="icon-btn" aria-label={`Ajustar stock ${part.sku}`} title="Ajustar stock" onClick={() => { setAdjustError(""); setAdjusting(part); }}><SlidersHorizontal size={17} aria-hidden="true" /></button>
                      {live && Number.isInteger(part.id) && <Link to={`/taller/inventario/${part.id}/movimientos`} className="icon-btn" aria-label={`Historial ${part.sku}`} title="Historial de movimientos"><History size={17} aria-hidden="true" /></Link>}
                      <Link to={`/taller/inventario/${encodeURIComponent(part.sku)}/editar`} className="icon-btn" aria-label={`Editar ${part.sku}`} title="Editar"><Pencil size={17} aria-hidden="true" /></Link>
                      <button type="button" className="icon-btn icon-btn--danger" aria-label={`Retirar ${part.sku}`} title="Retirar del catálogo" onClick={() => askDelete(part)}><Trash2 size={17} aria-hidden="true" /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Pagination page={current} pages={pages} onChange={setPage} label={`Página ${current} de ${pages}`} />
      <ConfirmDialog open={Boolean(pending)} title="¿Retirar este repuesto del catálogo?" confirmLabel="Retirar" busyLabel="Retirando…" busy={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => setPending(null)}>
        {pending && <p>Se retirará <strong>{pending.name}</strong> (SKU <span className="mono">{pending.sku}</span>) del catálogo activo. Si tiene movimientos, el historial se conservará.</p>}
      </ConfirmDialog>
      <StockAdjustmentDialog part={adjusting} onClose={() => setAdjusting(null)} onSubmit={submitAdjustment} busy={adjustingBusy} error={adjustError} />
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
