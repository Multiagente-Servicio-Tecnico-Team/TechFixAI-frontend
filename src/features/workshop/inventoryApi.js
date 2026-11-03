/*
 * Cliente del inventario de repuestos del taller.
 *
 * - Con VITE_API_URL definido llama a la API REST del backend con la cookie del inicio de sesión
 *   (credentials: "include"): repuestos en /api/inventory/parts y categorías en /api/inventory/categories.
 * - Sin VITE_API_URL queda en modo demostración: las pantallas trabajan con los datos en memoria.
 *
 * Los precios viajan como texto con dos decimales ("114.75") y en la pantalla se usan en céntimos.
 */
import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";
import { centsToInput, parseMoney } from "../../domain/money.js";

export class InventoryError extends Error {
  constructor(message, { status = 0, code = "error", field = null } = {}) {
    super(message);
    this.name = "InventoryError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export const INVENTORY_MESSAGES = {
  session: "Tu sesión terminó. Inicia sesión otra vez para gestionar el inventario.",
  staffOnly: "Solo el personal del taller puede gestionar el inventario.",
  notFound: "Este repuesto ya no existe en el inventario.",
  duplicate: "Este SKU ya existe en el inventario.",
  inUse: "No se puede eliminar: el repuesto figura en presupuestos registrados.",
  invalid: "Revisa los datos del repuesto.",
  invalidResponse: "El inventario devolvió una respuesta inesperada. Inténtalo de nuevo.",
  unavailable: "No se pudo conectar con el inventario. Inténtalo de nuevo.",
};

const ICON_BY_CATEGORY = {
  "Memorias RAM": "ram",
  "Almacenamiento SSD / HDD": "chip",
  Pantallas: "monitor",
  Baterías: "battery",
};

/** JSON de la API → repuesto de la pantalla. */
export function fromApi(p) {
  const price = typeof p?.unit_price === "string" && /^\d+\.\d{2}$/.test(p.unit_price)
    ? parseMoney(p.unit_price)
    : null;
  if (
    !p ||
    !Number.isInteger(p.id) || p.id < 1 ||
    typeof p.code !== "string" ||
    typeof p.name !== "string" ||
    !(p.category === null || typeof p.category === "string") ||
    !(p.description === null || typeof p.description === "string") ||
    !Number.isInteger(p.current_stock) || p.current_stock < 0 ||
    !Number.isInteger(p.minimum_threshold) || p.minimum_threshold < 0 ||
    price === null || price <= 0
  ) {
    throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_response" });
  }
  return {
    id: p.id,
    sku: p.code,
    name: p.name,
    category: p.category ?? "",
    compat: p.description ?? "",
    stock: Number(p.current_stock),
    min: Number(p.minimum_threshold),
    price,
    icon: ICON_BY_CATEGORY[p.category] ?? "chip",
  };
}

/** Repuesto de la pantalla → cuerpo para la API. */
export function toApi(part) {
  return {
    code: part.sku,
    name: part.name,
    category: part.category,
    description: part.compat,
    unit_price: centsToInput(part.price),
    current_stock: part.stock,
    minimum_threshold: part.min,
  };
}

function toInventoryError(status, data, action) {
  if (status === 401) return new InventoryError(INVENTORY_MESSAGES.session, { status, code: "session_required" });
  if (status === 403) return new InventoryError(INVENTORY_MESSAGES.staffOnly, { status, code: "staff_only" });
  if (status === 404) return new InventoryError(INVENTORY_MESSAGES.notFound, { status, code: "not_found" });
  if (status === 409 && action === "remove") return new InventoryError(INVENTORY_MESSAGES.inUse, { status, code: "in_use" });
  if (status === 409) return new InventoryError(INVENTORY_MESSAGES.duplicate, { status, code: "duplicate", field: "sku" });
  if (status === 422) return new InventoryError(INVENTORY_MESSAGES.invalid, { status, code: "invalid", field: data?.field ?? null });
  return new InventoryError(INVENTORY_MESSAGES.unavailable, { status, code: "unavailable" });
}

export function createInventoryApi({ baseUrl = "", fetchImpl } = {}) {
  const base = baseUrl.replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path = "", { method = "GET", body, action, resource = "parts" } = {}) {
    let res;
    try {
      res = await doFetch(`${base}/api/inventory/${resource}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new InventoryError(INVENTORY_MESSAGES.unavailable, { code: "network" });
    }
    let data = null;
    if (res.status !== 204) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }
    if (!res.ok) throw toInventoryError(res.status, data, action);
    return data;
  }

  const one = (sku) => `/${encodeURIComponent(sku)}`;

  return {
    mode: base ? "api" : "mock",
    async list() {
      const data = await request("");
      if (!Array.isArray(data?.parts)) {
        throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_response" });
      }
      return data.parts.map(fromApi);
    },
    async listCategories() {
      const data = await request("", { resource: "categories" });
      if (!Array.isArray(data?.categories) || data.categories.some((category) => typeof category !== "string" || !category.trim())) {
        throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_response" });
      }
      return [...new Set(data.categories)];
    },
    async create(part) {
      const data = await request("", { method: "POST", body: toApi(part), action: "create" });
      if (!data?.part) throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_response" });
      return fromApi(data.part);
    },
    async update(part) {
      const data = await request(one(part.sku), { method: "PUT", body: toApi(part), action: "update" });
      if (!data?.part) throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_response" });
      return fromApi(data.part);
    },
    async remove(sku) {
      await request(one(sku), { method: "DELETE", action: "remove" });
    },
  };
}

// En desarrollo, sin URL configurada conserva el modo demostración. Producción resuelve el proxy same-origin.
const configured = import.meta.env?.VITE_API_URL ?? "";
export const inventoryApi = createInventoryApi({
  baseUrl: resolveApiBaseUrl(configured, "/backend", import.meta.env?.PROD === true),
});
