import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { clientTickets, parts, staffTickets } from "./demoData.js";
import { readSession, writeSession } from "./session.js";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

function reducer(state, action) {
  switch (action.type) {
    case "login":
      return { ...state, session: action.session, signedOut: false };
    case "logout":
      // signedOut distingue un cierre de sesión voluntario de un acceso sin sesión o de una sesión vencida.
      return { ...state, session: null, signedOut: action.voluntary !== false };
    case "clearSignedOut":
      return state.signedOut ? { ...state, signedOut: false } : state;
    case "createTicket": {
      const next = Math.max(...state.staffTickets.map((t) => Number(t.id.split("-")[1]))) + 1;
      const ticket = { ...action.ticket, id: `TCK-${next}`, date: today(), status: "Nuevo", origin: "Presencial", budget: null };
      return { ...state, staffTickets: [ticket, ...state.staffTickets] };
    }
    case "updateTicket":
      return {
        ...state,
        staffTickets: state.staffTickets.map((t) => (t.id === action.id ? { ...t, ...action.changes } : t)),
      };
    case "createConsultation": {
      // Consulta nueva desde el chat: crea el ticket del cliente y lo envía a la cola del taller.
      const ids = [...state.staffTickets, ...state.clientTickets].map((t) => Number(t.id.split("-")[1]));
      const id = action.id || `TCK-${Math.max(...ids) + 1}`;
      const { summary, client } = action;
      const device = action.device || "Equipo por confirmar";
      return {
        ...state,
        lastConsultation: id,
        clientTickets: [
          { id, when: "Hoy", kind: "Consulta", device, icon: "laptop", summary, status: "received", lines: [], total: null },
          ...state.clientTickets,
        ],
        staffTickets: [
          { id, date: today(), client: client.name, phone: "Por confirmar", email: client.email, device, issue: summary, category: "Reparación", budget: null, status: "Nuevo", origin: "Bot", payment: "Pendiente", advance: null, method: null },
          ...state.staffTickets,
        ],
      };
    }
    case "approveBudget":
      return {
        ...state,
        clientTickets: state.clientTickets.map((t) => (t.id === action.id ? { ...t, status: "workshop" } : t)),
        staffTickets: state.staffTickets.map((t) => (t.id === action.id ? { ...t, payment: "Aprobado por el cliente" } : t)),
      };
    case "savePart": {
      const exists = state.parts.some((p) => p.sku === action.part.sku);
      return {
        ...state,
        parts: exists
          ? state.parts.map((p) => (p.sku === action.part.sku ? { ...p, ...action.part } : p))
          : [{ icon: "chip", ...action.part }, ...state.parts],
      };
    }
    case "deletePart":
      return { ...state, parts: state.parts.filter((p) => p.sku !== action.sku) };
    case "setParts":
      return { ...state, parts: action.parts };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({ staffTickets, clientTickets, parts, session: readSession() }));

  const login = useCallback((session) => {
    writeSession(session);
    dispatch({ type: "login", session });
  }, []);

  /** `voluntary: false` cuando el servidor dio la sesión por terminada: se pide acceso y se vuelve a la página. */
  const logout = useCallback(({ voluntary = true } = {}) => {
    writeSession(null);
    dispatch({ type: "logout", voluntary });
  }, []);

  const value = useMemo(() => ({ ...state, dispatch, login, logout }), [state, login, logout]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
