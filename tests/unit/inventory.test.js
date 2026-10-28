import { describe, expect, it, vi } from "vitest";
import { isLowStock, validatePart } from "../../src/domain/inventory.js";
import { createInventoryApi, fromApi, INVENTORY_MESSAGES, toApi } from "../../src/features/workshop/inventoryApi.js";

const FORM = { sku: "ssd-nvme-1tb", name: "SSD NVMe 1TB", category: "Almacenamiento SSD / HDD", compat: " Universal M.2 ", stock: "10", min: "3", price: "189.90" };

describe("reglas del inventario", () => {
  it("valida el formulario y devuelve el repuesto con el precio en céntimos", () => {
    const { errors, part } = validatePart(FORM);
    expect(errors).toEqual({});
    expect(part).toEqual({ sku: "SSD-NVME-1TB", name: "SSD NVMe 1TB", category: "Almacenamiento SSD / HDD", compat: "Universal M.2", stock: 10, min: 3, price: 18990 });
  });

  it("marca cada campo inválido sin devolver repuesto", () => {
    const { errors, part } = validatePart({ sku: "ssd 1tb", name: "S", category: "Otra", stock: "-1", min: "x", price: "0" });
    expect(part).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["category", "min", "name", "price", "sku", "stock"]);
  });

  it("rechaza un SKU repetido al crear, pero no lo valida al editar", () => {
    expect(validatePart(FORM, { existingSkus: ["SSD-NVME-1TB"] }).errors.sku).toBe("Este SKU ya existe en el inventario.");
    expect(validatePart({ ...FORM, sku: "" }, { editing: true }).errors.sku).toBeUndefined();
  });

  it("considera crítico el stock igual o menor al mínimo", () => {
    expect(isLowStock({ stock: 5, min: 5 })).toBe(true);
    expect(isLowStock({ stock: 6, min: 5 })).toBe(false);
  });
});

const API_PART = { code: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", description: "Lenovo Legion", unit_price: "52.00", current_stock: 62, minimum_threshold: 10 };

function fakeFetch(...responses) {
  return vi.fn().mockImplementation(async () => {
    const r = responses.shift();
    return { ok: r.status < 400, status: r.status, json: async () => r.body ?? {} };
  });
}

describe("cliente de la API de inventario", () => {
  it("convierte entre la API y la pantalla con el precio como texto de dos decimales", () => {
    const part = fromApi(API_PART);
    expect(part).toEqual({ sku: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", compat: "Lenovo Legion", stock: 62, min: 10, price: 5200, icon: "ram" });
    expect(toApi(part)).toEqual({ code: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", description: "Lenovo Legion", unit_price: "52.00", current_stock: 62, minimum_threshold: 10 });
  });

  it("sin URL queda en modo demostración", () => {
    expect(createInventoryApi().mode).toBe("mock");
  });

  it("lista, crea, edita y elimina con la cookie de sesión", async () => {
    const fetchImpl = fakeFetch(
      { status: 200, body: { parts: [API_PART] } },
      { status: 201, body: { part: API_PART } },
      { status: 200, body: { part: { ...API_PART, current_stock: 5 } } },
      { status: 204 },
    );
    const api = createInventoryApi({ baseUrl: "http://api.local/", fetchImpl });

    expect(await api.list()).toHaveLength(1);
    await api.create(fromApi(API_PART));
    expect((await api.update({ ...fromApi(API_PART), sku: "RAM 16/D5" })).stock).toBe(5);
    await api.remove("RAM-16-D5");

    const calls = fetchImpl.mock.calls.map(([url, init]) => `${init.method} ${url}`);
    expect(calls).toEqual([
      "GET http://api.local/api/inventory/parts",
      "POST http://api.local/api/inventory/parts",
      "PUT http://api.local/api/inventory/parts/RAM%2016%2FD5",
      "DELETE http://api.local/api/inventory/parts/RAM-16-D5",
    ]);
    expect(fetchImpl.mock.calls.every(([, init]) => init.credentials === "include")).toBe(true);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).unit_price).toBe("52.00");
  });

  it.each([
    ["create", 409, "duplicate", INVENTORY_MESSAGES.duplicate],
    ["remove", 409, "in_use", INVENTORY_MESSAGES.inUse],
    ["list", 401, "session_required", INVENTORY_MESSAGES.session],
    ["list", 403, "staff_only", INVENTORY_MESSAGES.staffOnly],
    ["update", 404, "not_found", INVENTORY_MESSAGES.notFound],
    ["list", 500, "unavailable", INVENTORY_MESSAGES.unavailable],
  ])("%s con %i devuelve %s", async (method, status, code, message) => {
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl: fakeFetch({ status }) });
    const arg = method === "remove" ? "RAM-16-D5" : fromApi(API_PART);
    await expect(api[method](arg)).rejects.toMatchObject({ code, message });
  });

  it("un fallo de red se muestra como inventario no disponible", async () => {
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });
    await expect(api.list()).rejects.toMatchObject({ code: "network", message: INVENTORY_MESSAGES.unavailable });
  });
});
