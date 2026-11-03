import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bot, Eye, Mail, Search, Upload, UserRound } from "lucide-react";
import { useStore } from "../../state/store.jsx";
import { centsToInput, formatPEN } from "../../domain/money.js";
import { REQUEST_TYPE_CODES, REQUEST_TYPE_LABEL, STAFF_STATUSES, TICKET_CATEGORIES, TICKET_ORIGIN_LABEL, TICKET_STATUS_CODES, ADMIN_TICKET_STATUS_LABEL } from "../../domain/tickets.js";
import { ticketsApi } from "./ticketsApi.js";
import { useAdminTickets } from "./useAdminTickets.js";

const PAGE_SIZE = 5;

function exportCsv(rows, apiMode) {
  const header = ["ID", "Fecha", "Cliente", "Teléfono", "Dispositivo", "Detalle", "Categoría", "Presupuesto (PEN)", "Estado", "Origen"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((t) => [apiMode ? t.code : t.id, t.date, t.client, t.phone, t.device, t.issue, t.category, centsToInput(t.budget), t.status, t.origin].map(esc).join(","));
  const blob = new Blob([`\uFEFF${[header.map(esc).join(","), ...lines].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte-tickets-techfix.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Workshop() {
  const { staffTickets, dispatch } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const apiMode = ticketsApi.mode === "api";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [shown, setShown] = useState({});
  const [focus, setFocus] = useState(null);
  const [moved, setMoved] = useState(null);
  const [actionError, setActionError] = useState("");
  const api = useAdminTickets({ search: query, requestType: apiMode && category !== "Todos" ? category : "", status: apiMode ? status : "", origin: apiMode ? origin : "", enabled: apiMode });
  const rows = apiMode ? api.tickets : staffTickets;
  const statusOptions = apiMode ? TICKET_STATUS_CODES : STAFF_STATUSES;
  const categoryOptions = apiMode ? REQUEST_TYPE_CODES : TICKET_CATEGORIES;
  const labelForStatus = (value) => apiMode ? ADMIN_TICKET_STATUS_LABEL[value] || "Estado no disponible" : value;
  const labelForCategory = (value) => apiMode ? REQUEST_TYPE_LABEL[value] || "Tipo no disponible" : value;
  const currentStatus = (ticket) => apiMode ? ticket.statusCode : ticket.status;

  const stats = useMemo(() => apiMode ? ({
    active: rows.filter((t) => !["DELIVERED", "CANCELLED"].includes(t.statusCode)).length,
    fresh: rows.filter((t) => t.statusCode === "NEW").length,
    diagnosing: rows.filter((t) => t.statusCode === "IN_DIAGNOSIS").length,
    ready: rows.filter((t) => t.statusCode === "READY_FOR_DELIVERY").length,
  }) : ({
    active: rows.filter((t) => t.status !== "Entregado").length,
    fresh: rows.filter((t) => t.status === "Nuevo").length,
    diagnosing: rows.filter((t) => t.status === "En Revisión Técnica").length,
    ready: rows.filter((t) => t.status === "Listo para Retiro").length,
  }), [rows, apiMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((t) =>
      (category === "Todos" || (apiMode ? t.requestType === category : t.category === category)) &&
      (!status || currentStatus(t) === status) &&
      (!origin || t.originCode === origin) &&
      (!q || `${t.id} ${t.code || ""} ${t.client} ${t.phone} ${t.device} ${t.issue}`.toLowerCase().includes(q))
    );
  }, [rows, query, category, status, origin, apiMode]);

  const stations = status ? [status] : statusOptions;
  const inStation = (s) => filtered.filter((t) => currentStatus(t) === s);
  const focused = stations.includes(focus) ? focus : stations.find((s) => inStation(s).length > 0) || stations[0];

  useEffect(() => {
    if (moved) (document.getElementById(`tag-${moved.id}`) ?? document.getElementById("tablero"))?.focus();
  }, [moved]);

  const move = async (id, next) => {
    setActionError("");
    if (apiMode) {
      try {
        await api.updateStatus(id, next);
        setFocus(next);
        setShown((v) => ({ ...v, [next]: Number.MAX_SAFE_INTEGER }));
        setMoved({ id, status: labelForStatus(next), hidden: Boolean(status) && next !== status });
      } catch (e) { setActionError(e.message || "No se pudo actualizar el ticket."); }
      return;
    }
    dispatch({ type: "updateTicket", id, changes: { status: next } });
    setFocus(next);
    setShown((v) => ({ ...v, [next]: Number.MAX_SAFE_INTEGER }));
    setMoved({ id, status: next, hidden: Boolean(status) && next !== status });
  };

  const resetPage = (fn) => (value) => { fn(value); setShown({}); };
  const clearFilters = () => { setQuery(""); setCategory("Todos"); setStatus(""); setOrigin(""); setShown({}); };

  useEffect(() => {
    if (api.errorStatus === 401) navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
  }, [api.errorStatus, navigate, location.pathname]);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="title">Banco de hoy</h1>
        <button type="button" className="btn" onClick={() => exportCsv(filtered, apiMode)} disabled={api.loading || !!api.error}>
          <Upload size={17} aria-hidden="true" /> Exportar Reporte
        </button>
      </div>

      <p className="summary">
        <span><strong>{String(stats.active).padStart(2, "0")}</strong> activos, {stats.fresh} nuevos</span>
        <span><strong>{String(stats.diagnosing).padStart(2, "0")}</strong> en diagnóstico · <Link to="/taller/inventario" className="link">Revisar inventario</Link></span>
        <span><strong>{String(stats.ready).padStart(2, "0")}</strong> listos para entrega</span>
      </p>

      <div className="tools">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Buscar por cliente, dispositivo o ID de ticket" value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} aria-label="Buscar tickets" />
        </label>
        <div className="toggle-group" role="group" aria-label="Categoría">
          {["Todos", ...categoryOptions].map((c) => (
            <button key={c} type="button" aria-pressed={category === c} className="toggle" onClick={() => resetPage(setCategory)(c)}>{c === "Todos" ? c : labelForCategory(c)}</button>
          ))}
        </div>
        <select className="select-tool" value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Cualquier Estado</option>
          {statusOptions.map((s) => <option key={s} value={s}>{labelForStatus(s)}</option>)}
        </select>
        {apiMode && <select className="select-tool" value={origin} onChange={(e) => resetPage(setOrigin)(e.target.value)} aria-label="Filtrar por origen">
          <option value="">Cualquier origen</option>
          <option value="MANUAL">{TICKET_ORIGIN_LABEL.MANUAL}</option>
          <option value="ONLINE">{TICKET_ORIGIN_LABEL.ONLINE}</option>
        </select>}
      </div>

      {apiMode && api.loading && <p className="form-alert" role="status">Cargando tickets…</p>}
      {apiMode && api.error && <div className="form-alert" role="alert">{api.error} <button type="button" className="btn" onClick={api.retry}>Reintentar</button></div>}
      {actionError && <div className="form-alert" role="alert">{actionError}</div>}
      <p className="vh" role="status">
        {moved ? `Ticket ${moved.id} movido a ${moved.status}${moved.hidden ? " (no se muestra con el filtro de estado actual)" : ""}. ` : ""}{filtered.length} tickets
      </p>
      {!api.loading && !api.error && filtered.length === 0 && <p className="empty">No hay tickets con estos filtros.</p>}

      <label className="station__picker">
        Ver estación
        <select className="input" value={focused} onChange={(e) => setFocus(e.target.value)}>
          {stations.map((s) => <option key={s} value={s}>{labelForStatus(s)} ({inStation(s).length})</option>)}
        </select>
      </label>

      <div id="tablero" className="board" style={{ "--stations": stations.length }} role="region" aria-label="Tablero por estado" tabIndex={0}>
        {stations.map((s) => {
          const all = inStation(s);
          const limit = shown[s] || PAGE_SIZE;
          return (
            <section key={s} className={`station${s === focused ? " is-focus" : ""}`} aria-label={labelForStatus(s)}>
              <h2 className="station__head"><span>{labelForStatus(s)}</span><span className="mono">{all.length}</span></h2>
              <div className="station__list">
                {all.length === 0 && <p className="empty small">Sin tickets.</p>}
                {all.slice(0, limit).map((t) => <TicketTag key={t.id} ticket={t} onMove={move} statusOptions={statusOptions} labelForStatus={labelForStatus} apiMode={apiMode} />)}
                {all.length > limit && <button type="button" className="btn" onClick={() => setShown((v) => ({ ...v, [s]: limit + PAGE_SIZE }))}>Mostrar más ({all.length - limit})</button>}
              </div>
            </section>
          );
        })}
      </div>
      <button type="button" className="btn" onClick={clearFilters}>Limpiar filtros</button>
    </div>
  );
}

function TicketTag({ ticket: t, onMove, statusOptions, labelForStatus, apiMode }) {
  const visibleId = apiMode ? t.code : t.id;
  const statusValue = apiMode ? t.statusCode : t.status;
  const originIsOnline = t.origin === "En línea" || t.origin === "Bot";
  return (
    <article id={`tag-${t.id}`} tabIndex={-1} className="jobtag wtag">
      <p className="wtag__id"><Link to={`/taller/tickets/${t.id}`}>#{visibleId}</Link><span className="small muted">{t.date}</span></p>
      <h3 className="wtag__device">{t.device}</h3>
      <p className="wtag__issue">{t.issue}</p>
      <p className="wtag__who">{t.client}<span>{t.phone}</span></p>
      <div className="wtag__meta">
        <span>{originIsOnline ? <Bot size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />} {t.category} · {t.origin}</span>
        <strong className="wtag__price">{formatPEN(t.budget)}</strong>
      </div>
      <label className="wtag__move">Mover a
        <select value={statusValue} onChange={(e) => onMove(t.id, e.target.value)} aria-label={`Mover a, ticket ${visibleId}`}>
          {statusOptions.map((s) => <option key={s} value={s}>{labelForStatus(s)}</option>)}
        </select>
      </label>
      <div className="wtag__tools">
        <Link to={`/taller/tickets/${t.id}`} className="icon-btn" aria-label={`Ver ${visibleId}`}><Eye size={17} /></Link>
        {t.email ? <a href={`mailto:${t.email}?subject=${encodeURIComponent(`Ticket ${visibleId}`)}`} className="icon-btn" aria-label={`Escribir a ${t.client}`}><Mail size={17} /></a> : <span className="icon-btn is-disabled" role="img" title="Sin correo registrado" aria-label="Sin correo registrado"><Mail size={17} /></span>}
      </div>
    </article>
  );
}
