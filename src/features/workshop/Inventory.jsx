import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Laptop, Pencil, PlusCircle, RotateCcw, Search, Trash2, TriangleAlert } from "lucide-react";
import { ItemIcon, Pagination, Toast } from "../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { formatPEN } from "../../domain/money.js";
import { isLowStock, PART_CATEGORIES } from "../../domain/inventory.js";
import { useInventory } from "./useInventory.js";

const PAGE_SIZE = 4;
const sorters = {
  relevance: { label: "Relevancia", fn: () => 0 },
  stockAsc: { label: "Stock: menor a mayor", fn: (a, b) => a.stock - b.stock },
  stockDesc: { label: "Stock: mayor a menor", fn: (a, b) => b.stock - a.stock },
  priceAsc: { label: "Precio: menor a mayor", fn: (a, b) => a.price - b.price },
  priceDesc: { label: "Precio: mayor a menor", fn: (a, b) => b.price - a.price },
};

export default function Inventory({ api }) {
  const { parts, status, error, reload, remove } = useInventory(api);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState("");

  const totalUnits = parts.reduce((s, p) => s + p.stock, 0);
  const critical = parts.filter(isLowStock);

  const askDelete = (part) => {
    setDeleteError("");
    setPending(part);
  };
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await remove(pending.sku);
      setToast(`Repuesto ${pending.sku} eliminado del inventario.`);
      setPending(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts
      .filter((p) =>
        (!category || p.category === category) &&
        (!onlyCritical || isLowStock(p)) &&
        (!q || `${p.sku} ${p.name} ${p.compat}`.toLowerCase().includes(q))
      )
      .sort(sorters[sort].fn);
  }, [parts, query, category, onlyCritical, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const reset = (fn) => (v) => { fn(v); setPage(1); };

  // Con el orden por defecto se muestran estantes por categoría; con otro orden, una sola lista para que se note.
  const shelves = sort === "relevance"
    ? [...new Set(rows.map((p) => p.category || "Sin categoría"))].map((name) => ({
        name,
        parts: rows.filter((p) => (p.category || "Sin categoría") === name),
      }))
    : rows.length ? [{ name: sorters[sort].label, parts: rows }] : [];

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="title">Inventario de Repuestos</h1>
        <Link to="/taller/inventario/nuevo" className="btn btn--primary">
          <PlusCircle size={17} aria-hidden="true" /> Nuevo Repuesto (SKU)
        </Link>
      </div>

      <div className="alerts">
        <button type="button" className="alert-btn" onClick={() => reset(setOnlyCritical)(!onlyCritical)} aria-pressed={onlyCritical}>
          <span><TriangleAlert size={18} aria-hidden="true" /> Alertas de stock crítico<br /><small>{onlyCritical ? "Mostrando críticos" : "Reponer urgente"}</small></span>
          <strong>{critical.length}</strong>
        </button>
        <div className="total-box">
          <span>Stock total de repuestos<span>{parts.length} SKU activos</span></span>
          <strong>{totalUnits.toLocaleString("en-US")}</strong>
        </div>
      </div>

      <div className="tools">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Buscar por SKU (ej. SSD-NVME-2TB), descripción o marca..." value={query} onChange={(e) => reset(setQuery)(e.target.value)} aria-label="Buscar repuestos" />
        </label>
        <select className="select-tool" value={onlyCritical ? "critical" : "all"} onChange={(e) => reset(setOnlyCritical)(e.target.value === "critical")} aria-label="Filtros">
          <option value="all">Todos los estados</option>
          <option value="critical">Solo stock crítico</option>
        </select>
        <select className="select-tool" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          {Object.entries(sorters).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>
      <div className="toggle-group" role="group" aria-label="Categoría">
        <button type="button" aria-pressed={!category} className="toggle" onClick={() => reset(setCategory)("")}>
          Todos ({parts.length})
        </button>
        {PART_CATEGORIES.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} className="toggle" onClick={() => reset(setCategory)(c)}>
            {c} ({parts.filter((p) => p.category === c).length})
          </button>
        ))}
      </div>

      <p className="list-note"><span>Listado de componentes</span><span aria-live="polite">Mostrando {rows.length} de {filtered.length} ítems</span></p>

      {status === "loading" && <p className="empty" role="status">Cargando inventario…</p>}
      {status === "error" && (
        <div className="retry">
          <FormAlert>{error}</FormAlert>
          <button type="button" className="btn btn--sm" onClick={reload}><RotateCcw size={14} aria-hidden="true" /> Reintentar</button>
        </div>
      )}
      {status === "ready" && rows.length === 0 && (
        <p className="empty">{parts.length ? "No hay repuestos con estos filtros." : "Todavía no hay repuestos registrados."}</p>
      )}

      {shelves.map((shelf) => (
        <section key={shelf.name} className="shelf" aria-label={`Estante ${shelf.name}`}>
          <h2 className="shelf__title">{shelf.name}</h2>
          <ul className="bins">
            {shelf.parts.map((p) => {
              const low = isLowStock(p);
              const scale = Math.max(p.min * 4, p.stock, 1);
              return (
                <li key={p.sku} className={`jobtag bin${low ? " jobtag--alert" : ""}`}>
                  <div className="bin__top">
                    <ItemIcon name={p.icon} size={20} />
                    <div>
                      <p className="bin__name">{p.name}</p>
                      <p className="bin__sku">SKU: {p.sku}</p>
                    </div>
                  </div>
                  {p.compat && <p className="bin__compat"><Laptop size={14} aria-hidden="true" /> {p.compat}</p>}
                  <div className={`gauge${low ? " gauge--low" : ""}`}>
                    <div className="gauge__bar" aria-hidden="true">
                      <span className="gauge__fill" style={{ width: `${(p.stock / scale) * 100}%` }} />
                      <span className="gauge__min" style={{ left: `${(p.min / scale) * 100}%` }} />
                    </div>
                    <div className="gauge__row">
                      <span><strong>{p.stock} u.</strong> libres · mínimo {p.min}</span>
                      <span className={`stamp ${low ? "stamp--danger" : "stamp--ok"}`}>{low ? "Stock crítico" : "En stock"}</span>
                    </div>
                  </div>
                  <div className="bin__foot">
                    <span className="bin__price">{formatPEN(p.price)}</span>
                    <div className="bin__tools">
                      <Link to={`/taller/inventario/${encodeURIComponent(p.sku)}/editar`} className="icon-btn" aria-label={`Editar ${p.sku}`} title="Editar">
                        <Pencil size={17} />
                      </Link>
                      <button type="button" className="icon-btn icon-btn--danger" aria-label={`Eliminar ${p.sku}`} title="Eliminar" onClick={() => askDelete(p)}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Pagination page={current} pages={pages} onChange={setPage} label={`Página ${current} de ${pages}`} />

      <ConfirmDialog
        open={Boolean(pending)}
        title="¿Eliminar este repuesto?"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      >
        {pending && (
          <p>
            Se quitará <strong>{pending.name}</strong> (SKU <span className="mono">{pending.sku}</span>) del inventario.
            Esta acción no se puede deshacer.
          </p>
        )}
      </ConfirmDialog>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
