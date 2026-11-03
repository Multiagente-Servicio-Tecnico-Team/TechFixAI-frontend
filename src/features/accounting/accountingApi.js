import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";

export class AccountingError extends Error {
  constructor(message, { status = 0, code = "error" } = {}) {
    super(message);
    this.name = "AccountingError";
    this.status = status;
    this.code = code;
  }
}

export const ACCOUNTING_MESSAGES = {
  session: "Tu sesión terminó. Inicia sesión otra vez para consultar Contabilidad.",
  forbidden: "Solo administradores pueden acceder a Contabilidad.",
  notFound: "Este asiento ya no está disponible. Actualiza la lista.",
  conflict: "El asiento cambió mientras lo consultabas. Actualiza la información.",
  invalid: "Revisa los datos del asiento e inténtalo de nuevo.",
  unavailable: "Contabilidad no está disponible en este momento. Inténtalo de nuevo.",
  unconfigured: "El servicio de Contabilidad no está configurado en este entorno.",
};

function errorForStatus(status) {
  if (status === 401) return new AccountingError(ACCOUNTING_MESSAGES.session, { status, code: "session_required" });
  if (status === 403) return new AccountingError(ACCOUNTING_MESSAGES.forbidden, { status, code: "forbidden" });
  if (status === 404) return new AccountingError(ACCOUNTING_MESSAGES.notFound, { status, code: "not_found" });
  if (status === 409) return new AccountingError(ACCOUNTING_MESSAGES.conflict, { status, code: "conflict" });
  if (status === 422) return new AccountingError(ACCOUNTING_MESSAGES.invalid, { status, code: "invalid" });
  return new AccountingError(ACCOUNTING_MESSAGES.unavailable, { status, code: "unavailable" });
}

export function createAccountingApi({ baseUrl = "", fetchImpl } = {}) {
  const base = String(baseUrl).replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const root = "/api/admin/accounting";

  async function request(path, { method = "GET", body, headers = {} } = {}) {
    if (!base) throw new AccountingError(ACCOUNTING_MESSAGES.unconfigured, { code: "unconfigured" });
    let response;
    try {
      response = await doFetch(`${base}${root}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        credentials: "include",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new AccountingError(ACCOUNTING_MESSAGES.unavailable, { code: "network" });
    }

    let data = null;
    if (response.status !== 204) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }
    if (!response.ok) throw errorForStatus(response.status);
    return data;
  }

  return {
    mode: base ? "api" : "unconfigured",
    async listCategories() {
      return request("/categories");
    },
    async listEntries(filters = {}) {
      const query = new URLSearchParams();
      for (const name of ["from_date", "to_date", "category_id", "status", "entry_number", "limit", "offset"]) {
        const value = filters[name];
        if (value !== undefined && value !== null && String(value) !== "") query.set(name, String(value));
      }
      const suffix = query.size ? `?${query.toString()}` : "";
      return request(`/entries${suffix}`);
    },
    async getEntry(entryId) {
      return request(`/entries/${encodeURIComponent(entryId)}`);
    },
    async createEntry(payload, idempotencyKey) {
      return request("/entries", {
        method: "POST",
        body: payload,
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    async reverseEntry(entryId, payload) {
      return request(`/entries/${encodeURIComponent(entryId)}/reverse`, { method: "POST", body: payload });
    },
  };
}

const configuredUrl = import.meta.env?.VITE_API_URL ?? "";
export const accountingApi = createAccountingApi({
  baseUrl: resolveApiBaseUrl(configuredUrl, "/backend", import.meta.env?.PROD === true),
});
