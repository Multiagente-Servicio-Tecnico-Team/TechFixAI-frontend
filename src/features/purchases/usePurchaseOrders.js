import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { purchasesApi as defaultApi } from "./purchasesApi.js";

const PAGE_SIZE = 20;
const EMPTY_FILTERS = Object.freeze({ supplier_id: "", status: "", date_from: "", date_to: "" });

function redirectIfSessionExpired(error, navigate, location) {
  if (error?.code !== "session_required") return false;
  navigate("/taller/acceso", { replace: true, state: { from: location.pathname } });
  return true;
}

export function usePurchaseOrders(api = defaultApi, { loadOnMount = true } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState({ ...EMPTY_FILTERS });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [state, setState] = useState(api.mode === "unconfigured" ? "unconfigured" : "loading");
  const [error, setError] = useState("");

  const loadList = useCallback(async (nextFilters, nextPage) => {
    if (api.mode === "unconfigured") {
      setState("unconfigured");
      return null;
    }
    setState("loading");
    setError("");
    try {
      const data = await api.listPurchaseOrders({
        ...nextFilters,
        limit: PAGE_SIZE,
        offset: (nextPage - 1) * PAGE_SIZE,
      });
      setResult(data);
      setState("ready");
      return data;
    } catch (apiError) {
      if (redirectIfSessionExpired(apiError, navigate, location)) return null;
      setResult({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 });
      setError(apiError.message);
      setState(apiError.code === "unconfigured" ? "unconfigured" : "error");
      return null;
    }
  }, [api, navigate, location]);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await api.listSuppliers({ active: true, limit: 100, offset: 0 });
      setSuppliers((data.items ?? []).filter((supplier) => supplier.active !== false));
    } catch (apiError) {
      if (redirectIfSessionExpired(apiError, navigate, location)) return;
      setSuppliers([]);
    }
  }, [api, navigate, location]);

  useEffect(() => {
    if (!loadOnMount) return;
    if (api.mode === "unconfigured") {
      setState("unconfigured");
      return;
    }
    loadList({ ...EMPTY_FILTERS }, 1);
    loadSuppliers();
  }, [api, loadList, loadSuppliers, loadOnMount]);

  const applyFilters = async (event) => {
    event?.preventDefault?.();
    const next = { ...filters };
    setApplied(next);
    setPage(1);
    return loadList(next, 1);
  };

  const clearFilters = () => {
    const next = { ...EMPTY_FILTERS };
    setFilters(next);
    setApplied(next);
    setPage(1);
    return loadList(next, 1);
  };

  const changePage = (nextPage) => {
    const bounded = Math.min(Math.max(1, nextPage), Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE))));
    setPage(bounded);
    return loadList(applied, bounded);
  };

  const createOrder = async (payload) => api.createPurchaseOrder(payload);

  return {
    filters,
    setFilters,
    applied,
    page,
    result,
    suppliers,
    state,
    error,
    applyFilters,
    clearFilters,
    changePage,
    createOrder,
    reload: () => loadList(applied, page),
    pages: Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE))),
  };
}

export function usePurchaseOrderDetail(orderId, api = defaultApi) {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState(api.mode === "unconfigured" ? "unconfigured" : "loading");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!orderId) {
      setState("idle");
      return null;
    }
    if (api.mode === "unconfigured") {
      setState("unconfigured");
      return null;
    }
    setState("loading");
    setError("");
    try {
      const data = await api.getPurchaseOrder(orderId);
      setOrder(data);
      setState("ready");
      return data;
    } catch (apiError) {
      if (redirectIfSessionExpired(apiError, navigate, location)) {
        setOrder(null);
        return null;
      }
      setOrder(null);
      setError(apiError.message);
      setState(apiError.code === "not_found" ? "not-found" : apiError.code === "unconfigured" ? "unconfigured" : "error");
      return null;
    }
  }, [api, orderId, navigate, location]);

  useEffect(() => { reload(); }, [reload]);
  return { order, setOrder, state, error, setError, reload };
}
