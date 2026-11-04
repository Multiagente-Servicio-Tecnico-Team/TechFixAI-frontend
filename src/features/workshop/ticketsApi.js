import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";
import { parseMoney } from "../../domain/money.js";
import { REQUEST_TYPE_LABEL, ADMIN_TICKET_STATUS_LABEL, TICKET_ORIGIN_LABEL, ADVANCE_PAYMENT_METHOD_LABEL, QUOTE_STATUS_LABEL } from "../../domain/tickets.js";

const API_ROOT = "/api/admin/tickets";

export const TICKETS_MESSAGES = {
  session: "Tu sesión terminó. Inicia sesión otra vez para gestionar tickets.",
  forbidden: "Solo administradores pueden gestionar tickets.",
  notFound: "Este ticket ya no está disponible.",
  conflict: "El ticket cambió mientras lo consultabas. Actualiza la información.",
  invalid: "Revisa los datos del ticket e inténtalo de nuevo.",
  unavailable: "Tickets no está disponible en este momento. Inténtalo de nuevo.",
  unconfigured: "El servicio de tickets no está configurado en este entorno.",
};

export class TicketsApiError extends Error {
  constructor(message, { status = 0, code = "error" } = {}) {
    super(message);
    this.name = "TicketsApiError";
    this.status = status;
    this.code = code;
  }
}

function errorForStatus(status) {
  if (status === 401) return new TicketsApiError(TICKETS_MESSAGES.session, { status, code: "session_required" });
  if (status === 403) return new TicketsApiError(TICKETS_MESSAGES.forbidden, { status, code: "forbidden" });
  if (status === 404) return new TicketsApiError(TICKETS_MESSAGES.notFound, { status, code: "not_found" });
  if (status === 409) return new TicketsApiError(TICKETS_MESSAGES.conflict, { status, code: "conflict" });
  if (status === 422) return new TicketsApiError(TICKETS_MESSAGES.invalid, { status, code: "invalid" });
  return new TicketsApiError(TICKETS_MESSAGES.unavailable, { status, code: "unavailable" });
}

function displayDate(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function normalizeQuote(quote) {
  if (!quote) return null;
  return {
    ...quote,
    laborCents: parseMoney(quote.labor_cost),
    partsCents: parseMoney(quote.parts_cost),
    totalCents: parseMoney(quote.total_amount),
    statusLabel: QUOTE_STATUS_LABEL[quote.status] || "Estado no disponible",
    dateLabel: displayDate(quote.created_at),
  };
}

export function normalizeAdminTicket(dto) {
  if (!dto || !Number.isInteger(Number(dto.id)) || Number(dto.id) < 1) throw new TicketsApiError(TICKETS_MESSAGES.unavailable, { code: "invalid_response" });
  const statusCode = dto.status;
  const requestType = dto.request_type;
  const originCode = dto.origin ?? "UNKNOWN";
  const advance = dto.advance_amount == null ? null : parseMoney(dto.advance_amount);
  const quotes = Array.isArray(dto.quotes) ? dto.quotes.map(normalizeQuote) : dto.quote ? [normalizeQuote(dto.quote)] : [];
  const quote = normalizeQuote(dto.quote) ?? quotes[quotes.length - 1] ?? null;
  const quoteCents = quote?.totalCents ?? (dto.quote_total == null ? null : parseMoney(dto.quote_total));
  const paymentMethod = dto.advance_payment_method ?? dto.payment_method ?? null;
  return {
    ...dto,
    id: Number(dto.id),
    code: dto.code,
    client: dto.contact_name || dto.customer_name || "Cliente sin nombre",
    phone: dto.contact_phone || dto.customer_phone || "Teléfono no registrado",
    email: dto.contact_email || dto.customer_email || "",
    device: dto.title || "Equipo no especificado",
    issue: dto.failure_description || "Detalle no disponible",
    requestType,
    category: REQUEST_TYPE_LABEL[requestType] || "Tipo no disponible",
    statusCode,
    status: ADMIN_TICKET_STATUS_LABEL[statusCode] || "Estado no disponible",
    originCode,
    origin: TICKET_ORIGIN_LABEL[originCode] || TICKET_ORIGIN_LABEL.UNKNOWN,
    advance,
    advanceCents: advance,
    method: ADVANCE_PAYMENT_METHOD_LABEL[paymentMethod] || "",
    payment: dto.payment_status || (advance !== null ? `Adelanto ${ADVANCE_PAYMENT_METHOD_LABEL[paymentMethod] || "registrado"}` : "Pendiente"),
    budget: quoteCents,
    quote,
    quotes,
    date: displayDate(dto.created_at),
  };
}

export function createTicketsApi({ baseUrl = "", fetchImpl } = {}) {
  const base = String(baseUrl).trim().replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path, { method = "GET", body } = {}) {
    if (!base) throw new TicketsApiError(TICKETS_MESSAGES.unconfigured, { code: "unconfigured" });
    let response;
    try {
      response = await doFetch(`${base}${API_ROOT}${path}`, {
        method,
        headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        credentials: "include",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new TicketsApiError(TICKETS_MESSAGES.unavailable, { code: "network" });
    }
    if (!response.ok) throw errorForStatus(response.status);
    if (response.status === 204) return null;
    try { return await response.json(); } catch { throw new TicketsApiError(TICKETS_MESSAGES.unavailable, { code: "invalid_response" }); }
  }

  return {
    mode: base ? "api" : "demo",
    normalizeTicket: normalizeAdminTicket,
    async listTickets(filters = {}) {
      const query = new URLSearchParams();
      for (const key of ["status", "request_type", "origin", "search", "limit", "offset"]) {
        const value = filters[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") query.set(key, String(value));
      }
      return request(query.size ? `?${query}` : "");
    },
    async getTicket(id) {
      if (!/^\d+$/.test(String(id)) || Number(id) < 1) throw new TicketsApiError(TICKETS_MESSAGES.notFound, { status: 404, code: "not_found" });
      return normalizeAdminTicket(await request(`/${encodeURIComponent(id)}`));
    },
    async createManualTicket(payload) { return normalizeAdminTicket(await request("", { method: "POST", body: payload })); },
    async createServiceQuote(ticketId, payload) {
      if (!/^\d+$/.test(String(ticketId)) || Number(ticketId) < 1) throw new TicketsApiError(TICKETS_MESSAGES.notFound, { status: 404, code: "not_found" });
      return request(`/${encodeURIComponent(ticketId)}/quotes`, { method: "POST", body: payload });
    },
    async updateTicket(id, payload) {
      if (!/^\d+$/.test(String(id)) || Number(id) < 1) throw new TicketsApiError(TICKETS_MESSAGES.notFound, { status: 404, code: "not_found" });
      return normalizeAdminTicket(await request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: payload }));
    },
  };
}

const configuredUrl = import.meta.env?.VITE_API_URL ?? "";
const baseUrl = resolveApiBaseUrl(configuredUrl, "/backend", import.meta.env?.PROD === true);
export const ticketsApi = createTicketsApi({ baseUrl });
