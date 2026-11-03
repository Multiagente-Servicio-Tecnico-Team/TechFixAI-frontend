import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";

export class PurchaseError extends Error {
  constructor(message, { status = 0, code = "error", field = null, replayed = false } = {}) {
    super(message);
    this.name = "PurchaseError";
    this.status = status;
    this.code = code;
    this.field = field;
    this.replayed = replayed;
  }
}

export const PURCHASE_MESSAGES = Object.freeze({
  session: "Tu sesión terminó. Inicia sesión otra vez para gestionar Compras.",
  forbidden: "Solo administradores pueden acceder a Compras.",
  notFound: "La compra o el proveedor ya no está disponible.",
  conflict: "No se pudo completar la operación por un conflicto con los datos actuales.",
  invalid: "Revisa los datos marcados e inténtalo de nuevo.",
  unavailable: "Compras no está disponible en este momento. Inténtalo de nuevo.",
  unconfigured: "El servicio de Compras no está configurado en este entorno.",
});

function errorFor(status, data) {
  const code = data?.code ?? "error";
  if (status === 401) return new PurchaseError(PURCHASE_MESSAGES.session, { status, code: "session_required", field: data?.field });
  if (status === 403) return new PurchaseError(PURCHASE_MESSAGES.forbidden, { status, code: "forbidden" });
  if (status === 404) return new PurchaseError(PURCHASE_MESSAGES.notFound, { status, code: "not_found" });
  if (status === 409) return new PurchaseError(data?.detail || PURCHASE_MESSAGES.conflict, { status, code, field: data?.field });
  if (status === 422) return new PurchaseError(PURCHASE_MESSAGES.invalid, { status, code: "invalid", field: data?.field });
  return new PurchaseError(PURCHASE_MESSAGES.unavailable, { status, code: "unavailable" });
}

export function createPurchasesApi({ baseUrl = "", fetchImpl } = {}) {
  const base = String(baseUrl).replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path, { method = "GET", body, headers = {} } = {}) {
    if (!base) throw new PurchaseError(PURCHASE_MESSAGES.unconfigured, { code: "unconfigured" });
    let response;
    try {
      response = await doFetch(`${base}${path}`, {
        method,
        headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
        credentials: "include",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "network" });
    }
    let data = null;
    if (response.status !== 204) {
      try { data = await response.json(); } catch { data = null; }
    }
    if (!response.ok) throw errorFor(response.status, data);
    return { data, replayed: response.headers?.get?.("Idempotent-Replayed") === "true" };
  }

  const queryString = (values) => {
    const query = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "") query.set(key, String(value));
    });
    return query.size ? `?${query}` : "";
  };

  return {
    mode: base ? "api" : "unconfigured",
    async listPurchases(filters = {}) {
      const { data } = await request(`/api/admin/purchases${queryString(filters)}`);
      if (!Array.isArray(data?.items)) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return data;
    },
    async getPurchase(id) {
      const { data } = await request(`/api/admin/purchases/${encodeURIComponent(id)}`);
      if (!data?.purchase) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return data.purchase;
    },
    async listSuppliers(filters = {}) {
      const { data } = await request(`/api/admin/suppliers${queryString(filters)}`);
      if (!Array.isArray(data?.items)) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return data;
    },
    async createSupplier(payload) {
      const { data } = await request("/api/admin/suppliers", { method: "POST", body: payload });
      if (!data?.supplier) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return data.supplier;
    },
    async updateSupplier(id, payload) {
      const { data } = await request(`/api/admin/suppliers/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      if (!data?.supplier) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return data.supplier;
    },
    async createPurchase(payload) {
      const { data } = await request("/api/admin/purchases", { method: "POST", body: payload });
      if (!data?.purchase) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return data.purchase;
    },
    async updatePurchase(id, payload) {
      const { data } = await request(`/api/admin/purchases/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      if (!data?.purchase) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return data.purchase;
    },
    async cancelPurchase(id) {
      const { data } = await request(`/api/admin/purchases/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      return data?.purchase ?? null;
    },
    async listReceipts(id) {
      const { data } = await request(`/api/admin/purchases/${encodeURIComponent(id)}/receipts`);
      return data?.items ?? [];
    },
    async receivePurchase(id, payload, idempotencyKey) {
      if (!idempotencyKey) throw new PurchaseError("No se pudo preparar el reintento seguro de recepción.", { code: "idempotency_key_required" });
      const { data, replayed } = await request(`/api/admin/purchases/${encodeURIComponent(id)}/receipts`, {
        method: "POST", body: payload, headers: { "Idempotency-Key": idempotencyKey },
      });
      if (!data?.receipt) throw new PurchaseError(PURCHASE_MESSAGES.unavailable, { code: "invalid_response" });
      return { receipt: data.receipt, replayed };
    },
  };
}

const configured = import.meta.env?.VITE_API_URL ?? "";
export const purchasesApi = createPurchasesApi({
  baseUrl: resolveApiBaseUrl(configured, "/backend", import.meta.env?.PROD === true),
});
