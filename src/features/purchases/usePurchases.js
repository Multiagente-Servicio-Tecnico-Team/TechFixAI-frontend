import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { purchasesApi as defaultApi } from "./purchasesApi.js";

const PAGE_SIZE = 20;
const EMPTY_FILTERS = Object.freeze({ supplier_id: "", from_date: "", to_date: "", status: "", payment_status: "", document_number: "" });

function useSessionFailure(apiError, setError, navigate, location) {
  if (apiError?.code === "session_required") {
    setError("");
    navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
    return true;
  }
  return false;
}

export function usePurchases(api = defaultApi) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState({ ...EMPTY_FILTERS });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [listState, setListState] = useState(api.mode === "unconfigured" ? "unconfigured" : "loading");
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState([]);

  const loadList = useCallback(async (nextFilters, nextPage) => {
    setListState("loading");
    setError("");
    try {
      const response = await api.listPurchases({ ...nextFilters, limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
      setResult(response);
      setListState("ready");
    } catch (apiError) {
      if (useSessionFailure(apiError, setError, navigate, location)) return;
      setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      setError(apiError.message);
      setListState(apiError.code === "unconfigured" ? "unconfigured" : "error");
    }
  }, [api, navigate, location]);

  const loadSuppliers = useCallback(async () => {
    try {
      const response = await api.listSuppliers({ limit: 100, offset: 0 });
      setSuppliers(response.items ?? []);
    } catch (apiError) {
      if (apiError.code === "session_required") navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
      else setSuppliers([]);
    }
  }, [api, navigate, location]);

  useEffect(() => {
    if (api.mode === "unconfigured") {
      setListState("unconfigured");
      return;
    }
    loadList({ ...EMPTY_FILTERS }, 1);
    loadSuppliers();
  }, [api, loadList, loadSuppliers]);

  const applyFilters = (event) => {
    event?.preventDefault?.();
    const next = { ...filters };
    setApplied(next);
    setPage(1);
    loadList(next, 1);
  };
  const clearFilters = () => {
    const next = { ...EMPTY_FILTERS };
    setFilters(next);
    setApplied(next);
    setPage(1);
    loadList(next, 1);
  };
  const changePage = (nextPage) => {
    setPage(nextPage);
    loadList(applied, nextPage);
  };

  return {
    filters, setFilters, applied, page, result, listState, error, suppliers,
    applyFilters, clearFilters, changePage, reload: () => loadList(applied, page),
    pages: Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE))),
  };
}

export function usePurchaseDetail(purchaseId, api = defaultApi) {
  const navigate = useNavigate();
  const location = useLocation();
  const [purchase, setPurchase] = useState(null);
  const [state, setState] = useState(api.mode === "unconfigured" ? "unconfigured" : "loading");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (api.mode === "unconfigured") { setState("unconfigured"); return null; }
    setState("loading");
    setError("");
    try {
      const [response, receipts] = await Promise.all([api.getPurchase(purchaseId), api.listReceipts(purchaseId)]);
      setPurchase({ ...response, receipts });
      setState("ready");
      return response;
    } catch (apiError) {
      if (apiError.code === "session_required") {
        setPurchase(null);
        navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
        return null;
      }
      setPurchase(null);
      setError(apiError.message);
      setState(apiError.code === "not_found" ? "not-found" : apiError.code === "unconfigured" ? "unconfigured" : "error");
      return null;
    }
  }, [api, purchaseId, navigate, location]);

  useEffect(() => { reload(); }, [reload]);
  return { purchase, setPurchase, state, error, setError, reload };
}
