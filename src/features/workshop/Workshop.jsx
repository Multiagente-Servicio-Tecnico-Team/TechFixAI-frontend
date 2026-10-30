import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Eye, Mail, Search, Upload, UserRound } from "lucide-react";
import { useStore } from "../../state/store.jsx";
import { centsToInput, formatPEN } from "../../domain/money.js";
import { STAFF_STATUSES, TICKET_CATEGORIES } from "../../domain/tickets.js";

const PAGE_SIZE = 5;

function exportCsv(rows) {
  const header = ["ID", "Fecha", "Cliente", "Teléfono", "Dispositivo", "Detalle", "Categoría", "Presupuesto (PEN)", "Estado", "Origen"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((t) => [t.id, t.date, t.client, t.phone, t.device, t.issue, t.category, centsToInput(t.budget), t.status, t.origin].map(esc).join(","));
  const blob = new Blob([`﻿${[header.map(esc).join(","), ...lines].join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte-tickets-techfix.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Workshop() {
  const { staffTickets, dispatch } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [status, setStatus] = useState("");
  const [shown, setShown] = useState({});
  const [focus, setFocus] = useState(null);

  const stats = useMemo(() => ({
    active: staffTickets.filter((t) => t.status !== "Entregado").length,
    waiting: staffTickets.filter((t) => t.status === "Esperando Stock").length,
    ready: staffTickets.filter((t) => t.status === "Listo para Retiro").length,
    fresh: staffTickets.filter((t) => t.status === "Nuevo").length,
  }), [staffTickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staffTickets.filter((t) =>
      (category === "Todos" || t.category === category) &&
      (!status || t.status === status) &&
      (!q || `${t.id} ${t.client} ${t.device} ${t.issue}`.toLowerCase().includes(q))
    );
  }, [staffTickets, query, category, status]);

  const stations = status ? [status] : STAFF_STATUSES;
  const inStation = (s) => filtered.filter((t) => t.status === s);
  // En celular se ve una estación a la vez: la elegida o la primera con tickets.
  const focused = stations.includes(focus) ? focus : stations.find((s) => inStation(s).length > 0) || stations[0];

  const resetPage = (fn) => (value) => {
    fn(value);
    setShown({});
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="title">Banco de hoy</h1>
        <button type="button" className="btn" onClick={() => exportCsv(filtered)}>
          <Upload size={17} aria-hidden="true" /> Exportar Reporte
        </button>
      </div>

      <p className="summary">
        <span><strong>{String(stats.active).padStart(2, "0")}</strong> activos, {stats.fresh} nuevos</span>
        <span><strong>{String(stats.waiting).padStart(2, "0")}</strong> esperando repuestos · <Link to="/taller/inventario" className="link">Revisar stock crítico</Link></span>
        <span><strong>{String(stats.ready).padStart(2, "0")}</strong> listos para retiro</span>
      </p>

      <div className="tools">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por cliente, dispositivo o ID de ticket"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            aria-label="Buscar tickets"
          />
        </label>
        <div className="toggle-group" role="tablist" aria-label="Categoría">
          {["Todos", ...TICKET_CATEGORIES].map((c) => (
            <button key={c} type="button" role="tab" aria-selected={category === c} className="toggle" onClick={() => resetPage(setCategory)(c)}>
              {c}
            </button>
          ))}
        </div>
        <select className="select-tool" value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Cualquier Estado</option>
          {STAFF_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 && <p className="empty">No hay tickets con estos filtros.</p>}

      <label className="station__picker">
        Ver estación
        <select className="input" value={focused} onChange={(e) => setFocus(e.target.value)}>
          {stations.map((s) => <option key={s} value={s}>{s} ({inStation(s).length})</option>)}
        </select>
      </label>

      <div className="board" style={{ "--stations": stations.length }} role="region" aria-label="Tablero por estado" tabIndex={0}>
        {stations.map((s) => {
          const all = inStation(s);
          const limit = shown[s] || PAGE_SIZE;
          return (
            <section key={s} className={`station${s === focused ? " is-focus" : ""}`} aria-label={s}>
              <h2 className="station__head"><span>{s}</span><span className="mono">{all.length}</span></h2>
              <div className="station__list">
                {all.length === 0 && <p className="empty small">Sin tickets.</p>}
                {all.slice(0, limit).map((t) => <TicketTag key={t.id} ticket={t} dispatch={dispatch} />)}
                {all.length > limit && (
                  <button type="button" className="btn btn--sm" onClick={() => setShown((v) => ({ ...v, [s]: limit + PAGE_SIZE }))}>
                    Mostrar más ({all.length - limit})
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TicketTag({ ticket: t, dispatch }) {
  return (
    <article className="jobtag wtag">
      <p className="wtag__id">
        <Link to={`/taller/tickets/${t.id}`}>#{t.id}</Link>
        <span className="small muted">{t.date}</span>
      </p>
      <h3 className="wtag__device">{t.device}</h3>
      <p className="wtag__issue">{t.issue}</p>
      <p className="wtag__who">{t.client}<span>{t.phone}</span></p>
      <div className="wtag__meta">
        <span>{t.origin === "Bot" ? <Bot size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />} {t.category} · {t.origin}</span>
        <strong className="wtag__price">{formatPEN(t.budget)}</strong>
      </div>
      <label className="wtag__move">
        Mover a
        <select
          value={t.status}
          onChange={(e) => dispatch({ type: "updateTicket", id: t.id, changes: { status: e.target.value } })}
          aria-label={`Estado de ${t.id}`}
        >
          {STAFF_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <div className="wtag__tools">
        <Link to={`/taller/tickets/${t.id}`} className="icon-btn" aria-label={`Ver ${t.id}`}><Eye size={17} /></Link>
        {t.email ? (
          <a href={`mailto:${t.email}?subject=${encodeURIComponent(`Ticket #${t.id}`)}`} className="icon-btn" aria-label={`Escribir a ${t.client}`}><Mail size={17} /></a>
        ) : (
          <span className="icon-btn is-disabled" role="img" title="Sin correo registrado" aria-label="Sin correo registrado"><Mail size={17} /></span>
        )}
      </div>
    </article>
  );
}
