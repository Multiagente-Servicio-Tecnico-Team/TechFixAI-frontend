import { STAFF_STATUSES, TICKET_CATEGORIES } from "../../domain/tickets.js";

export const TICKET_MESSAGES = {
  unavailable: "No se pudo conectar con los tickets. Inténtalo de nuevo.",
  notFound: "Este ticket no existe en el taller.",
  session: "Tu sesión terminó. Inicia sesión otra vez para gestionar los tickets.",
  forbidden: "Solo el personal del taller puede gestionar los tickets.",
  invalid: "Revisa los datos del ticket.",
  contract: "La API devolvió un ticket con un formato inesperado.",
  mismatch: "La API no confirmó los datos enviados. Revisa la configuración del mock.",
  updateNotFound: "No se encontró el ticket al intentar actualizarlo.",
};

export class TicketsError extends Error {
  constructor(message, { status = 0, code = "error" } = {}) {
    super(message);
    this.name = "TicketsError";
    this.status = status;
    this.code = code;
  }
}

const textFields = ["id", "date", "client", "phone", "email", "device", "issue", "payment"];
const createFields = ["client", "phone", "email", "device", "issue", "category", "advance", "method", "payment"];
const isMoney = (value) => value === null || (Number.isSafeInteger(value) && value >= 0);

// El mock usa directamente el modelo de la pantalla, con importes en céntimos.
function ticketFromApi(ticket) {
  if (!ticket || Array.isArray(ticket) ||
      !textFields.every((key) => typeof ticket[key] === "string") || !ticket.id ||
      !TICKET_CATEGORIES.includes(ticket.category) || !STAFF_STATUSES.includes(ticket.status) ||
      !["Bot", "Presencial"].includes(ticket.origin) ||
      !isMoney(ticket.budget) || !isMoney(ticket.advance) ||
      !(ticket.method === null || ["Yape/Plin", "Efectivo", "Tarjeta"].includes(ticket.method))) {
    throw new TicketsError(TICKET_MESSAGES.contract, { code: "contract" });
  }
  return ticket;
}

export function createTicketsApi({ baseUrl = "", fetchImpl } = {}) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path = "", { method = "GET", body } = {}) {
    let res;
    try {
      res = await doFetch(`${base}/tickets${path}`, {
        method,
        credentials: "include",
        headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new TicketsError(TICKET_MESSAGES.unavailable, { code: "network" });
    }
    if (!res.ok) {
      if (method === "PATCH" && res.status === 404) {
        throw new TicketsError(TICKET_MESSAGES.updateNotFound, { status: 404, code: "update_not_found" });
      }
      const messages = { 401: "session", 403: "forbidden", 404: "notFound", 400: "invalid", 422: "invalid" };
      throw new TicketsError(TICKET_MESSAGES[messages[res.status] ?? "unavailable"], { status: res.status });
    }
    try {
      return await res.json();
    } catch {
      throw new TicketsError(TICKET_MESSAGES.contract, { code: "contract" });
    }
  }

  const one = (id) => `/${encodeURIComponent(id)}`;
  const confirm = (ticket, fields) => {
    const saved = ticketFromApi(ticket);
    if (!Object.entries(fields).every(([key, value]) => saved[key] === value)) {
      throw new TicketsError(TICKET_MESSAGES.mismatch, { code: "mismatch" });
    }
    return saved;
  };

  return {
    mode: base ? "api" : "mock",
    async list() {
      const data = await request();
      if (!Array.isArray(data)) throw new TicketsError(TICKET_MESSAGES.contract, { code: "contract" });
      return data.map(ticketFromApi);
    },
    async get(id) {
      return confirm(await request(one(id)), { id });
    },
    async create(ticket) {
      const body = Object.fromEntries(createFields.map((key) => [key, ticket[key]]));
      return confirm(await request("", { method: "POST", body }), body);
    },
    async updateStatus(id, status) {
      const saved = confirm(await request(one(id), { method: "PATCH", body: { status } }), { id });
      if (saved.status !== status) {
        throw new TicketsError(
          `Se solicitó «${status}», pero la API devolvió «${saved.status}». El cambio no se confirmó.`,
          { code: "status_mismatch" },
        );
      }
      return saved;
    },
  };
}

// URL independiente del backend de cuentas/chat; sin configuración se conserva la demostración.
export const ticketsApi = createTicketsApi({ baseUrl: import.meta.env?.VITE_TICKETS_API_URL ?? "" });
