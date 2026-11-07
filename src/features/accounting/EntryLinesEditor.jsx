import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../shared/ui/ui.jsx";
import { formatAccountingAmount, parseAccountingAmount } from "../../domain/accounting.js";

function blankLine() {
  return { account_code: "", account_name: "", description: "", debit: "", credit: "" };
}

export default function EntryLinesEditor({ lines, onChange, disabled = false, errors = [], totals }) {
  const update = (index, field, value) => {
    onChange(lines.map((line, i) => {
      if (i !== index) return line;
      const next = { ...line, [field]: value };
      if (field === "debit" && parseAccountingAmount(value) > 0n) next.credit = "";
      if (field === "credit" && parseAccountingAmount(value) > 0n) next.debit = "";
      return next;
    }));
  };

  const remove = (index) => onChange(lines.filter((_, i) => i !== index));

  return (
    <section className="accounting-lines" aria-labelledby="accounting-lines-title">
      <div className="accounting-section-head">
        <div>
          <h2 id="accounting-lines-title" className="subtitle">Líneas contables</h2>
          <p className="muted small">Cada línea lleva un importe en debe o en haber.</p>
        </div>
        <button type="button" className="btn btn--sm" disabled={disabled || lines.length >= 100} onClick={() => onChange([...lines, blankLine()])}>
          <Plus size={16} aria-hidden="true" /> Añadir línea
        </button>
      </div>

      {lines.map((line, index) => {
        const lineError = errors[index] ?? {};
        const number = index + 1;
        return (
          <fieldset className="accounting-line" key={number} disabled={disabled}>
            <div className="accounting-line__head">
              <legend>Línea {number}</legend>
              <button type="button" className="icon-btn icon-btn--danger" aria-label={`Quitar línea ${number}`} disabled={disabled || lines.length <= 2} onClick={() => remove(index)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="grid-2">
              <Field label={`Código de cuenta, línea ${number}`} htmlFor={`account-code-${number}`} required error={lineError.account_code}>
                <input id={`account-code-${number}`} className="input" value={line.account_code} maxLength={40} onChange={(event) => update(index, "account_code", event.target.value)} />
              </Field>
              <Field label={`Nombre de cuenta, línea ${number}`} htmlFor={`account-name-${number}`} required error={lineError.account_name}>
                <input id={`account-name-${number}`} className="input" value={line.account_name} maxLength={200} onChange={(event) => update(index, "account_name", event.target.value)} />
              </Field>
              <Field label={`Descripción, línea ${number}`} htmlFor={`line-description-${number}`} error={lineError.description}>
                <input id={`line-description-${number}`} className="input" value={line.description} maxLength={1000} onChange={(event) => update(index, "description", event.target.value)} />
              </Field>
              <div className="accounting-line__amounts">
                <Field label={`Debe, línea ${number}`} htmlFor={`line-debit-${number}`}>
                  <input id={`line-debit-${number}`} className="input mono" inputMode="decimal" placeholder="0.00" value={line.debit} aria-invalid={Boolean(line.debit && line.credit) || undefined} onChange={(event) => update(index, "debit", event.target.value)} />
                </Field>
                <Field label={`Haber, línea ${number}`} htmlFor={`line-credit-${number}`}>
                  <input id={`line-credit-${number}`} className="input mono" inputMode="decimal" placeholder="0.00" value={line.credit} aria-invalid={Boolean(line.debit && line.credit) || undefined} onChange={(event) => update(index, "credit", event.target.value)} />
                </Field>
              </div>
            </div>
          </fieldset>
        );
      })}

      <div className={`accounting-totals${totals.balanced ? " accounting-totals--balanced" : ""}`} aria-live="polite">
        <span>Debe <strong>{formatAccountingAmount(totals.debit)}</strong></span>
        <span>Haber <strong>{formatAccountingAmount(totals.credit)}</strong></span>
        <span>{totals.balanced ? "Balanceado" : "Diferencia"} <strong>{formatAccountingAmount(totals.debit - totals.credit < 0n ? totals.credit - totals.debit : totals.debit - totals.credit)}</strong></span>
      </div>
    </section>
  );
}
