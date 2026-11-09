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
  inUse: "No se pudo retirar el repuesto porque aún tiene reservas u otras referencias.",
  removeReserved: "No se puede retirar el repuesto mientras tenga unidades reservadas.",
  reservedStock: "No se puede reducir el stock por debajo de las unidades reservadas.",
  openingExists: "El saldo inicial ya se registró. Recarga el inventario para ver el saldo actual.",
  idempotencyConflict: "La solicitud ya se envió con otros datos. Recarga el inventario antes de intentarlo otra vez.",
  conflict: "La operación entra en conflicto con el estado actual del inventario. Recarga e inténtalo de nuevo.",
  invalidMovement: "Revisa la cantidad y el motivo del movimiento.",
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
    minimum_threshold: part.min,
  };
}

function toInventoryError(status, data, action) {
  if (status === 401) return new InventoryError(INVENTORY_MESSAGES.session, { status, code: "session_required" });
  if (status === 403) return new InventoryError(INVENTORY_MESSAGES.staffOnly, { status, code: "staff_only" });
  if (status === 404) return new InventoryError(INVENTORY_MESSAGES.notFound, { status, code: "not_found" });
  if (status === 409) {
    const messages = {
      reserved_stock: INVENTORY_MESSAGES.reservedStock,
      opening_exists: INVENTORY_MESSAGES.openingExists,
      idempotency_conflict: INVENTORY_MESSAGES.idempotencyConflict,
    };
    if (data?.code === "duplicate_sku" || data?.code === "duplicate") {
      const field = data?.field === "code" ? "sku" : data?.field ?? "sku";
      return new InventoryError(INVENTORY_MESSAGES.duplicate, { status, code: "duplicate", field });
    }
    if (data?.code === "reserved_stock" && action === "remove") return new InventoryError(INVENTORY_MESSAGES.removeReserved, { status, code: "reserved_stock" });
    if (data?.code in messages) return new InventoryError(messages[data.code], { status, code: data.code, field: data?.field ?? null });
    if (action === "remove") return new InventoryError(INVENTORY_MESSAGES.inUse, { status, code: data?.code ?? "conflict" });
    return new InventoryError(INVENTORY_MESSAGES.conflict, { status, code: data?.code ?? "conflict", field: data?.field ?? null });
  }
  if (status === 422) {
    const message = action === "movement" ? INVENTORY_MESSAGES.invalidMovement : INVENTORY_MESSAGES.invalid;
    return new InventoryError(message, { status, code: data?.code ?? "invalid", field: data?.field ?? null });
  }
  return new InventoryError(INVENTORY_MESSAGES.unavailable, { status, code: "unavailable" });
}

export function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isMovement(value) {
  const types = ["OPENING_BALANCE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "PURCHASE_RECEIPT", "SALE"];
  return Boolean(
    value && Number.isInteger(value.id) &&
    (value.part_id === null || Number.isInteger(value.part_id)) &&
    typeof value.code_snapshot === "string" && typeof value.name_snapshot === "string" &&
    types.includes(value.movement_type) && Number.isInteger(value.quantity_delta) &&
    Number.isInteger(value.stock_before) && Number.isInteger(value.stock_after) &&
    (value.reason === null || typeof value.reason === "string") &&
    ["USER", "SYSTEM"].includes(value.actor_kind) &&
    (value.actor_user_id === null || Number.isInteger(value.actor_user_id)) &&
    (value.actor_name === null || typeof value.actor_name === "string") &&
    typeof value.created_at === "string" && typeof value.is_before_cutover === "boolean"
  );
}

function validateMutationResult(data) {
  if (
    !data?.part || !Number.isInteger(data.part.id) || data.part.id < 1 ||
    typeof data.part.code !== "string" || !Number.isInteger(data.part.current_stock) || data.part.current_stock < 0 ||
    typeof data.changed !== "boolean" || !(data.movement === null || isMovement(data.movement))
  ) {
    throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_response" });
  }
  return data;
}

function validateMovementPage(data) {
  if (
    !Array.isArray(data?.items) || !data.items.every(isMovement) || !Number.isInteger(data.total) || data.total < 0 ||
    !Number.isInteger(data.limit) || data.limit < 1 || data.limit > 200 ||
    !Number.isInteger(data.offset) || data.offset < 0
  ) {
    throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_response" });
  }
  return data;
}

export function createInventoryApi({ baseUrl = "", fetchImpl } = {}) {
  const base = baseUrl.replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path = "", { method = "GET", body, action, resource = "parts", headers = {} } = {}) {
    let res;
    try {
      res = await doFetch(`${base}/api/inventory/${resource}${path}`, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), Accept: "application/json", ...headers },
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
  const byId = (partId) => {
    if (!Number.isInteger(partId) || partId < 1) throw new InventoryError(INVENTORY_MESSAGES.invalidResponse, { code: "invalid_part_id" });
    return `/${partId}`;
  };
  const movementBody = ({ counted_stock: countedStock, reason }) => ({ counted_stock: countedStock, reason: reason?.trim() });

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
    async recordOpening(partId, payload, idempotencyKey) {
      const data = await request(`${byId(partId)}/opening-balance`, {
        method: "POST", body: movementBody(payload), action: "movement", headers: { "Idempotency-Key": idempotencyKey },
      });
      return validateMutationResult(data);
    },
    async adjustStock(partId, payload, idempotencyKey) {
      const data = await request(`${byId(partId)}/adjustments`, {
        method: "POST", body: movementBody(payload), action: "movement", headers: { "Idempotency-Key": idempotencyKey },
      });
      return validateMutationResult(data);
    },
    async listMovements(partId, filters = {}) {
      const params = new URLSearchParams();
      for (const key of ["movement_type", "from_date", "to_date", "limit", "offset"]) {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
      }
      const query = params.toString();
      const data = await request(`${byId(partId)}/movements${query ? `?${query}` : ""}`, { action: "history" });
      return validateMovementPage(data);
    },
  };
}

// En desarrollo, sin URL configurada conserva el modo demostración. Producción resuelve el proxy same-origin.
const configured = import.meta.env?.VITE_API_URL ?? "";
export const inventoryApi = createInventoryApi({
  baseUrl: resolveApiBaseUrl(configured, "/backend", import.meta.env?.PROD === true),
});
