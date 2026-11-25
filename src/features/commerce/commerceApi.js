import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";
import { normalizeCommercialQuote, normalizeCommercialTicket, normalizePayment, normalizeSalesOrder } from "../../domain/customerCommerce.js";

export class CommerceApiError extends Error {
  constructor(message, { status = 0, code = "error", field = null } = {}) {
    super(message);
    this.name = "CommerceApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

const MESSAGES = {
  401: "Tu sesión terminó. Inicia sesión otra vez.",
  403: "No tienes permiso para consultar esta operación.",
  404: "El registro no está disponible.",
  409: "La operación cambió o ya no se puede completar. Actualiza la información e inténtalo de nuevo.",
  422: "Revisa los datos e inténtalo de nuevo.",
  0: "El servicio comercial no está disponible en este momento. Inténtalo de nuevo.",
};
const profileMessage = "Tu cuenta todavía no tiene un perfil comercial disponible. Contacta al taller para revisar la vinculación.";
const validId = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;
const key = () => globalThis.crypto?.randomUUID?.() ?? `commerce-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const collection = (data, ...keys) => {
  for (const name of keys) if (Array.isArray(data?.[name])) return data[name];
  return Array.isArray(data) ? data : null;
};

export function createCommerceApi({ baseUrl = "", fetchImpl, createIdempotencyKey = key } = {}) {
  const base = String(baseUrl).trim().replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path, { method = "GET", body, idempotencyKey } = {}) {
    if (!base) throw new CommerceApiError("El servicio comercial no está configurado.", { code: "unconfigured" });
    const headers = { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    let response;
    try {
      response = await doFetch(`${base}${path}`, {
        method,
        headers,
        credentials: "include",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new CommerceApiError(MESSAGES[0], { code: "network" });
    }
    let data = null;
    if (response.status !== 204) {
      try { data = await response.json(); } catch { data = null; }
    }
    if (!response.ok) {
      const status = response.status;
      const code = data?.code ?? "request_failed";
      throw new CommerceApiError(code === "customer_profile_missing" ? profileMessage : MESSAGES[status] ?? MESSAGES[0], {
        status,
        code: status === 401 ? "session_required" : code,
        field: data?.field ?? null,
      });
    }
    return data;
  }

  const idPath = (id, resource) => {
    if (!validId(id)) throw new CommerceApiError(MESSAGES[404], { status: 404, code: "not_found" });
    return `${resource}/${encodeURIComponent(id)}`;
  };
  const list = async (path, names, normalize) => {
    const data = await request(path);
    const rows = collection(data, ...names);
    if (!rows) throw new CommerceApiError(MESSAGES[0], { code: "invalid_response" });
    return rows.map(normalize);
  };

  return {
    mode: base ? "api" : "unconfigured",
    async listMyTickets() {
      return list("/api/customer/tickets", ["tickets", "items"], normalizeCommercialTicket);
    },
    async createMyTicket(payload) {
      const body = {
        title: payload?.title,
        failure_description: payload?.failure_description,
        request_type: payload?.request_type,
      };
      return normalizeCommercialTicket(await request("/api/customer/tickets", { method: "POST", body }));
    },
    async listMyQuotes() {
      return list("/api/customer/quotes", ["quotes", "items"], normalizeCommercialQuote);
    },
    async getMyQuote(id) {
      return normalizeCommercialQuote(await request(idPath(id, "/api/customer/quotes")));
    },
    async acceptMyQuote(id, { idempotencyKey = createIdempotencyKey() } = {}) {
      const data = await request(`${idPath(id, "/api/customer/quotes")}/acceptance`, { method: "POST", idempotencyKey });
      return normalizeCommercialQuote(data.quote ?? data);
    },
    async listMyPayments() {
      return list("/api/customer/payments", ["payments", "items"], normalizePayment);
    },
    async listMySalesOrders() {
      return list("/api/customer/sales-orders", ["sales_orders", "orders", "items"], normalizeSalesOrder);
    },
    async getMySalesOrder(id) {
      return normalizeSalesOrder(await request(idPath(id, "/api/customer/sales-orders")));
    },
    async listAdminSalesQuotes({ customerId, status, limit = 50, offset = 0 } = {}) {
      const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (validId(customerId)) query.set("customer_id", String(customerId));
      if (status) query.set("status", status);
      return list(`/api/admin/sales-quotes?${query}`, ["quotes", "items"], normalizeCommercialQuote);
    },
    async getAdminSalesQuote(id) {
      return normalizeCommercialQuote(await request(idPath(id, "/api/admin/sales-quotes")));
    },
    async createAdminSalesQuote(payload) {
      return normalizeCommercialQuote(await request("/api/admin/sales-quotes", { method: "POST", body: payload }));
    },
    async recordManualAcceptance(id, payload, { idempotencyKey = createIdempotencyKey() } = {}) {
      const data = await request(`${idPath(id, "/api/admin/sales-quotes")}/acceptance`, { method: "POST", body: payload, idempotencyKey });
      return normalizeCommercialQuote(data.quote ?? data);
    },
    async cancelAdminSalesQuote(id, notes = null) {
      const data = await request(`${idPath(id, "/api/admin/sales-quotes")}/cancellation`, { method: "POST", body: { notes } });
      return normalizeCommercialQuote(data.quote ?? data);
    },
    async confirmAdminPayment(id, payload, { idempotencyKey = createIdempotencyKey() } = {}) {
      const data = await request(`${idPath(id, "/api/admin/sales-quotes")}/payment-confirmation`, { method: "POST", body: payload, idempotencyKey });
      return normalizeSalesOrder(data.sales_order ?? data.order ?? data);
    },
    async listAdminSalesOrders(filters = {}) {
      const query = new URLSearchParams({ limit: String(filters.limit ?? 50), offset: String(filters.offset ?? 0) });
      if (validId(filters.customerId)) query.set("customer_id", String(filters.customerId));
      return list(`/api/admin/sales-orders?${query}`, ["sales_orders", "orders", "items"], normalizeSalesOrder);
    },
    async getAdminSalesOrder(id) {
      return normalizeSalesOrder(await request(idPath(id, "/api/admin/sales-orders")));
    },
    async listAdminPayments({ customerId, status, limit = 50, offset = 0 } = {}) {
      const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (validId(customerId)) query.set("customer_id", String(customerId));
      if (status) query.set("status", status);
      return list(`/api/admin/payments?${query}`, ["payments", "items"], normalizePayment);
    },
  };
}

const baseUrl = resolveApiBaseUrl(import.meta.env?.VITE_API_URL ?? "", "/backend", import.meta.env?.PROD === true);
export const commerceApi = createCommerceApi({ baseUrl });
