const MAX_WHOLE_DIGITS = 12;
const MAX_CENTS = 99999999999999n;
const AMOUNT_RE = new RegExp(`^(0|[1-9]\\d{0,${MAX_WHOLE_DIGITS - 1}})(?:\\.(\\d{0,2}))?$`);

export function parseAccountingAmount(value) {
  if (typeof value !== "string") return null;
  const match = AMOUNT_RE.exec(value.trim());
  if (!match) return null;
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const cents = whole * 100n + fraction;
  return cents <= MAX_CENTS ? cents : null;
}

export function formatAccountingDecimal(cents) {
  const value = typeof cents === "bigint" ? cents : BigInt(cents);
  if (value < 0n) throw new RangeError("El importe contable no puede ser negativo.");
  const whole = value / 100n;
  const fraction = String(value % 100n).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function formatAccountingAmount(cents) {
  const value = typeof cents === "bigint" ? cents : BigInt(cents);
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = (absolute / 100n).toLocaleString("en-US");
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${sign}S/. ${whole}.${fraction}`;
}

function amountOrZero(value) {
  if (value === "" || value === null || value === undefined) return 0n;
  return parseAccountingAmount(value);
}

export function calculateEntryTotals(lines = []) {
  let debit = 0n;
  let credit = 0n;
  let valid = lines.length >= 2 && lines.length <= 100;

  for (const line of lines) {
    const lineDebit = amountOrZero(line.debit);
    const lineCredit = amountOrZero(line.credit);
    if (lineDebit === null || lineCredit === null || (lineDebit > 0n) === (lineCredit > 0n)) {
      valid = false;
      continue;
    }
    debit += lineDebit;
    credit += lineCredit;
  }

  if (debit > MAX_CENTS || credit > MAX_CENTS) valid = false;
  return { debit, credit, valid, balanced: valid && debit > 0n && debit === credit };
}

export function validateEntryDraft(draft) {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(draft.operation_date ?? ""))) errors.operation_date = "Ingresa una fecha válida.";
  if (!String(draft.concept ?? "").trim() || String(draft.concept).length > 200) errors.concept = "El concepto es obligatorio y admite hasta 200 caracteres.";
  if (!String(draft.detail ?? "").trim() || String(draft.detail).length > 4000) errors.detail = "El detalle es obligatorio y admite hasta 4000 caracteres.";
  if (!Number.isInteger(Number(draft.category_id)) || Number(draft.category_id) < 1) errors.category_id = "Selecciona una categoría.";
  if (!Array.isArray(draft.lines) || draft.lines.length < 2 || draft.lines.length > 100) {
    errors.lines = "El asiento requiere entre 2 y 100 líneas.";
  } else {
    const lineErrors = draft.lines.map((line) => {
      const issues = {};
      if (!String(line.account_code ?? "").trim() || String(line.account_code).length > 40) issues.account_code = "El código admite entre 1 y 40 caracteres.";
      if (!String(line.account_name ?? "").trim() || String(line.account_name).length > 200) issues.account_name = "El nombre admite entre 1 y 200 caracteres.";
      if (String(line.description ?? "").length > 1000) issues.description = "La descripción admite hasta 1000 caracteres.";
      return issues;
    });
    if (lineErrors.some((entry) => Object.keys(entry).length)) errors.line_fields = lineErrors;
    const totals = calculateEntryTotals(draft.lines);
    if (!totals.valid) errors.lines = "Cada línea debe tener un importe positivo en debe o haber, nunca en ambos.";
    else if (!totals.balanced) errors.balance = "Los totales de debe y haber deben coincidir y ser mayores que cero.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
