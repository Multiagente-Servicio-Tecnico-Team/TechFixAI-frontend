import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";
import { normalizeCustomer } from "../../domain/customerCommerce.js";

export class CustomersApiError extends Error {
  constructor(message, { status = 0, code = "error", field = null } = {}) {
    super(message);
    this.name = "CustomersApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

const MESSAGES = {
  401: "Tu sesión terminó. Inicia sesión otra vez.",
  403: "Solo ADMIN puede gestionar clientes comerciales.",
  404: "El cliente comercial ya no está disponible.",
  409: "No se pudo completar el cambio porque el registro ya fue modificado.",
  422: "Revisa los datos del cliente e inténtalo de nuevo.",
  0: "Clientes comerciales no está disponible en este momento. Inténtalo de nuevo.",
};

const validId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

export function createCustomersApi({ baseUrl = "", fetchImpl } = {}) {
  const base = String(baseUrl).trim().replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path, { method = "GET", body } = {}) {
    if (!base) throw new CustomersApiError("El servicio de clientes no está configurado.", { code: "unconfigured" });
    let response;
    try {
      response = await doFetch(`${base}/api/admin/customers${path}`, {
        method,
        headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        credentials: "include",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new CustomersApiError(MESSAGES[0], { code: "network" });
    }
    let data = null;
    if (response.status !== 204) {
      try { data = await response.json(); } catch { data = null; }
    }
    if (!response.ok) {
      const status = response.status;
      throw new CustomersApiError(MESSAGES[status] ?? MESSAGES[0], {
        status,
        code: data?.code ?? (status === 401 ? "session_required" : status === 403 ? "forbidden" : "request_failed"),
        field: data?.field ?? null,
      });
    }
    return data;
  }

  return {
    mode: base ? "api" : "unconfigured",
    async list({ search = "", origin, limit = 50, offset = 0 } = {}) {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (origin) query.set("origin", origin);
      query.set("limit", String(limit));
      query.set("offset", String(offset));
      const data = await request(`?${query}`);
      if (!Array.isArray(data?.items)) throw new CustomersApiError(MESSAGES[0], { code: "invalid_response" });
      return { ...data, items: data.items.map(normalizeCustomer) };
    },
    async get(id) {
      if (!validId(id)) throw new CustomersApiError(MESSAGES[404], { status: 404, code: "not_found" });
      return normalizeCustomer(await request(`/${encodeURIComponent(id)}`));
    },
    async create({ display_name, phone, email = null }) {
      return normalizeCustomer(await request("", { method: "POST", body: { display_name: display_name.trim(), phone: phone.trim(), email: email?.trim() || null } }));
    },
    async update(id, patch) {
      if (!validId(id)) throw new CustomersApiError(MESSAGES[404], { status: 404, code: "not_found" });
      const body = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, key === "email" && !String(value ?? "").trim() ? null : typeof value === "string" ? value.trim() : value]));
      return normalizeCustomer(await request(`/${encodeURIComponent(id)}`, { method: "PATCH", body }));
    },
  };
}

const baseUrl = resolveApiBaseUrl(import.meta.env?.VITE_API_URL ?? "", "/backend", import.meta.env?.PROD === true);
export const customersApi = createCustomersApi({ baseUrl });
