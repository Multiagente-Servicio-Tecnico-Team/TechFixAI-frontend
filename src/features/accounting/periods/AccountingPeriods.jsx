import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Field, Pagination } from "../../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../../shared/ui/FormAlert.jsx";
import { accountingApi } from "../accountingApi.js";

const PAGE_SIZE = 50;
const currentPeriod = () => new Date().toISOString().slice(0, 7);
const splitPeriod = (value) => value.split("-").map(Number);
const periodName = (period) => `${String(period.year).padStart(4, "0")}-${String(period.month).padStart(2, "0")}`;
const dateTime = (value) => value ? new Date(value).toLocaleString("es-PE") : "Sin transición registrada";

export default function AccountingPeriods() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fromPeriod, setFromPeriod] = useState(`${new Date().getFullYear()}-01`);
  const [toPeriod, setToPeriod] = useState(currentPeriod());
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ from_period: `${new Date().getFullYear()}-01`, to_period: currentPeriod(), status: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [closeTarget, setCloseTarget] = useState(currentPeriod());

  const load = useCallback(async (filters = applied, nextPage = page) => {
    setState("loading"); setError("");
    try {
      const data = await accountingApi.listPeriods({ ...filters, limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult({ items: data?.items ?? [], total: data?.total ?? 0, limit: data?.limit ?? PAGE_SIZE, offset: data?.offset ?? 0 }); setState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 }); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      setError(cause.message); setState("error");
    }
  }, [applied, location.pathname, navigate, page]);
  useEffect(() => { load(applied, 1); }, []);

  const apply = (event) => { event.preventDefault(); const next = { from_period: fromPeriod, to_period: toPeriod, status }; setApplied(next); setPage(1); load(next, 1); };
  const changePage = (next) => { setPage(next); load(applied, next); };
  const beginClose = (value) => { const [year, month] = splitPeriod(value); setAction({ type: "close", year, month }); setActionError(""); };
  const beginReopen = (period) => { setAction({ type: "reopen", year: period.year, month: period.month }); setReason(""); setActionError(""); };

  const confirmAction = async () => {
    if (!action || busy) return;
    if (action.type === "reopen" && !reason.trim()) { setActionError("Indica el motivo de reapertura."); return; }
    setBusy(true); setActionError("");
    try {
      if (action.type === "close") await accountingApi.closePeriod(action.year, action.month);
      else await accountingApi.reopenPeriod(action.year, action.month, reason.trim());
      setAction(null); await load(applied, page);
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      if (cause.status === 409) { await load(applied, page); setActionError("El periodo cambió desde que se abrió esta confirmación. Se actualizó la lista; revisa su estado."); }
      else setActionError(cause.message);
    } finally { setBusy(false); }
  };

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  return <div className="page accounting-page">
    <Link className="back-link" to="/taller/contabilidad"><ArrowLeft size={16} aria-hidden="true" /> Contabilidad</Link>
    <div className="page-head"><div><p className="kicker">CONTROL MENSUAL</p><h1 className="title">Periodos contables</h1><p className="muted">Un periodo cerrado bloquea nuevos asientos y reversiones de ese mes.</p></div></div>
    <section className="jobtag accounting-period-close">
      <div><h2 className="subtitle">Cerrar un mes</h2><p className="muted">Elige el mes, incluso si aún no tiene un registro de periodo.</p></div>
      <Field label="Mes" htmlFor="period-to-close"><input id="period-to-close" className="input" type="month" min="2000-01" value={closeTarget} onChange={(e) => setCloseTarget(e.target.value)} /></Field>
      <button type="button" className="btn btn--primary" disabled={!/^\d{4}-(0[1-9]|1[0-2])$/.test(closeTarget)} onClick={() => beginClose(closeTarget)}><CalendarDays size={16} aria-hidden="true" /> Cerrar periodo</button>
    </section>
    <form className="jobtag accounting-filters" onSubmit={apply}>
      <div className="grid-2"><Field label="Desde" htmlFor="period-from"><input id="period-from" className="input" type="month" min="2000-01" max={toPeriod || undefined} value={fromPeriod} onChange={(e) => setFromPeriod(e.target.value)} /></Field><Field label="Hasta" htmlFor="period-to"><input id="period-to" className="input" type="month" min={fromPeriod || "2000-01"} value={toPeriod} onChange={(e) => setToPeriod(e.target.value)} /></Field><Field label="Estado" htmlFor="period-status"><select id="period-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="OPEN">Abierto</option><option value="CLOSED">Cerrado</option></select></Field></div>
      <div className="btn-row"><button className="btn btn--primary">Aplicar filtros</button><button type="button" className="btn" onClick={() => { const next = { from_period: "", to_period: "", status: "" }; setFromPeriod(""); setToPeriod(""); setStatus(""); setApplied(next); setPage(1); load(next, 1); }}>Limpiar</button></div>
    </form>
    {state === "loading" && <p className="empty" role="status">Cargando periodos…</p>}
    {state === "error" && <div><FormAlert>{error}</FormAlert><button type="button" className="btn" onClick={() => load()}>Reintentar</button></div>}
    {state === "ready" && <>
      {!result.items.length ? <div className="jobtag empty">No hay periodos en el rango seleccionado. Para cerrar un mes nuevo, selecciónalo en “Cerrar un mes”.</div> : <div className="accounting-list">{result.items.map((period) => <article className="jobtag accounting-card" key={periodName(period)}>
        <div className="accounting-card__top"><h2 className="subtitle">{periodName(period)}</h2><span className={`badge ${period.status === "CLOSED" ? "badge--warn" : "badge--ok"}`}>{period.status === "CLOSED" ? "Cerrado" : "Abierto"}</span></div>
        <dl className="accounting-summary"><div><dt>Última transición</dt><dd>{dateTime(period.last_transition_at)}</dd></div><div><dt>Responsable (ID)</dt><dd>{period.last_transition_by ?? "—"}</dd></div><div><dt>Motivo</dt><dd>{period.last_reason || "—"}</dd></div></dl>
        <div className="btn-row"><Link className="btn" to={`/taller/contabilidad/periodos/${period.year}/${String(period.month).padStart(2, "0")}/eventos`}>Ver historial</Link>{period.status === "CLOSED" ? <button type="button" className="btn" onClick={() => beginReopen(period)}>Reabrir</button> : <button type="button" className="btn" onClick={() => beginClose(periodName(period))}>Cerrar</button>}</div>
      </article>)}</div>}
      <Pagination page={page} pages={pages} onChange={changePage} label={`Página ${page} de ${pages}`} />
    </>}
    <ConfirmDialog open={Boolean(action)} title={action?.type === "close" ? "Cerrar periodo contable" : "Reabrir periodo contable"} confirmLabel={action?.type === "close" ? "Confirmar cierre" : "Confirmar reapertura"} busy={busy} error={actionError} onConfirm={confirmAction} onCancel={() => setAction(null)}>
      {action?.type === "close" ? <p>Se cerrará <strong>{periodName(action)}</strong>. No se podrán crear ni revertir asientos con fecha de ese mes hasta que un ADMIN lo reabra.</p> : <><p>Se reabrirá <strong>{action ? periodName(action) : ""}</strong>. La acción quedará auditada.</p><Field label="Motivo de reapertura" htmlFor="period-reopen-reason" required><textarea id="period-reopen-reason" className="input textarea" minLength={1} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></>}
    </ConfirmDialog>
  </div>;
}
