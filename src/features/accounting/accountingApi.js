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
  notFound: "El recurso contable ya no está disponible. Actualiza la información.",
  conflict: "Una cuenta, plan o periodo cambió mientras lo consultabas. Actualiza la información.",
  invalid: "Revisa los datos contables e inténtalo de nuevo.",
  exportTooLarge: "El informe excede el límite de exportación. Reduce el rango o aplica más filtros.",
  unavailable: "Contabilidad no está disponible en este momento. Inténtalo de nuevo.",
  unconfigured: "El servicio de Contabilidad no está configurado en este entorno.",
};

function errorForStatus(status) {
  if (status === 401) return new AccountingError(ACCOUNTING_MESSAGES.session, { status, code: "session_required" });
  if (status === 403) return new AccountingError(ACCOUNTING_MESSAGES.forbidden, { status, code: "forbidden" });
  if (status === 404) return new AccountingError(ACCOUNTING_MESSAGES.notFound, { status, code: "not_found" });
  if (status === 409) return new AccountingError(ACCOUNTING_MESSAGES.conflict, { status, code: "conflict" });
  if (status === 413) return new AccountingError(ACCOUNTING_MESSAGES.exportTooLarge, { status, code: "export_too_large" });
  if (status === 422) return new AccountingError(ACCOUNTING_MESSAGES.invalid, { status, code: "invalid" });
  return new AccountingError(ACCOUNTING_MESSAGES.unavailable, { status, code: "unavailable" });
}

export function createAccountingApi({ baseUrl = "", fetchImpl } = {}) {
  const base = String(baseUrl).replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const root = "/api/admin/accounting";

  const queryString = (filters, names) => {
    const query = new URLSearchParams();
    for (const name of names) {
      const value = filters?.[name];
      if (value !== undefined && value !== null && String(value) !== "") query.set(name, String(value));
    }
    return query.size ? `?${query.toString()}` : "";
  };

  async function request(path, { method = "GET", body, headers = {}, responseType = "json", fallbackFilename } = {}) {
    if (!base) throw new AccountingError(ACCOUNTING_MESSAGES.unconfigured, { code: "unconfigured" });
    let response;
    try {
      response = await doFetch(`${base}${root}${path}`, {
        method,
        headers: {
          Accept: responseType === "file" ? "*/*" : "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        credentials: "include",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new AccountingError(ACCOUNTING_MESSAGES.unavailable, { code: "network" });
    }

    const contentType = response.headers?.get?.("content-type") ?? "";
    if (!response.ok) {
      // Los errores de exportación también son JSON; nunca se descargan como si fueran archivos.
      let errorBody = null;
      try { errorBody = contentType.includes("json") ? await response.json() : null; } catch { errorBody = null; }
      const error = errorForStatus(response.status);
      if (errorBody?.code) error.code = error.code === "invalid" ? errorBody.code : error.code;
      throw error;
    }
    if (response.status === 204) return null;
    if (responseType === "file" && !contentType.includes("json")) {
      const disposition = response.headers?.get?.("content-disposition") ?? "";
      const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i);
      let filename = fallbackFilename || `${path.split("/").filter(Boolean).at(-1) || "reporte"}.xlsx`;
      if (match?.[1]) {
        try { filename = decodeURIComponent(match[1].trim()); } catch { filename = match[1].trim(); }
      }
      return { blob: await response.blob(), contentType, filename };
    }
    try { return await response.json(); } catch { return null; }
  }

  const reportFilters = ["from_date", "to_date", "plan_id", "status", "format", "limit", "offset"];
  const periodFilters = ["from_period", "to_period", "status", "limit", "offset"];
  const auditFilters = ["entity_type", "from_at", "to_at", "limit", "offset"];
  const list = (path, filters, names) => request(`${path}${queryString(filters, names)}`);
  const report = (name, filters = {}) => {
    const format = filters.format || "json";
    return request(`/reports/${name}${queryString({ ...filters, format }, reportFilters)}`, {
      responseType: format === "json" ? "json" : "file",
      fallbackFilename: `${name}-${filters.from_date || "informe"}-${filters.to_date || ""}.${format}`,
    });
  };

  return {
    mode: base ? "api" : "unconfigured",
    async listCategories() {
      return request("/categories");
    },
    async listPlans() { return request("/plans"); },
    async createPlan(payload) { return request("/plans", { method: "POST", body: payload }); },
    async setDefaultPlan(planId) { return request(`/plans/${encodeURIComponent(planId)}/default`, { method: "PUT" }); },
    async listAccounts(planId, filters = {}) {
      return list(`/plans/${encodeURIComponent(planId)}/accounts`, filters, ["q", "parent_id", "postable", "status", "limit", "offset"]);
    },
    async createAccount(planId, payload) { return request(`/plans/${encodeURIComponent(planId)}/accounts`, { method: "POST", body: payload }); },
    async updateAccount(accountId, payload) { return request(`/accounts/${encodeURIComponent(accountId)}`, { method: "PATCH", body: payload }); },
    async listPeriods(filters = {}) { return list("/periods", filters, periodFilters); },
    async closePeriod(year, month) { return request(`/periods/${year}/${month}/close`, { method: "POST" }); },
    async reopenPeriod(year, month, reason) { return request(`/periods/${year}/${month}/reopen`, { method: "POST", body: { reason } }); },
    async listPeriodEvents(year, month, filters = {}) {
      return list(`/periods/${year}/${month}/events`, filters, ["limit", "offset"]);
    },
    async listAuditEvents(filters = {}) { return list("/audit-events", filters, auditFilters); },
    async getJournal(filters = {}) { return report("journal", filters); },
    async getLedger(filters = {}) {
      const format = filters.format || "json";
      const params = ["account_id", "account_code", "account_name", "from_date", "to_date", "status", "format", "limit", "offset"];
      return request(`/reports/ledger${queryString({ ...filters, format }, params)}`, { responseType: format === "json" ? "json" : "file", fallbackFilename: `mayor-${filters.from_date || "informe"}-${filters.to_date || ""}.${format}` });
    },
    async getTrialBalance(filters = {}) { return report("trial-balance", filters); },
    async listEntries(filters = {}) {
      return list("/entries", filters, ["from_date", "to_date", "category_id", "status", "entry_number", "limit", "offset"]);
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
