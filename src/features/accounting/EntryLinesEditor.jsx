import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../shared/ui/ui.jsx";
import { FormAlert } from "../../shared/ui/FormAlert.jsx";
import { formatAccountingAmount, isAccountingAccountValidForDate, parseAccountingAmount } from "../../domain/accounting.js";
import { accountingApi } from "./accountingApi.js";

function blankLine() {
  return { account_id: "", account: null, account_code: "", account_name: "", description: "", debit: "", credit: "" };
}

function AccountPicker({ line, lineNumber, planId, operationDate, disabled, error, onSelect, onSessionExpired }) {
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!planId) { setAccounts([]); setState("idle"); return undefined; }
    let active = true;
    setState("loading"); setMessage("");
    const timer = setTimeout(async () => {
      try {
        const data = await accountingApi.listAccounts(planId, { q: query.trim() || undefined, status: "ACTIVE", postable: true, limit: 50, offset: 0 });
        if (!active) return;
        setAccounts((data?.items ?? []).filter((account) => isAccountingAccountValidForDate(account, operationDate)));
        setState("ready");
      } catch (cause) {
        if (!active) return;
        if (cause.code === "session_required") { onSessionExpired?.(); return; }
        if (cause.code === "forbidden") setAccounts([]);
        setMessage(cause.message || "No se pudieron buscar cuentas."); setState("error");
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [operationDate, planId, query]);

  const available = line.account && !accounts.some((account) => Number(account.id) === Number(line.account.id)) ? [line.account, ...accounts] : accounts;
  return <>
    <Field label={`Buscar cuenta, línea ${lineNumber}`} htmlFor={`account-search-${lineNumber}`} required error={error}>
      <input id={`account-search-${lineNumber}`} className="input" type="search" maxLength={120} value={query} disabled={disabled || !planId} placeholder="Código o denominación" onChange={(event) => setQuery(event.target.value)} aria-describedby={`account-search-status-${lineNumber}`} />
      <select className="input accounting-account-select" aria-label={`Cuenta contable, línea ${lineNumber}`} value={line.account_id || ""} disabled={disabled || !planId} onChange={(event) => onSelect(available.find((account) => String(account.id) === event.target.value) ?? null)}>
        <option value="">{state === "loading" ? "Buscando…" : "Selecciona una cuenta"}</option>
        {available.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
      </select>
    </Field>
    <span id={`account-search-status-${lineNumber}`} className="muted small" role="status">
      {state === "idle" && "Selecciona un plan contable para consultar sus cuentas."}
      {state === "ready" && !accounts.length && (query.trim() ? "No hay cuentas activas, imputables y vigentes que coincidan con la búsqueda para esta fecha." : "El plan no tiene cuentas activas, imputables y vigentes para esta fecha.")}
      {state === "ready" && accounts.length > 0 && `${accounts.length} ${accounts.length === 1 ? "cuenta disponible" : "cuentas disponibles"}${query.trim() ? " para la búsqueda" : " en el plan"}. Puedes filtrar por código o denominación.`}
      {state === "error" && message}
    </span>
    {line.account && <p className="accounting-account-selected">Cuenta seleccionada: <strong>{line.account.code} · {line.account.name}</strong></p>}
  </>;
}

export default function EntryLinesEditor({ lines, onChange, disabled = false, errors = [], totals, planId, operationDate, onSessionExpired }) {
  const update = (index, field, value) => {
    onChange(lines.map((line, i) => {
      if (i !== index) return line;
      const next = { ...line, [field]: value };
      if (field === "debit" && parseAccountingAmount(value) > 0n) next.credit = "";
      if (field === "credit" && parseAccountingAmount(value) > 0n) next.debit = "";
      return next;
    }));
  };
  const selectAccount = (index, account) => onChange(lines.map((line, i) => i === index
    ? {
      ...line,
      account_id: account ? String(account.id) : "",
      account,
      account_code: account?.code ?? "",
      account_name: account?.name ?? "",
      description: account?.parent_name?.trim() || account?.name || "",
    }
    : line));
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));

  return <section className="accounting-lines" aria-labelledby="accounting-lines-title">
    <div className="accounting-section-head"><div><h2 id="accounting-lines-title" className="subtitle">Líneas contables</h2><p className="muted small">Cada línea lleva una cuenta del plan y un importe en debe o haber.</p></div>
      <button type="button" className="btn btn--sm" disabled={disabled || lines.length >= 100} onClick={() => onChange([...lines, blankLine()])}><Plus size={16} aria-hidden="true" /> Añadir línea</button>
    </div>
    {!planId && <FormAlert>Selecciona un plan contable antes de elegir las cuentas.</FormAlert>}
    {lines.map((line, index) => {
      const lineError = errors[index] ?? {};
      const number = index + 1;
      return <fieldset className="accounting-line" key={number} disabled={disabled}>
        <div className="accounting-line__head"><legend>Línea {number}</legend><button type="button" className="icon-btn icon-btn--danger" aria-label={`Quitar línea ${number}`} disabled={disabled || lines.length <= 2} onClick={() => remove(index)}><Trash2 size={16} aria-hidden="true" /></button></div>
        <div className="grid-2">
          <div className="accounting-account-picker"><AccountPicker line={line} lineNumber={number} planId={planId} operationDate={operationDate} disabled={disabled} error={lineError.account_id} onSelect={(account) => selectAccount(index, account)} onSessionExpired={onSessionExpired} /></div>
          <Field label={`Descripción, línea ${number}`} htmlFor={`line-description-${number}`} error={lineError.description}><input id={`line-description-${number}`} className="input" value={line.description} maxLength={1000} onChange={(event) => update(index, "description", event.target.value)} /></Field>
          <div className="accounting-line__amounts">
            <Field label={`Debe, línea ${number}`} htmlFor={`line-debit-${number}`}><input id={`line-debit-${number}`} className="input mono" inputMode="decimal" placeholder="0.00" value={line.debit} aria-invalid={Boolean(line.debit && line.credit) || undefined} onChange={(event) => update(index, "debit", event.target.value)} /></Field>
            <Field label={`Haber, línea ${number}`} htmlFor={`line-credit-${number}`}><input id={`line-credit-${number}`} className="input mono" inputMode="decimal" placeholder="0.00" value={line.credit} aria-invalid={Boolean(line.debit && line.credit) || undefined} onChange={(event) => update(index, "credit", event.target.value)} /></Field>
          </div>
        </div>
      </fieldset>;
    })}
    <div className={`accounting-totals${totals.balanced ? " accounting-totals--balanced" : ""}`} aria-live="polite">
      <span>Debe <strong>{formatAccountingAmount(totals.debit)}</strong></span><span>Haber <strong>{formatAccountingAmount(totals.credit)}</strong></span><span>{totals.balanced ? "Balanceado" : "Diferencia"} <strong>{formatAccountingAmount(totals.debit - totals.credit < 0n ? totals.credit - totals.debit : totals.debit - totals.credit)}</strong></span>
    </div>
  </section>;
}
