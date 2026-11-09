import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { BackLink, Pagination } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { inventoryApi } from "./inventoryApi.js";

const PAGE_SIZE = 50;
const TYPE_LABELS = {
  OPENING_BALANCE: "Saldo inicial",
  ADJUSTMENT_IN: "Ajuste de entrada",
  ADJUSTMENT_OUT: "Ajuste de salida",
  PURCHASE_RECEIPT: "Recepción de compra",
  SALE: "Venta",
};
const SOURCE_LABELS = {
  PURCHASE_RECEIPT: "Recepción de compra",
  SALE: "Venta",
  OPENING_BALANCE: "Apertura de inventario",
  ADJUSTMENT: "Ajuste de inventario",
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function InventoryMovements({ api = inventoryApi }) {
  const { partId: rawPartId } = useParams();
  const partId = Number(rawPartId);
  const [movementType, setMovementType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState({ movement_type: "", from_date: "", to_date: "" });
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);
  const [filterError, setFilterError] = useState("");
  const [activePart, setActivePart] = useState(null);
  const [articleInactive, setArticleInactive] = useState(false);
  const mock = api.mode === "mock";

  useEffect(() => {
    if (mock || typeof api.list !== "function") return undefined;
    let current = true;
    api.list().then((parts) => {
      if (!current || !Array.isArray(parts)) return;
      const found = parts.find((part) => part.id === partId) ?? null;
      setActivePart(found);
      setArticleInactive(!found);
    }).catch(() => {});
    return () => { current = false; };
  }, [api, mock, partId]);

  const load = useCallback(async (signal) => {
    if (!Number.isInteger(partId) || partId < 1) {
      setError("El identificador del repuesto no es válido.");
      setStatus("error");
      return;
    }
    if (mock) {
      setPage({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      setActivePart(null);
      setArticleInactive(false);
      setStatus("ready");
      setError("");
      return;
    }
    if (typeof api.listMovements !== "function") {
      setError("El historial de movimientos no está disponible en este momento.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const result = await api.listMovements(partId, { ...applied, limit: PAGE_SIZE, offset });
      if (!signal.aborted) {
        setPage(result);
        setStatus("ready");
      }
    } catch (err) {
      if (!signal.aborted) {
        setError(err.message || "No se pudo cargar el historial.");
        setStatus("error");
      }
    }
  }, [api, applied, mock, offset, partId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reloadIndex]);

  const applyFilters = (event) => {
    event.preventDefault();
    if (fromDate && toDate && fromDate > toDate) {
      setFilterError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setFilterError("");
    setApplied({ movement_type: movementType, from_date: fromDate, to_date: toDate });
    setOffset(0);
  };

  const pages = Math.max(1, Math.ceil(page.total / PAGE_SIZE));
  const currentPage = Math.min(Math.floor(offset / PAGE_SIZE) + 1, pages);
  const titleItem = page.items[0];
  const heading = useMemo(() => titleItem?.name_snapshot || activePart?.name || titleItem?.code_snapshot || activePart?.sku || `Repuesto #${partId}`, [activePart, partId, titleItem]);

  return (
    <div className="page inventory-movements">
      <BackLink to="/taller/inventario">Volver a Inventario de Repuestos</BackLink>
      <div className="page-head">
        <div><h1 className="title">Historial de stock</h1><p className="muted">{heading}{titleItem?.code_snapshot ? ` · SKU ${titleItem.code_snapshot}` : activePart?.sku ? ` · SKU ${activePart.sku}` : ""}{articleInactive && <span className="inventory-inactive-badge">Artículo inactivo</span>}</p></div>
        <Link to="/taller/inventario" className="btn">Inventario activo</Link>
      </div>
      {mock && <p className="inventory-demo-note" role="note">Modo demostración: no hay historial persistido conectado para este repuesto.</p>}

      <form className="inventory-movement-filters" onSubmit={applyFilters}>
        <label className="field"><span className="field__label">Tipo de movimiento</span>
          <select className="input" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="field"><span className="field__label">Desde</span><input className="input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="field"><span className="field__label">Hasta</span><input className="input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <div className="inventory-movement-filters__actions"><button className="btn btn--primary" type="submit">Aplicar filtros</button><button className="btn" type="button" onClick={() => { setMovementType(""); setFromDate(""); setToDate(""); setApplied({ movement_type: "", from_date: "", to_date: "" }); setFilterError(""); setOffset(0); }}>Limpiar</button></div>
      </form>
      {filterError && <p className="field__error" role="alert">{filterError}</p>}

      {status === "loading" && <p className="empty" role="status">Cargando historial…</p>}
      {status === "error" && <div className="retry"><FormAlert>{error}</FormAlert><button type="button" className="btn btn--sm" onClick={() => setReloadIndex((value) => value + 1)}><RotateCcw size={14} aria-hidden="true" /> Reintentar</button></div>}
      {status === "ready" && page.items.length === 0 && <p className="empty" role="status">No hay movimientos que coincidan con estos filtros.</p>}
      {status === "ready" && page.items.length > 0 && (
        <>
          <p className="list-note"><span>Movimientos encontrados: {page.total}</span><span aria-live="polite">Página {currentPage} de {pages}</span></p>
          <div className="inventory-movements__table-wrap">
            <table className="inventory-movements__table">
              <thead><tr><th scope="col">Fecha</th><th scope="col">Movimiento</th><th scope="col">Variación</th><th scope="col">Saldo antes</th><th scope="col">Saldo después</th><th scope="col">Responsable</th><th scope="col">Motivo / origen</th></tr></thead>
              <tbody>{page.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Fecha">{formatDate(item.created_at)}</td>
                  <td data-label="Movimiento"><strong>{TYPE_LABELS[item.movement_type] || item.movement_type}</strong>{item.is_before_cutover && <span className="inventory-legacy-badge">Historia anterior al corte</span>}</td>
                  <td data-label="Variación" className="mono">{item.quantity_delta > 0 ? "+" : ""}{item.quantity_delta}</td>
                  <td data-label="Saldo antes" className="mono">{item.stock_before}</td>
                  <td data-label="Saldo después" className="mono">{item.stock_after}</td>
                  <td data-label="Responsable">{item.actor_name || (item.actor_kind === "SYSTEM" ? "Sistema" : "—")}</td>
                  <td data-label="Motivo / origen"><span>{item.reason || "—"}</span>{item.source_type && <small className="inventory-movement-source">{SOURCE_LABELS[item.source_type] || item.source_type}{item.source_id ? ` #${item.source_id}` : ""}</small>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={currentPage} pages={pages} onChange={(next) => setOffset((next - 1) * PAGE_SIZE)} label={`Página ${currentPage} de ${pages}`} />
        </>
      )}
    </div>
  );
}
