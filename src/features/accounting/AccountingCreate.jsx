import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CircleCheck, LoaderCircle } from "lucide-react";
import { calculateEntryTotals, formatAccountingAmount, formatAccountingDecimal, parseAccountingAmount, validateEntryDraft } from "../../domain/accounting.js";
import { BackLink, Field } from "../../shared/ui/ui.jsx";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { accountingApi as defaultApi } from "./accountingApi.js";
import EntryLinesEditor from "./EntryLinesEditor.jsx";

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function blankLine() {
  return { account_id: "", account: null, account_code: "", account_name: "", description: "", debit: "", credit: "" };
}

function toPayload(draft) {
  return {
    operation_date: draft.operation_date,
    plan_id: Number(draft.plan_id),
    concept: draft.concept.trim(),
    detail: draft.detail.trim(),
    category_id: Number(draft.category_id),
    lines: draft.lines.map((line) => ({
      account_id: Number(line.account_id),
      description: line.description.trim() || null,
      debit: formatAccountingDecimal(parseAccountingAmount(line.debit || "0") ?? 0n),
      credit: formatAccountingDecimal(parseAccountingAmount(line.credit || "0") ?? 0n),
    })),
  };
}

export default function AccountingCreate({ api = defaultApi }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [categoryState, setCategoryState] = useState("loading");
  const [categoryError, setCategoryError] = useState("");
  const [plans, setPlans] = useState([]);
  const [planError, setPlanError] = useState("");
  const [draft, setDraft] = useState({ operation_date: localDate(), plan_id: "", concept: "", detail: "", category_id: "", lines: [blankLine(), blankLine()] });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [created, setCreated] = useState(null);
  const [periodConflict, setPeriodConflict] = useState(null);

  const totals = useMemo(() => calculateEntryTotals(draft.lines), [draft.lines]);

  const loadCategories = useCallback(async () => {
    setCategoryState("loading");
    setCategoryError("");
    setPlanError("");
    try {
      const [result, planResult] = await Promise.all([api.listCategories(), api.listPlans()]);
      const availablePlans = planResult?.items ?? [];
      setCategories(result?.items ?? []);
      setPlans(availablePlans);
      setDraft((current) => ({ ...current, plan_id: current.plan_id || String(availablePlans.find((plan) => plan.is_default)?.id ?? availablePlans[0]?.id ?? "") }));
      setCategoryState("ready");
    } catch (error) {
      if (error.code === "session_required") { setCategories([]); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (error.code === "forbidden") { setCategories([]); setPlans([]); }
      setCategoryError(error.message);
      setCategoryState("error");
    }
  }, [api, location.pathname, navigate]);

  useEffect(() => { loadCategories(); }, [api]);

  const changeDraft = (changes) => {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors({});
    setFormError("");
    setPendingRequest(null);
    setPeriodConflict(null);
  };

  const changeLines = (lines) => changeDraft({ lines });
  const changePlan = (planId) => changeDraft({
    plan_id: planId,
    lines: draft.lines.map((line) => ({ ...line, account_id: "", account: null, account_code: "", account_name: "" })),
  });

  const review = (event) => {
    event.preventDefault();
    const result = validateEntryDraft(draft);
    setErrors(result.errors);
    setFormError("");
    if (result.valid && totals.balanced) setReviewOpen(true);
  };

  const confirmCreate = async () => {
    if (submitting) return;
    const payload = toPayload(draft);
    const payloadText = JSON.stringify(payload);
    const idempotencyKey = pendingRequest?.payloadText === payloadText
      ? pendingRequest.idempotencyKey
      : globalThis.crypto.randomUUID();
    setPendingRequest({ payloadText, idempotencyKey });
    setSubmitting(true);
    setFormError("");
    try {
      const result = await api.createEntry(payload, idempotencyKey);
      setCreated(result);
      setReviewOpen(false);
      setPendingRequest(null);
    } catch (error) {
      setReviewOpen(false);
      if (error.code === "session_required") { setDraft({ operation_date: localDate(), plan_id: "", concept: "", detail: "", category_id: "", lines: [blankLine(), blankLine()] }); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (error.code === "forbidden") { setDraft({ operation_date: localDate(), plan_id: "", concept: "", detail: "", category_id: "", lines: [blankLine(), blankLine()] }); setPlans([]); setCategories([]); setCategoryState("error"); }
      if (error.status === 409 || error.code === "conflict") {
        let period = null;
        try {
          const year = draft.operation_date.slice(0, 4);
          const month = draft.operation_date.slice(5, 7);
          const result = await api.listPeriods({ from_period: `${year}-${month}`, to_period: `${year}-${month}`, limit: 1, offset: 0 });
          period = result?.items?.[0] ?? { year: Number(year), month: Number(month), status: "sin registro de periodo" };
        } catch { /* El conflicto sigue siendo claro aunque no se pueda refrescar la lista. */ }
        setPeriodConflict(period);
        setFormError("El asiento no se registró: el periodo o una cuenta cambió. Actualiza el estado antes de volver a intentarlo.");
        return;
      }
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="page accounting-page">
        <div className="jobtag jobtag--lg accounting-success">
          <span className="result__seal result__seal--ok"><CircleCheck size={24} aria-hidden="true" /></span>
          <p className="kicker">REGISTRO CONFIRMADO</p>
          <h1 className="title">Asiento N.º {created.entry_number}</h1>
          <p>{created.concept || draft.concept} · {created.operation_date || draft.operation_date} · {formatAccountingAmount(parseAccountingAmount(created.amount) ?? totals.debit)}</p>
          <p>Responsable: {created.responsible?.display_name || "Administrador"} · Estado: Confirmado</p>
          <div className="btn-row">
            <Link className="btn btn--primary" to={`/taller/contabilidad/${created.id}`}>Ver detalle</Link>
            <Link className="btn" to="/taller/contabilidad">Volver a Contabilidad</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page accounting-page">
      <BackLink to="/taller/contabilidad"><ArrowLeft size={15} aria-hidden="true" /> Contabilidad</BackLink>
      <div className="page-head">
        <div>
          <p className="kicker">REGISTRO INTERNO · PEN</p>
          <h1 className="title">Nuevo asiento</h1>
        </div>
      </div>
      <p className="muted">Al registrarlo quedará confirmado. No podrás editarlo ni eliminarlo; una corrección se registra mediante una reversión.</p>
      <FormAlert>{formError}</FormAlert>

      {categoryState === "loading" && <p className="empty" role="status">Cargando categorías y planes…</p>}
      {categoryState === "error" && (
        <div>
          <FormAlert>{categoryError}</FormAlert>
          <button type="button" className="btn" onClick={loadCategories}>Reintentar categorías</button>
        </div>
      )}

      {categoryState === "ready" && (
        <form className="accounting-form" onSubmit={review} noValidate aria-busy={submitting}>
          {planError && <FormAlert>{planError}</FormAlert>}
          <section className="jobtag accounting-section">
            <h2 className="subtitle">Datos del asiento</h2>
            <div className="grid-2">
              <Field label="Fecha de operación" htmlFor="operation-date" required error={errors.operation_date}>
                <input id="operation-date" type="date" className="input" value={draft.operation_date} disabled={submitting} onChange={(event) => changeDraft({ operation_date: event.target.value })} />
              </Field>
              <Field label="Plan contable" htmlFor="accounting-plan" required error={errors.plan_id}>
                <select id="accounting-plan" className="input" value={draft.plan_id} disabled={submitting || plans.length === 0} onChange={(event) => changePlan(event.target.value)}>
                  <option value="">Selecciona un plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.is_default ? " (predeterminado)" : ""}</option>)}
                </select>
              </Field>
              <Field label="Categoría" htmlFor="accounting-category" required error={errors.category_id}>
                <select id="accounting-category" className="input" value={draft.category_id} disabled={submitting} onChange={(event) => changeDraft({ category_id: event.target.value })}>
                  <option value="">Selecciona una categoría</option>
                  {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                </select>
              </Field>
              <Field label="Concepto" htmlFor="accounting-concept" required error={errors.concept}>
                <input id="accounting-concept" className="input" maxLength={200} value={draft.concept} disabled={submitting} onChange={(event) => changeDraft({ concept: event.target.value })} />
              </Field>
              <Field label="Detalle" htmlFor="accounting-detail" required error={errors.detail}>
                <textarea id="accounting-detail" className="input textarea" maxLength={4000} value={draft.detail} disabled={submitting} onChange={(event) => changeDraft({ detail: event.target.value })} />
              </Field>
            </div>
          </section>

          <EntryLinesEditor lines={draft.lines} onChange={changeLines} disabled={submitting} errors={errors.line_fields} totals={totals} planId={draft.plan_id} operationDate={draft.operation_date} onSessionExpired={() => navigate("/taller/acceso", { replace: true, state: { from: location.pathname } })} />
          {errors.lines && <p className="field__error" role="alert">{errors.lines}</p>}
          {errors.balance && <p className="field__error" role="alert">{errors.balance}</p>}
          <div className="accounting-form__actions">
            <button type="submit" className="btn btn--primary btn--lg" disabled={categories.length === 0 || plans.length === 0 || submitting}>
              {submitting ? <><LoaderCircle size={17} className="spin" aria-hidden="true" /> Guardando…</> : "Revisar y registrar"}
            </button>
            {pendingRequest && formError && <button type="button" className="btn" disabled={submitting} onClick={confirmCreate}>Reintentar registro</button>}
          </div>
        </form>
      )}
      {periodConflict && <div className="jobtag accounting-period-conflict" role="status"><strong>Estado actualizado: {String(periodConflict.year).padStart(4, "0")}-{String(periodConflict.month).padStart(2, "0")} · {periodConflict.status === "CLOSED" ? "Cerrado" : periodConflict.status === "OPEN" ? "Abierto" : periodConflict.status}</strong><span>El asiento no se guardó. Revisa la fecha, el periodo y las cuentas antes de reintentar.</span><Link to="/taller/contabilidad/periodos">Administrar periodos</Link></div>}

      <ConfirmDialog
        open={reviewOpen}
        title="Confirmar asiento contable"
        confirmLabel="Registrar asiento"
        busy={submitting}
        error={null}
        onConfirm={confirmCreate}
        onCancel={() => setReviewOpen(false)}
      >
        <div className="accounting-review">
          <p>Se guardará como confirmado y no se podrá editar ni borrar. Para corregirlo después tendrás que registrar una reversión.</p>
          <dl>
            <div><dt>Concepto</dt><dd>{draft.concept}</dd></div>
            <div><dt>Fecha</dt><dd>{draft.operation_date}</dd></div>
            <div><dt>Plan</dt><dd>{plans.find((plan) => String(plan.id) === String(draft.plan_id))?.name ?? "—"}</dd></div>
            <div><dt>Debe</dt><dd>{formatAccountingAmount(totals.debit)}</dd></div>
            <div><dt>Haber</dt><dd>{formatAccountingAmount(totals.credit)}</dd></div>
          </dl>
        </div>
      </ConfirmDialog>
    </div>
  );
}
