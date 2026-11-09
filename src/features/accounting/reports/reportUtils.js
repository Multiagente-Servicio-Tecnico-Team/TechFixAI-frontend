import { formatAccountingAmount, parseAccountingAmount } from "../../../domain/accounting.js";

export const PAGE_SIZE = 50;
export const today = () => new Date().toISOString().slice(0, 10);
export const beginningOfYear = () => `${new Date().getFullYear()}-01-01`;
export const reportMoney = (value) => {
  if (typeof value !== "string" || !/^\d{1,12}\.\d{2}$/.test(value)) return value ?? "—";
  return formatAccountingAmount(parseAccountingAmount(value) ?? 0n);
};

export const REPORT_COLUMNS = {
  journal: ["operation_date", "entry_number", "concept", "line_number", "account_code", "account_name", "description", "debit", "credit", "status"],
  ledger: ["operation_date", "entry_number", "line_number", "account_code", "account_name", "description", "debit", "credit", "running_balance", "status"],
  trial_balance: ["account_code", "account_name", "opening_debit", "opening_credit", "debit", "credit", "closing_debit", "closing_credit"],
};

export const REPORT_LABELS = {
  operation_date: "Fecha", entry_number: "Asiento", entry_id: "ID asiento", concept: "Concepto", line_number: "Línea",
  account_code: "Código", account_name: "Cuenta", description: "Descripción", debit: "Debe", credit: "Haber",
  running_balance: "Saldo acumulado", opening_balance: "Saldo inicial", closing_balance: "Saldo final",
  opening_debit: "Saldo inicial debe", opening_credit: "Saldo inicial haber", closing_debit: "Saldo final debe", closing_credit: "Saldo final haber",
  status: "Estado", legacy_unlinked: "Cuenta histórica no vinculada",
};

export const reportStatus = (value) => value === "CONFIRMED" ? "Confirmado" : value === "REVERSED" ? "Revertido" : value ?? "—";
