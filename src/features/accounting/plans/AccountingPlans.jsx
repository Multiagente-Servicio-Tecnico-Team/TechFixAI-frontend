import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CircleCheck, Star } from "lucide-react";
import { Field, Pagination } from "../../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../../shared/ui/FormAlert.jsx";
import { accountingApi } from "../accountingApi.js";

const emptyPlan = { code: "", name: "", jurisdiction: "PE", edition: "", source_name: "", source_url: "", effective_from: "", effective_to: "" };

export default function AccountingPlans() {
  const navigate = useNavigate();
  const location = useLocation();
  const [plans, setPlans] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyPlan);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDefault, setPendingDefault] = useState(null);
  const [actionError, setActionError] = useState("");
  const [auditType, setAuditType] = useState("PLAN");
  const [auditPage, setAuditPage] = useState(1);
  const [audit, setAudit] = useState({ items: [], total: 0 });
  const [auditState, setAuditState] = useState("loading");
  const [auditError, setAuditError] = useState("");

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const result = await accountingApi.listPlans();
      setPlans(result?.items ?? []); setState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { setPlans([]); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setPlans([]);
      setError(cause.message); setState("error");
    }
  }, [location.pathname, navigate]);

  const loadAudit = useCallback(async (type = auditType, page = auditPage) => {
    setAuditState("loading"); setAuditError("");
    try {
      const response = await accountingApi.listAuditEvents({ entity_type: type, limit: 50, offset: (page - 1) * 50 });
      setAudit({ items: response?.items ?? [], total: response?.total ?? 0 }); setAuditState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setAudit({ items: [], total: 0 });
      setAuditError(cause.message); setAuditState("error");
    }
  }, [auditPage, auditType, location.pathname, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAudit(auditType, 1); }, [auditType]);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true); setActionError("");
    const payload = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== ""));
    try {
      await accountingApi.createPlan(payload);
      setDraft(emptyPlan); setCreating(false); await Promise.all([load(), loadAudit()]);
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      setActionError(cause.message);
    } finally { setBusy(false); }
  };

  const setDefault = async () => {
    if (!pendingDefault || busy) return;
    setBusy(true); setActionError("");
    try { await accountingApi.setDefaultPlan(pendingDefault.id); setPendingDefault(null); await Promise.all([load(), loadAudit()]); }
    catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      setActionError(cause.message);
    } finally { setBusy(false); }
  };

  return <div className="page accounting-page">
    <Link className="back-link" to="/taller/contabilidad"><ArrowLeft size={16} aria-hidden="true" /> Contabilidad</Link>
    <div className="page-head"><div><p className="kicker">CONFIGURACIÓN CONTABLE</p><h1 className="title">Planes contables</h1><p className="muted">El plan predeterminado se usa en nuevos asientos si no se elige otro.</p><p className="muted small">El catálogo PCGE es una referencia interna; esta interfaz no genera libros PLE ni certifica declaraciones ante SUNAT.</p></div><button type="button" className="btn btn--primary" onClick={() => setCreating((value) => !value)}>{creating ? "Cancelar" : "Nuevo plan"}</button></div>
    <FormAlert>{actionError}</FormAlert>
    {creating && <form className="jobtag accounting-form accounting-catalog-form" onSubmit={create}>
      <h2 className="subtitle">Crear plan alternativo</h2>
      <div className="grid-2">
        <Field label="Código" htmlFor="plan-code" required><input className="input" id="plan-code" maxLength={40} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required /></Field>
        <Field label="Nombre" htmlFor="plan-name" required><input className="input" id="plan-name" maxLength={160} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
        <Field label="Jurisdicción" htmlFor="plan-jurisdiction" required><input className="input" id="plan-jurisdiction" minLength={2} maxLength={8} value={draft.jurisdiction} onChange={(e) => setDraft({ ...draft, jurisdiction: e.target.value.toUpperCase() })} required /></Field>
        <Field label="Edición" htmlFor="plan-edition" required><input className="input" id="plan-edition" maxLength={80} value={draft.edition} onChange={(e) => setDraft({ ...draft, edition: e.target.value })} required /></Field>
        <Field label="Fuente" htmlFor="plan-source"><input className="input" id="plan-source" maxLength={160} value={draft.source_name} onChange={(e) => setDraft({ ...draft, source_name: e.target.value })} /></Field>
        <Field label="URL de la fuente" htmlFor="plan-source-url"><input className="input" id="plan-source-url" type="url" value={draft.source_url} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} /></Field>
        <Field label="Vigente desde" htmlFor="plan-start"><input className="input" id="plan-start" type="date" value={draft.effective_from} onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })} /></Field>
        <Field label="Vigente hasta" htmlFor="plan-end"><input className="input" id="plan-end" type="date" min={draft.effective_from || undefined} value={draft.effective_to} onChange={(e) => setDraft({ ...draft, effective_to: e.target.value })} /></Field>
      </div>
      <div className="btn-row"><button className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Crear plan"}</button></div>
    </form>}
    {state === "loading" && <p className="empty" role="status">Cargando planes…</p>}
    {state === "error" && <div><FormAlert>{error}</FormAlert><button className="btn" type="button" onClick={load}>Reintentar</button></div>}
    {state === "ready" && (plans.length ? <div className="accounting-list">{plans.map((plan) => <article className="jobtag accounting-card" key={plan.id}>
      <div className="accounting-card__top"><div><h2 className="subtitle">{plan.name}</h2><span className="muted">{plan.code} · {plan.edition}</span></div>{plan.is_default && <span className="badge badge--ok"><CircleCheck size={14} aria-hidden="true" /> Predeterminado</span>}</div>
      <dl className="accounting-summary"><div><dt>Jurisdicción</dt><dd>{plan.jurisdiction}</dd></div><div><dt>Fuente</dt><dd>{plan.source_name || "—"}</dd></div><div><dt>Vigencia</dt><dd>{plan.effective_from || "—"} – {plan.effective_to || "sin término"}</dd></div><div><dt>Estado</dt><dd>{plan.status === "ACTIVE" ? "Activo" : "Inactivo"}</dd></div></dl>
      <div className="btn-row"><Link className="btn" to={`/taller/contabilidad/cuentas?plan=${plan.id}`}>Ver cuentas</Link>{!plan.is_default && plan.status === "ACTIVE" && <button type="button" className="btn" onClick={() => { setActionError(""); setPendingDefault(plan); }}><Star size={15} aria-hidden="true" /> Establecer predeterminado</button>}</div>
    </article>)}</div> : <div className="jobtag empty">No hay planes contables disponibles.</div>)}
    <section className="accounting-section"><div className="accounting-card__top"><h2 className="subtitle">Auditoría de planes</h2><Field label="Tipo de cambio" htmlFor="plan-audit-type"><select id="plan-audit-type" className="input" value={auditType} onChange={(e) => { setAuditType(e.target.value); setAuditPage(1); }}><option value="PLAN">Planes</option><option value="DEFAULT_PLAN">Plan predeterminado</option></select></Field></div>
      {auditState === "loading" && <p className="empty" role="status">Cargando auditoría…</p>}
      {auditState === "error" && <div><FormAlert>{auditError}</FormAlert><button type="button" className="btn" onClick={() => loadAudit()}>Reintentar auditoría</button></div>}
      {auditState === "ready" && (audit.items.length ? <><div className="accounting-audit-list">{audit.items.map((event) => <article className="jobtag accounting-audit-card" key={event.id}><strong>{event.action}</strong><span>Plan #{event.entity_id} · {new Date(event.occurred_at).toLocaleString("es-PE")} · Usuario #{event.actor_user_id}</span>{event.reason && <p>Motivo: {event.reason}</p>}<details><summary>Ver cambio registrado</summary><pre>{JSON.stringify({ anterior: event.prior_state, nuevo: event.new_state }, null, 2)}</pre></details></article>)}</div><Pagination page={auditPage} pages={Math.max(1, Math.ceil(audit.total / 50))} onChange={(next) => { setAuditPage(next); loadAudit(auditType, next); }} label={`Página ${auditPage} de ${Math.max(1, Math.ceil(audit.total / 50))}`} /></> : <p className="muted">No hay cambios auditados.</p>)}
    </section>
    <ConfirmDialog open={Boolean(pendingDefault)} title="Cambiar plan predeterminado" confirmLabel="Confirmar cambio" busy={busy} error={null} onConfirm={setDefault} onCancel={() => setPendingDefault(null)}>
      <p>El plan <strong>{pendingDefault?.name}</strong> se usará como predeterminado para nuevos asientos. Los asientos anteriores conservarán el plan que ya tienen.</p>
    </ConfirmDialog>
  </div>;
}
