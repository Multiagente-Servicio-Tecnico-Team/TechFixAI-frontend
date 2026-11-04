import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Mail, Pencil, Phone, PlusCircle, Power, RotateCcw, Search, Truck, User } from "lucide-react";
import { BackLink, Pagination, Toast } from "../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { leadTimeLabel, SUPPLIER_STATUS_FILTERS } from "../../domain/suppliers.js";
import { purchasesApi as defaultApi } from "./purchasesApi.js";

const PAGE_SIZE = 12;
const LOGIN = "/taller/acceso";

/** Listado de proveedores: búsqueda, filtro por estado, desactivación y reactivación. */
export default function SupplierList({ api = defaultApi }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", active: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [state, setState] = useState(api.mode === "unconfigured" ? "unconfigured" : "loading");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState(location.state?.toast ?? "");
  const clearToast = useCallback(() => setToast(""), []);

  const toLogin = useCallback(() => {
    setResult({ items: [], total: 0 });
    navigate(LOGIN, { replace: true, state: { from: location.pathname } });
  }, [navigate, location.pathname]);

  const load = useCallback(async (nextQuery, nextPage) => {
    if (api.mode === "unconfigured") return;
    setState("loading");
    setError("");
    try {
      const data = await api.listSuppliers({ ...nextQuery, limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult({ items: data.items, total: data.total ?? data.items.length });
      setState("ready");
    } catch (err) {
      if (err.code === "session_required") return toLogin();
      setError(err.message);
      setState("error");
    }
  }, [api, toLogin]);

  useEffect(() => { load(query, page); }, [load, query, page]);

  // El aviso de guardado llega una sola vez por la navegación; se limpia para no repetirlo al recargar.
  useEffect(() => {
    if (location.state?.toast) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const applyQuery = (next) => { setQuery((current) => ({ ...current, ...next })); setPage(1); };
  const submitSearch = (event) => { event.preventDefault(); applyQuery({ search: search.trim() }); };
  const clearFilters = () => { setSearch(""); applyQuery({ search: "", active: "" }); };

  const setActive = async (supplier, active) => {
    setBusyId(supplier.id);
    setActionError("");
    try {
      await api.updateSupplier(supplier.id, { active });
      setPending(null);
      setToast(active ? `${supplier.name} vuelve a estar disponible para compras.` : `${supplier.name} quedó inactivo.`);
      await load(query, page);
    } catch (err) {
      if (err.code === "session_required") return toLogin();
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const filtered = Boolean(query.search || query.active);

  return (
    <div className="page purchases-page">
      <BackLink to="/taller/compras">Volver a Compras</BackLink>
      <div className="page-head">
        <div>
          <p className="kicker">Compras · Administración</p>
          <h1 className="title">Proveedores</h1>
          <p className="muted">Los inactivos no se ofrecen en compras nuevas, pero se conservan en el historial.</p>
        </div>
        {state !== "unconfigured" && (
          <Link to="/taller/compras/proveedores/nuevo" className="btn btn--primary">
            <PlusCircle size={17} aria-hidden="true" /> Nuevo proveedor
          </Link>
        )}
      </div>

      {state === "unconfigured" ? (
        <FormAlert>El servicio de Compras no está configurado en este entorno.</FormAlert>
      ) : (
        <>
          <form className="tools" role="search" onSubmit={submitSearch}>
            <label className="search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={search}
                maxLength={100}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por razón social o RUC…"
                aria-label="Buscar proveedores"
              />
            </label>
            <select className="select-tool" value={query.active} onChange={(event) => applyQuery({ active: event.target.value })} aria-label="Estado del proveedor">
              {SUPPLIER_STATUS_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <button type="submit" className="btn">Buscar</button>
          </form>

          <p className="list-note">
            <span>Directorio de proveedores</span>
            <span aria-live="polite">{state === "ready" ? `${result.total} ${result.total === 1 ? "proveedor" : "proveedores"}` : ""}</span>
          </p>

          {!pending && <FormAlert>{actionError}</FormAlert>}
          {state === "loading" && <p className="empty" role="status">Cargando proveedores…</p>}
          {state === "error" && (
            <div className="retry">
              <FormAlert>{error}</FormAlert>
              <button type="button" className="btn btn--sm" onClick={() => load(query, page)}><RotateCcw size={14} aria-hidden="true" /> Reintentar</button>
            </div>
          )}
          {state === "ready" && !result.items.length && (
            <div className="empty">
              {filtered ? (
                <>
                  <p>No hay proveedores con estos filtros.</p>
                  <button type="button" className="btn btn--sm" onClick={clearFilters}>Limpiar filtros</button>
                </>
              ) : (
                <p>Todavía no hay proveedores registrados.</p>
              )}
            </div>
          )}

          {state === "ready" && result.items.length > 0 && (
            <ul className="bins" aria-label="Proveedores">
              {result.items.map((supplier) => (
                <li key={supplier.id} className={`jobtag bin supplier-card${supplier.active ? "" : " supplier-card--inactive"}`}>
                  <div className="bin__top">
                    <Building2 size={20} aria-hidden="true" />
                    <div>
                      <p className="bin__name">{supplier.name}</p>
                      <p className="bin__sku">{supplier.tax_id ? `RUC ${supplier.tax_id}` : "Sin RUC registrado"}</p>
                    </div>
                  </div>
                  <ul className="supplier-card__facts">
                    <li><User size={14} aria-hidden="true" /> {supplier.contact_name || "Sin contacto"}</li>
                    <li><Mail size={14} aria-hidden="true" /> {supplier.contact_email || "Sin correo"}</li>
                    <li><Phone size={14} aria-hidden="true" /> {supplier.phone || "Sin teléfono"}</li>
                    <li><Truck size={14} aria-hidden="true" /> {leadTimeLabel(supplier.delivery_lead_days)}</li>
                  </ul>
                  <div className="bin__foot">
                    <span className={`stamp ${supplier.active ? "stamp--ok" : "stamp--warn"}`}>{supplier.active ? "Activo" : "Inactivo"}</span>
                    <div className="bin__tools">
                      <Link
                        to={`/taller/compras/proveedores/${supplier.id}/editar`}
                        state={{ supplier }}
                        className="icon-btn"
                        aria-label={`Editar ${supplier.name}`}
                        title="Editar"
                      >
                        <Pencil size={17} />
                      </Link>
                      {supplier.active ? (
                        <button type="button" className="icon-btn icon-btn--danger" aria-label={`Desactivar ${supplier.name}`} title="Desactivar" onClick={() => { setActionError(""); setPending(supplier); }}>
                          <Power size={17} />
                        </button>
                      ) : (
                        <button type="button" className="icon-btn" aria-label={`Reactivar ${supplier.name}`} title="Reactivar" disabled={busyId === supplier.id} onClick={() => setActive(supplier, true)}>
                          <RotateCcw size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {state === "ready" && result.total > PAGE_SIZE && (
            <Pagination page={page} pages={pages} onChange={setPage} label={`Página ${page} de ${pages}`} />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="¿Desactivar este proveedor?"
        confirmLabel="Desactivar"
        busyLabel="Desactivando…"
        busy={Boolean(pending) && busyId === pending.id}
        error={actionError}
        onConfirm={() => setActive(pending, false)}
        onCancel={() => setPending(null)}
      >
        {pending && (
          <p>
            <strong>{pending.name}</strong> dejará de aparecer al registrar compras nuevas. Sus compras anteriores se conservan
            y puedes reactivarlo cuando quieras.
          </p>
        )}
      </ConfirmDialog>
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
