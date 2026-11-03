import { useCallback, useEffect, useRef, useState } from "react";
import { ticketsApi } from "./ticketsApi.js";

const API_PAGE_SIZE = 200;

async function listAll(filters) {
  let offset = 0;
  let total = Infinity;
  const unique = new Map();
  while (offset < total) {
    const page = await ticketsApi.listTickets({ ...filters, limit: API_PAGE_SIZE, offset });
    for (const item of page.items || []) unique.set(Number(item.id), ticketsApi.normalizeTicket(item));
    total = Number(page.total) || 0;
    const nextOffset = Number(page.offset ?? offset) + (page.items || []).length;
    if (nextOffset <= offset || !(page.items || []).length) break;
    offset = nextOffset;
  }
  return [...unique.values()];
}

export function useAdminTickets({ search = "", requestType = "", status = "", origin = "", enabled = true } = {}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [revision, setRevision] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = { search: debouncedSearch, request_type: requestType, status, origin };
  const reload = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    setErrorStatus(0);
    setTickets([]);
    try {
      const rows = await listAll(filters);
      if (current === requestId.current) setTickets(rows);
    } catch (e) {
      if (current === requestId.current) { setTickets([]); setErrorStatus(e.status || 0); setError(e.message || "No se pudo cargar el tablero."); }
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, requestType, status, origin, revision, enabled]);

  useEffect(() => { reload(); }, [reload]);

  const updateStatus = useCallback(async (ticketId, nextStatus) => {
    await ticketsApi.updateTicket(ticketId, { status: nextStatus });
    setRevision((value) => value + 1);
  }, []);

  return { tickets, loading, error, errorStatus, retry: reload, updateStatus };
}
