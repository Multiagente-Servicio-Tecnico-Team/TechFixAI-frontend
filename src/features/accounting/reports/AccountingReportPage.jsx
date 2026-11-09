import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { FormAlert } from "../../../shared/ui/FormAlert.jsx";
import { Pagination } from "../../../shared/ui/ui.jsx";
import ReportControls from "./ReportControls.jsx";
import ReportResults from "./ReportResults.jsx";
import { PAGE_SIZE } from "./reportUtils.js";
import { useAccountingReport } from "./useAccountingReport.js";

const labels = {
  journal: { title: "Diario", description: "Movimientos contables ordenados por fecha y asiento." },
  ledger: { title: "Mayor", description: "Movimientos y saldo acumulado de una cuenta contable." },
  trial_balance: { title: "Balance de comprobación", description: "Saldos de apertura, movimientos y saldos finales por cuenta." },
};

export default function AccountingReportPage({ kind }) {
  const meta = labels[kind];
  const report = useAccountingReport(kind);
  const pages = Math.max(1, Math.ceil(report.result.total / PAGE_SIZE));
  return <div className="page accounting-page">
    <Link className="back-link" to="/taller/contabilidad"><ArrowLeft size={16} aria-hidden="true" /> Contabilidad</Link>
    <div className="page-head"><div><p className="kicker">CONSULTAS INTERNAS · PEN</p><h1 className="title">{meta.title}</h1><p className="muted">{meta.description}</p></div></div>
    {report.plansError && <div><FormAlert>{report.plansError}</FormAlert><button type="button" className="btn" onClick={report.loadPlans}>Reintentar planes</button></div>}
    <ReportControls kind={kind} filters={report.filters} setFilters={report.setFilters} plans={report.plans} applied={report.applied} onApply={report.apply} onExport={report.exportReport} exporting={report.exporting} exportError={report.exportError} />
    {report.state === "idle" && <p className="jobtag empty">Elige el rango y los filtros, luego consulta el informe.</p>}
    {report.state === "loading" && <p className="empty" role="status">Consultando informe…</p>}
    {report.state === "error" && <div><FormAlert>{report.error}</FormAlert><button type="button" className="btn" onClick={report.load}>Reintentar</button></div>}
    {report.state === "ready" && <><ReportResults kind={kind} result={report.result} /><Pagination page={report.page} pages={pages} onChange={report.changePage} label={`Página ${report.page} de ${pages}`} /></>}
  </div>;
}
