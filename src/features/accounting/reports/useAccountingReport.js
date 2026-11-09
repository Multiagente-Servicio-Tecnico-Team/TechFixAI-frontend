import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { accountingApi as defaultApi } from "../accountingApi.js";
import { PAGE_SIZE, beginningOfYear, today } from "./reportUtils.js";

const initialFilters = () => ({ from_date: beginningOfYear(), to_date: today(), plan_id: "", status: "", account_id: "", account_code: "", account_name: "" });

export function useAccountingReport(kind, api = defaultApi) {
  const navigate = useNavigate();
  const location = useLocation();
  const [plans, setPlans] = useState([]);
  const [plansError, setPlansError] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0, totals: {} });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState("");

  const loadPlans = useCallback(async () => {
    setPlansError("");
    try { const response = await api.listPlans(); setPlans(response?.items ?? []); }
    catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setPlans([]);
      setPlansError(cause.message);
    }
  }, [api, location.pathname, navigate]);
  useEffect(() => { loadPlans(); }, [loadPlans]);

  const run = useCallback(async (query, nextPage = 1) => {
    setState("loading"); setError("");
    try {
      const method = kind === "journal" ? api.getJournal : kind === "ledger" ? api.getLedger : api.getTrialBalance;
      const data = await method({ ...query, format: "json", limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult({ ...data, items: data?.items ?? [], total: data?.total ?? 0, limit: data?.limit ?? PAGE_SIZE, offset: data?.offset ?? 0 }); setState("ready");
    } catch (cause) {
      if (cause.code === "session_required") { setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0, totals: {} }); navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0, totals: {} });
      setError(cause.message); setState("error");
    }
  }, [api, kind, location.pathname, navigate]);

  const apply = (nextFilters) => {
    const query = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value !== "" && value != null));
    setFilters(nextFilters); setApplied(query); setPage(1); setExportError(""); run(query, 1);
  };
  const changePage = (nextPage) => { setPage(nextPage); run(applied, nextPage); };

  const exportReport = async (format) => {
    if (!applied || exporting) return;
    setExporting(format); setExportError("");
    try {
      const method = kind === "journal" ? api.getJournal : kind === "ledger" ? api.getLedger : api.getTrialBalance;
      const file = await method({ ...applied, format });
      if (!file?.blob || file.blob.type.includes("json")) throw new Error("El servidor no devolvió un archivo de informe.");
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a"); link.href = url; link.download = file.filename || `${kind}-${applied.from_date}-${applied.to_date}.${format}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      if (cause.code === "session_required") { navigate("/taller/acceso", { replace: true, state: { from: location.pathname } }); return; }
      if (cause.code === "forbidden") setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0, totals: {} });
      setExportError(cause.message || "No se pudo descargar el informe.");
    } finally { setExporting(""); }
  };

  return { plans, plansError, filters, setFilters, applied, page, result, state, error, exportError, exporting, apply, loadPlans, load: () => applied && run(applied, page), changePage, exportReport };
}
