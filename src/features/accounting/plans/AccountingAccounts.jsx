import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Search } from "lucide-react";
import { Field, Pagination } from "../../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../../shared/ui/FormAlert.jsx";
import { accountingApi } from "../accountingApi.js";

const PAGE_SIZE = 50;
const blankAccount = { code: "", name: "", parent_account_id: "", account_group: "", normal_balance: "DEBIT", is_postable: true, status: "ACTIVE", effective_from: "", effective_to: "" };
const dateTime = (value) => value ? new Date(value).toLocaleString("es-PE") : "—";

export default function AccountingAccounts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState(searchParams.get("plan") || "");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [postable, setPostable] = useState("");
  const [parentId, setParentId] = useState("");
  const [applied, setApplied] = useState({ q: "", status: "ACTIVE", postable: "", parent_id: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(blankAccount);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deactivating, setDeactivating] = useState(null);
  const [audit, setAudit] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [auditPage, setAuditPage] = useState(1);
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [appliedAuditRange, setAppliedAuditRange] = useState({ from_at: "", to_at: "" });
  const [auditState, setAuditState] = useState("loading");
  const [auditError, setAuditError] = useState("");

  const loadPlans = useCallback(async () => {
    try {
      const data = await accountingApi.listPlans();
      const items = data?.items ?? [];
      setPlans(items);
      const requested = searchParams.get("plan");
      const selected = items.find((item) => String(item.id) === String(requested)) || items.find((item) => item.is_default) || items[0];
      if (selected) { setPlanId(String(selected.id)); setSearchParams({ plan: String(selected.id) }, { replace: true }); }
      setState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setPlans([]);
      setError(cause.message); setState("error");
    }
  }, [location.pathname, navigate, searchParams, setSearchParams]);

  const loadAccounts = useCallback(async (selectedPlan = planId, filters = applied, nextPage = page) => {
    if (!selectedPlan) { setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 }); setState("ready"); return; }
    setState("loading"); setError("");
    try {
      const data = await accountingApi.listAccounts(selectedPlan, { ...filters, limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult({ items: data?.items ?? [], total: data?.total ?? 0, limit: data?.limit ?? PAGE_SIZE, offset: data?.offset ?? 0 }); setState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 }); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      setError(cause.message); setState("error");
    }
  }, [applied, location.pathname, navigate, page, planId]);

  const loadAudit = useCallback(async (nextPage = 1, range = appliedAuditRange) => {
    setAuditState("loading"); setAuditError("");
    try {
      const data = await accountingApi.listAuditEvents({ entity_type: "ACCOUNT", ...range, limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setAudit({ items: data?.items ?? [], total: data?.total ?? 0, limit: data?.limit ?? PAGE_SIZE, offset: data?.offset ?? 0 }); setAuditState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setAudit({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      setAuditError(cause.message); setAuditState("error");
    }
  }, [appliedAuditRange, location.pathname, navigate]);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { if (planId) loadAccounts(planId, applied, 1); }, [planId]);
  useEffect(() => { loadAudit(1); }, [loadAudit]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = { q: query.trim(), status, postable, parent_id: parentId.trim() };
    setApplied(next); setPage(1); loadAccounts(planId, next, 1);
  };
  const changePage = (next) => { setPage(next); loadAccounts(planId, applied, next); };
  const startCreate = () => { setEditing(null); setDraft(blankAccount); setActionError(""); setFormOpen(true); };
  const startEdit = (account) => {
    setEditing(account);
    setDraft({ code: account.code, name: account.name, parent_account_id: account.parent_account_id ?? "", account_group: account.account_group ?? "", normal_balance: account.normal_balance, is_postable: account.is_postable, status: account.status, effective_from: account.effective_from ?? "", effective_to: account.effective_to ?? "" });
    setActionError(""); setFormOpen(true);
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    if (!planId) return;
    setBusy(true); setActionError("");
    const payload = editing
      ? Object.fromEntries(["name", "account_group", "normal_balance", "is_postable", "status", "effective_to"].map((key) => [key, key === "effective_to" && draft[key] === "" ? null : draft[key]]))
      : Object.fromEntries(Object.entries({ ...draft, parent_account_id: draft.parent_account_id ? Number(draft.parent_account_id) : undefined }).filter(([, value]) => value !== "" && value !== undefined));
    try {
      if (editing) await accountingApi.updateAccount(editing.id, payload);
      else await accountingApi.createAccount(planId, payload);
      setFormOpen(false); setDraft(blankAccount); await Promise.all([loadAccounts(planId, applied, page), loadAudit(1)]);
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      setActionError(cause.message);
    } finally { setBusy(false); }
  };

  const deactivate = async () => {
    if (!deactivating || busy) return;
    setBusy(true); setActionError("");
    try { await accountingApi.updateAccount(deactivating.id, { status: "INACTIVE" }); setDeactivating(null); await Promise.all([loadAccounts(planId, applied, page), loadAudit(1)]); }
    catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      setActionError(cause.message);
    } finally { setBusy(false); }
  };

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const auditPages = Math.max(1, Math.ceil(audit.total / PAGE_SIZE));
  const accountRows = useMemo(() => result.items, [result.items]);

  return <div className="page accounting-page">
    <Link className="back-link" to="/taller/contabilidad"><ArrowLeft size={16} aria-hidden="true" /> Contabilidad</Link>
    <div className="page-head"><div><p className="kicker">CATÁLOGO CONTABLE</p><h1 className="title">Cuentas</h1><p className="muted">Las cuentas con movimientos se desactivan; no se borran.</p></div><button type="button" className="btn btn--primary" onClick={startCreate} disabled={!planId}><Plus size={16} aria-hidden="true" /> Nueva cuenta</button></div>
    <Field label="Plan contable" htmlFor="accounts-plan"><select id="accounts-plan" className="input" value={planId} onChange={(e) => { const id = e.target.value; setPlanId(id); setPage(1); setSearchParams(id ? { plan: id } : {}, { replace: true }); }}><option value="">Selecciona un plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.is_default ? " (predeterminado)" : ""}</option>)}</select></Field>
    <form className="jobtag accounting-filters" onSubmit={applyFilters}>
      <div className="grid-2">
        <Field label="Buscar por código o nombre" htmlFor="account-query"><input id="account-query" className="input" maxLength={120} value={query} onChange={(e) => setQuery(e.target.value)} /></Field>
        <Field label="Cuenta padre (ID)" htmlFor="account-parent"><input id="account-parent" className="input" type="number" min="1" value={parentId} onChange={(e) => setParentId(e.target.value)} /></Field>
        <Field label="Estado" htmlFor="account-status"><select id="account-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option></select></Field>
        <Field label="Imputabilidad" htmlFor="account-postable"><select id="account-postable" className="input" value={postable} onChange={(e) => setPostable(e.target.value)}><option value="">Todas</option><option value="true">Imputable</option><option value="false">No imputable</option></select></Field>
      </div>
      <div className="btn-row"><button className="btn btn--primary"><Search size={15} aria-hidden="true" /> Buscar</button><button type="button" className="btn" onClick={() => { setQuery(""); setStatus(""); setPostable(""); setParentId(""); setApplied({ q: "", status: "", postable: "", parent_id: "" }); setPage(1); loadAccounts(planId, { q: "", status: "", postable: "", parent_id: "" }, 1); }}>Limpiar</button></div>
    </form>
    {formOpen && <form className="jobtag accounting-form accounting-catalog-form" onSubmit={saveAccount}>
      <h2 className="subtitle">{editing ? `Editar ${editing.code}` : "Nueva cuenta"}</h2><FormAlert>{actionError}</FormAlert>
      <div className="grid-2">
        <Field label="Código" htmlFor="account-code" required><input className="input" id="account-code" maxLength={40} value={draft.code} disabled={Boolean(editing)} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required /></Field>
        <Field label="Denominación" htmlFor="account-name" required><input className="input" id="account-name" maxLength={200} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
        {!editing && <Field label="ID de cuenta padre (opcional)" htmlFor="account-parent-id"><input className="input" id="account-parent-id" type="number" min="1" value={draft.parent_account_id} onChange={(e) => setDraft({ ...draft, parent_account_id: e.target.value })} /></Field>}
        <Field label="Grupo" htmlFor="account-group"><input className="input" id="account-group" maxLength={40} value={draft.account_group} onChange={(e) => setDraft({ ...draft, account_group: e.target.value })} /></Field>
        <Field label="Naturaleza" htmlFor="account-balance" required><select className="input" id="account-balance" value={draft.normal_balance} onChange={(e) => setDraft({ ...draft, normal_balance: e.target.value })}><option value="DEBIT">Deudora</option><option value="CREDIT">Acreedora</option></select></Field>
        <Field label="Imputabilidad" htmlFor="account-postable-form" required><select className="input" id="account-postable-form" value={String(draft.is_postable)} onChange={(e) => setDraft({ ...draft, is_postable: e.target.value === "true" })}><option value="true">Imputable</option><option value="false">No imputable</option></select></Field>
        <Field label="Estado" htmlFor="account-status-form"><select className="input" id="account-status-form" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option></select></Field>
        {!editing && <Field label="Vigente desde" htmlFor="account-effective-from"><input className="input" id="account-effective-from" type="date" value={draft.effective_from} onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })} /></Field>}
        <Field label="Vigente hasta" htmlFor="account-effective-to"><input className="input" id="account-effective-to" type="date" min={draft.effective_from || undefined} value={draft.effective_to} onChange={(e) => setDraft({ ...draft, effective_to: e.target.value })} /></Field>
      </div>
      <div className="btn-row"><button className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear cuenta"}</button><button className="btn" type="button" onClick={() => setFormOpen(false)} disabled={busy}>Cancelar</button></div>
    </form>}
    {state === "loading" && <p className="empty" role="status">Cargando cuentas…</p>}
    {state === "error" && <div><FormAlert>{error}</FormAlert><button type="button" className="btn" onClick={() => loadAccounts()}>Reintentar</button></div>}
    {state === "ready" && <>
      <p className="muted" aria-live="polite">{result.total} {result.total === 1 ? "cuenta" : "cuentas"}</p>
      {!accountRows.length ? <div className="jobtag empty">No hay cuentas que coincidan con los filtros.</div> : <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Código</th><th>Cuenta</th><th>Jerarquía</th><th>Naturaleza</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{accountRows.map((account) => <tr key={account.id}>
        <td data-label="Código"><strong>{account.code}</strong></td><td data-label="Cuenta">{account.name}<small className="accounting-account-sub">{account.account_group || ""}</small></td><td data-label="Jerarquía">{account.parent_name || account.parent_account_id || "Raíz"}</td><td data-label="Naturaleza">{account.normal_balance === "DEBIT" ? "Deudora" : "Acreedora"} · {account.is_postable ? "Imputable" : "No imputable"}</td><td data-label="Vigencia">{account.effective_from || "—"} – {account.effective_to || "sin término"}</td><td data-label="Estado"><span className={`badge ${account.status === "ACTIVE" ? "badge--ok" : "badge--warn"}`}>{account.status === "ACTIVE" ? "Activa" : "Inactiva"}</span></td><td data-label="Acciones"><div className="btn-row"><button className="btn btn--sm" type="button" onClick={() => startEdit(account)}><Pencil size={14} aria-hidden="true" /> Editar</button>{account.status === "ACTIVE" && <button className="btn btn--sm" type="button" onClick={() => setDeactivating(account)}>Desactivar</button>}</div></td>
      </tr>)}</tbody></table></div>}
      <Pagination page={page} pages={totalPages} onChange={changePage} label={`Página ${page} de ${totalPages}`} />
    </>}
    <section className="accounting-section"><div className="accounting-card__top"><h2 className="subtitle">Auditoría de cuentas</h2><form className="accounting-audit-filters" onSubmit={(event) => { event.preventDefault(); const next = { from_at: auditFrom ? new Date(auditFrom).toISOString() : "", to_at: auditTo ? new Date(auditTo).toISOString() : "" }; setAppliedAuditRange(next); setAuditPage(1); loadAudit(1, next); }}><Field label="Desde" htmlFor="account-audit-from"><input id="account-audit-from" className="input" type="datetime-local" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} /></Field><Field label="Hasta" htmlFor="account-audit-to"><input id="account-audit-to" className="input" type="datetime-local" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} /></Field><button type="submit" className="btn btn--sm">Filtrar auditoría</button></form></div>
      {auditState === "loading" && <p className="empty" role="status">Cargando cambios…</p>}
      {auditState === "error" && <div><FormAlert>{auditError}</FormAlert><button className="btn" type="button" onClick={() => loadAudit(auditPage)}>Reintentar auditoría</button></div>}
      {auditState === "ready" && (audit.items.length ? <><div className="accounting-audit-list">{audit.items.map((event) => <article className="jobtag accounting-audit-card" key={event.id}><strong>{event.action}</strong><span>Cuenta #{event.entity_id} · {dateTime(event.occurred_at)} · Usuario #{event.actor_user_id}</span>{event.reason && <p>Motivo: {event.reason}</p>}<details><summary>Ver cambio registrado</summary><pre>{JSON.stringify({ anterior: event.prior_state, nuevo: event.new_state }, null, 2)}</pre></details></article>)}</div><Pagination page={auditPage} pages={auditPages} onChange={(next) => { setAuditPage(next); loadAudit(next); }} label={`Página ${auditPage} de ${auditPages}`} /></> : <p className="muted">No hay cambios auditados de cuentas.</p>)}
    </section>
    <ConfirmDialog open={Boolean(deactivating)} title="Desactivar cuenta" confirmLabel="Desactivar cuenta" busy={busy} error={null} onConfirm={deactivate} onCancel={() => setDeactivating(null)}><p>La cuenta <strong>{deactivating?.code} · {deactivating?.name}</strong> quedará inactiva. Su historial y los asientos existentes se conservarán.</p></ConfirmDialog>
  </div>;
}
