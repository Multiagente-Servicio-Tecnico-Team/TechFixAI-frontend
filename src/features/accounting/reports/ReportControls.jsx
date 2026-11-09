import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileDown, Search } from "lucide-react";
import { Field } from "../../../shared/ui/ui.jsx";
import { FormAlert } from "../../../shared/ui/FormAlert.jsx";
import { accountingApi } from "../accountingApi.js";

const reportLinks = [
  ["journal", "/taller/contabilidad/informes/diario", "Diario"],
  ["ledger", "/taller/contabilidad/informes/mayor", "Mayor"],
  ["trial_balance", "/taller/contabilidad/informes/balance", "Balance de comprobación"],
];

export default function ReportControls({ kind, filters, setFilters, plans, applied, onApply, onExport, exporting, exportError }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [localError, setLocalError] = useState("");
  const [accountMode, setAccountMode] = useState("catalog");
  const [accountPlanId, setAccountPlanId] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [accountState, setAccountState] = useState("idle");
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    if (kind !== "ledger" || !accountPlanId || accountQuery.trim().length < 1) { setAccounts([]); setAccountState("idle"); return undefined; }
    let current = true;
    setAccountState("loading"); setAccountError("");
    const timer = setTimeout(async () => {
      try {
        const response = await accountingApi.listAccounts(accountPlanId, { q: accountQuery.trim(), limit: 50, offset: 0 });
        if (current) { setAccounts(response?.items ?? []); setAccountState("ready"); }
      } catch (cause) {
        if (current && cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
        if (current && cause.code === "forbidden") setAccounts([]);
        if (current) { setAccountError(cause.message); setAccountState("error"); }
      }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [accountPlanId, accountQuery, kind, location.pathname, navigate]);

  const selected = accounts.find((account) => String(account.id) === String(filters.account_id));
  const hasUnappliedChanges = Boolean(applied && Object.keys({ ...filters, ...applied }).some((key) => String(filters[key] ?? "") !== String(applied[key] ?? "")));
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault(); setLocalError("");
    if (!filters.from_date || !filters.to_date || filters.from_date > filters.to_date) { setLocalError("Indica un rango válido: la fecha inicial debe ser anterior o igual a la final."); return; }
    if (kind === "ledger" && accountMode === "catalog" && !filters.account_id) { setLocalError("Selecciona una cuenta del catálogo."); return; }
    if (kind === "ledger" && accountMode === "legacy" && (!filters.account_code.trim() || !filters.account_name.trim())) { setLocalError("Para consultar una línea histórica, indica su código y nombre exactos."); return; }
    onApply({ ...filters, account_id: kind === "ledger" && accountMode === "catalog" ? filters.account_id : "", account_code: kind === "ledger" && accountMode === "legacy" ? filters.account_code.trim() : "", account_name: kind === "ledger" && accountMode === "legacy" ? filters.account_name.trim() : "" });
  };

  return <>
    <nav className="accounting-shortcuts" aria-label="Tipos de informe">{reportLinks.map(([type, to, label]) => <Link key={to} className={`btn${type === kind ? " btn--primary" : ""}`} to={to}>{label}</Link>)}</nav>
    <form className="jobtag accounting-filters accounting-report-filters" onSubmit={submit}>
      <div className="grid-2">
        <Field label="Desde" htmlFor={`${kind}-from`} required><input className="input" id={`${kind}-from`} type="date" value={filters.from_date} max={filters.to_date || undefined} onChange={(e) => change("from_date", e.target.value)} /></Field>
        <Field label="Hasta" htmlFor={`${kind}-to`} required><input className="input" id={`${kind}-to`} type="date" value={filters.to_date} min={filters.from_date || undefined} onChange={(e) => change("to_date", e.target.value)} /></Field>
        <Field label="Estado del asiento" htmlFor={`${kind}-status`}><select className="input" id={`${kind}-status`} value={filters.status} onChange={(e) => change("status", e.target.value)}><option value="">Todos</option><option value="CONFIRMED">Confirmado</option><option value="REVERSED">Revertido</option></select></Field>
        {kind !== "ledger" && <Field label="Plan contable" htmlFor={`${kind}-plan`}><select className="input" id={`${kind}-plan`} value={filters.plan_id} onChange={(e) => change("plan_id", e.target.value)}><option value="">Todos los planes</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></Field>}
      </div>
      {kind === "ledger" && <fieldset className="accounting-ledger-source"><legend>Cuenta del mayor</legend>
        <label className="accounting-radio"><input type="radio" name="ledger-account-mode" checked={accountMode === "catalog"} onChange={() => { setAccountMode("catalog"); change("account_code", ""); change("account_name", ""); }} /> Cuenta del catálogo</label>
        {accountMode === "catalog" ? <div className="grid-2">
          <Field label="Plan de la cuenta" htmlFor="ledger-account-plan"><select className="input" id="ledger-account-plan" value={accountPlanId} onChange={(e) => { setAccountPlanId(e.target.value); change("account_id", ""); setAccountQuery(""); }}><option value="">Selecciona un plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></Field>
          <Field label="Buscar cuenta" htmlFor="ledger-account-query"><input className="input" id="ledger-account-query" type="search" maxLength={120} value={accountQuery} onChange={(e) => setAccountQuery(e.target.value)} placeholder="Código o denominación" /></Field>
          <Field label="Cuenta" htmlFor="ledger-account-select"><select className="input" id="ledger-account-select" value={filters.account_id} onChange={(e) => { const account = accounts.find((item) => String(item.id) === e.target.value); change("account_id", e.target.value); if (account) { change("account_code", account.code); change("account_name", account.name); } }}><option value="">{accountState === "loading" ? "Buscando…" : "Selecciona una cuenta"}</option>{selected && <option value={selected.id}>{selected.code} · {selected.name}</option>}{accounts.filter((account) => String(account.id) !== String(filters.account_id)).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></Field>
          <p className="muted small" role="status">{accountState === "idle" ? "Escribe para buscar en el catálogo." : accountState === "ready" && !accounts.length ? "No hay cuentas coincidentes." : accountState === "error" ? accountError : ""}</p>
        </div> : null}
        <label className="accounting-radio"><input type="radio" name="ledger-account-mode" checked={accountMode === "legacy"} onChange={() => { setAccountMode("legacy"); change("account_id", ""); }} /> Línea histórica sin vínculo al catálogo</label>
        {accountMode === "legacy" && <div className="grid-2"><Field label="Código histórico exacto" htmlFor="ledger-legacy-code" required><input className="input" id="ledger-legacy-code" maxLength={40} value={filters.account_code} onChange={(e) => change("account_code", e.target.value)} /></Field><Field label="Nombre histórico exacto" htmlFor="ledger-legacy-name" required><input className="input" id="ledger-legacy-name" maxLength={200} value={filters.account_name} onChange={(e) => change("account_name", e.target.value)} /></Field></div>}
      </fieldset>}
      <FormAlert>{localError}</FormAlert>
      <div className="btn-row"><button className="btn btn--primary" type="submit"><Search size={15} aria-hidden="true" /> Consultar</button><button className="btn" type="button" disabled={!applied || hasUnappliedChanges || Boolean(exporting)} onClick={() => onExport("csv")}><FileDown size={15} aria-hidden="true" /> {exporting === "csv" ? "Descargando CSV…" : "Exportar CSV"}</button><button className="btn" type="button" disabled={!applied || hasUnappliedChanges || Boolean(exporting)} onClick={() => onExport("xlsx")}><FileDown size={15} aria-hidden="true" /> {exporting === "xlsx" ? "Descargando XLSX…" : "Exportar XLSX"}</button></div>
      {hasUnappliedChanges && <p className="muted small">Consulta nuevamente para aplicar los cambios antes de exportar.</p>}
      {exportError && <FormAlert>{exportError}</FormAlert>}
    </form>
  </>;
}
