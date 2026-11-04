import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../state/store.jsx";
import { ticketsApi } from "./ticketsApi.js";

export function useTickets({ api = ticketsApi, id, load = true } = {}) {
  const { staffTickets, pendingCreatedStaffTicketIds, confirmedStaffTicketStatuses, dispatch } = useStore();
  const live = api.mode === "api";
  const [result, setResult] = useState({ status: live && load ? "loading" : "ready", error: "", id });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!live || !load) return undefined;
    let active = true;
    setResult({ status: "loading", error: "", id });
    (async () => {
      try {
        const data = id ? await api.get(id) : await api.list();
        if (!active) return;
        dispatch(id ? { type: "receiveStaffTicket", ticket: data } : { type: "setStaffTickets", tickets: data });
        setResult({ status: "ready", error: "", id });
      } catch (err) {
        if (active) setResult({ status: err.status === 404 && id ? "notFound" : "error", error: err.message, id });
      }
    })();
    return () => { active = false; };
  }, [api, live, load, id, revision, dispatch]);

  const nextId = `TCK-${Math.max(0, ...staffTickets.map((ticket) => Number(ticket.id.split("-")[1]) || 0)) + 1}`;
  const create = async (ticket) => {
    if (!live) {
      dispatch({ type: "createTicket", ticket });
      return { ...ticket, id: nextId };
    }
    const saved = await api.create(ticket);
    dispatch({ type: "saveStaffTicket", ticket: saved, created: true });
    return saved;
  };
  const updateStatus = async (ticketId, status) => {
    const saved = live ? await api.updateStatus(ticketId, status) : { ...staffTickets.find((ticket) => ticket.id === ticketId), status };
    dispatch({ type: "saveStaffTicket", ticket: saved, updated: live });
    return saved;
  };

  const status = live && load && result.id !== id ? "loading" : result.status;
  const visible = !live || !load || status === "ready";
  return {
    tickets: visible ? staffTickets : !id
      ? staffTickets.filter((ticket) => pendingCreatedStaffTicketIds.includes(ticket.id) || confirmedStaffTicketStatuses[ticket.id])
      : [],
    ticket: visible ? staffTickets.find((ticket) => ticket.id === id) : null,
    status, error: result.error, reload, create, updateStatus, live, nextId,
  };
}
