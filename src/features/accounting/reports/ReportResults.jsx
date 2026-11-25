import { REPORT_COLUMNS, REPORT_LABELS, reportMoney, reportStatus } from "./reportUtils.js";

const moneyKeys = new Set(["debit", "credit", "running_balance", "opening_balance", "closing_balance", "opening_debit", "opening_credit", "closing_debit", "closing_credit"]);

function cellValue(row, key) {
  if (moneyKeys.has(key)) return reportMoney(row[key]);
  if (key === "status") return reportStatus(row[key]);
  if (key === "legacy_unlinked") return row[key] ? "Histórica · no vinculada" : "—";
  if (key === "operation_date" && row[key]) return row[key];
  return row[key] ?? "—";
}

export default function ReportResults({ kind, result }) {
  const columns = REPORT_COLUMNS[kind] ?? [];
  const totals = result?.totals ?? {};
  return <section className="accounting-section" aria-live="polite">
    <div className="accounting-card__top"><h2 className="subtitle">Resultados</h2><span className="muted">{result?.total ?? 0} {result?.total === 1 ? "fila" : "filas"} · {result?.from_date} a {result?.to_date}</span></div>
    {kind === "ledger" && <dl className="accounting-summary"><div><dt>Saldo inicial</dt><dd>{reportMoney(result.opening_balance)}</dd></div><div><dt>Saldo final</dt><dd>{reportMoney(result.closing_balance)}</dd></div></dl>}
    <div className="accounting-totals accounting-report-totals">{Object.entries(totals).map(([key, value]) => <span key={key}>{REPORT_LABELS[key] ?? key} <strong>{reportMoney(value)}</strong></span>)}</div>
    {!result?.items?.length ? <div className="jobtag empty">No hay movimientos para los filtros aplicados.</div> : <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr>{columns.map((key) => <th key={key}>{REPORT_LABELS[key] ?? key}</th>)}</tr></thead><tbody>{result.items.map((row, index) => <tr key={`${row.entry_id ?? row.account_id ?? row.account_code ?? "row"}-${row.line_number ?? index}-${index}`}>{columns.map((key) => <td data-label={REPORT_LABELS[key] ?? key} key={key}>{cellValue(row, key)}{key === "account_name" && (row.account_id == null || row.legacy_unlinked) && <span className="accounting-legacy-badge">Histórica · no vinculada</span>}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}
