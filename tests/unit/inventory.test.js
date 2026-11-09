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
    const { errors, part } = validatePart({ sku: "ssd 1tb", name: "S", category: "   ", stock: "-1", min: "x", price: "0" });
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

const API_PART = { id: 17, code: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", description: "Lenovo Legion", unit_price: "52.00", current_stock: 62, minimum_threshold: 10 };

function fakeFetch(...responses) {
  return vi.fn().mockImplementation(async () => {
    const r = responses.shift();
    return { ok: r.status < 400, status: r.status, json: async () => r.body ?? {} };
  });
}

describe("cliente de la API de inventario", () => {
  it("convierte entre la API y la pantalla con el precio como texto de dos decimales", () => {
    const part = fromApi(API_PART);
    expect(part).toEqual({ id: 17, sku: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", compat: "Lenovo Legion", stock: 62, min: 10, price: 5200, icon: "ram" });
    expect(toApi(part)).toEqual({ code: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", description: "Lenovo Legion", unit_price: "52.00", minimum_threshold: 10 });
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
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).not.toHaveProperty("current_stock");
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).not.toHaveProperty("current_stock");
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

  it("registra una apertura con ID numérico y conserva la clave idempotente enviada", async () => {
    const movement = { id: 4, part_id: 17, code_snapshot: "RAM-16-D5", name_snapshot: "RAM 16GB DDR5", movement_type: "OPENING_BALANCE", quantity_delta: 8, stock_before: 0, stock_after: 8, reason: "Conteo inicial", actor_kind: "USER", actor_user_id: 2, actor_name: "Carlos", created_at: "2026-11-08T12:00:00Z", source_type: null, source_id: null, is_before_cutover: false };
    const fetchImpl = fakeFetch(
      { status: 201, body: { part: { id: 17, code: "RAM-16-D5", current_stock: 8 }, changed: true, movement } },
      { status: 201, body: { part: { id: 17, code: "RAM-16-D5", current_stock: 8 }, changed: true, movement } },
    );
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl });
    const payload = { counted_stock: 8, reason: " Conteo inicial " };
    const key = "55e49c27-1f5b-4bc8-a51f-02f1ad3e5e06";

    await api.recordOpening(17, payload, key);
    await api.recordOpening(17, payload, key);

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "http://api.local/api/inventory/parts/17/opening-balance",
      "http://api.local/api/inventory/parts/17/opening-balance",
    ]);
    expect(fetchImpl.mock.calls[0][1].headers["Idempotency-Key"]).toBe(key);
    expect(fetchImpl.mock.calls[1][1].headers["Idempotency-Key"]).toBe(key);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ counted_stock: 8, reason: "Conteo inicial" });
    expect(fetchImpl.mock.calls.every(([, init]) => init.credentials === "include")).toBe(true);
  });

  it("consulta historial con filtros y paginación por ID numérico", async () => {
    const fetchImpl = fakeFetch({ status: 200, body: { items: [], total: 0, limit: 50, offset: 0 } });
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl });
    await expect(api.listMovements(17, { movement_type: "ADJUSTMENT_IN", from_date: "2026-11-01", limit: 50, offset: 0 }))
      .resolves.toMatchObject({ items: [], total: 0, limit: 50, offset: 0 });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://api.local/api/inventory/parts/17/movements?movement_type=ADJUSTMENT_IN&from_date=2026-11-01&limit=50&offset=0");
  });

  it("envía un conteo físico y clave idempotente al endpoint de ajustes", async () => {
    const fetchImpl = fakeFetch({ status: 201, body: { part: { id: 17, code: "RAM-16-D5", current_stock: 15 }, changed: true, movement: null } });
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl });
    await expect(api.adjustStock(17, { counted_stock: 15, reason: "Conteo físico" }, "55e49c27-1f5b-4bc8-a51f-02f1ad3e5e06"))
      .resolves.toMatchObject({ part: { id: 17, current_stock: 15 }, changed: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://api.local/api/inventory/parts/17/adjustments");
    expect(init.headers["Idempotency-Key"]).toBe("55e49c27-1f5b-4bc8-a51f-02f1ad3e5e06");
    expect(JSON.parse(init.body)).toEqual({ counted_stock: 15, reason: "Conteo físico" });
  });

  it("rechaza una página de movimientos con forma inválida", async () => {
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl: fakeFetch({ status: 200, body: { items: "no es una lista" } }) });
    await expect(api.listMovements(17)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("traduce el conflicto de retiro por reservas sin describirlo como SKU duplicado", async () => {
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl: fakeFetch({ status: 409, body: { code: "reserved_stock", detail: "unidades reservadas" } }) });
    await expect(api.remove("RAM-16-D5")).rejects.toMatchObject({ code: "reserved_stock", message: INVENTORY_MESSAGES.removeReserved });
  });

  it.each([
    ["reserved_stock", INVENTORY_MESSAGES.reservedStock],
    ["opening_exists", INVENTORY_MESSAGES.openingExists],
    ["idempotency_conflict", INVENTORY_MESSAGES.idempotencyConflict],
  ])("traduce el conflicto %s sin tratarlo como SKU duplicado", async (code, message) => {
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl: fakeFetch({ status: 409, body: { code, detail: "detalle interno" } }) });
    await expect(api.adjustStock(17, { counted_stock: 0, reason: "Conteo" }, "55e49c27-1f5b-4bc8-a51f-02f1ad3e5e06"))
      .rejects.toMatchObject({ code, message });
  });
});


describe("categorías dinámicas del inventario", () => {
  it("acepta una categoría nueva no vacía y conserva su texto", () => {
    const { errors, part } = validatePart({ ...FORM, category: "Procesadores y placas" });
    expect(errors.category).toBeUndefined();
    expect(part.category).toBe("Procesadores y placas");
  });

  it("rechaza una categoría vacía o mayor a 50 caracteres", () => {
    const empty = validatePart({ ...FORM, category: "   " });
    const tooLong = validatePart({ ...FORM, category: "x".repeat(51) });
    expect(empty.errors.category).toBeDefined();
    expect(tooLong.errors.category).toBeDefined();
  });
});

describe("categorías y respuestas estrictas de la API", () => {
  it("consulta las categorías del backend con la cookie de sesión", async () => {
    const fetchImpl = fakeFetch({ status: 200, body: { categories: ["Procesadores", "Memorias RAM"] } });
    const api = createInventoryApi({ baseUrl: "http://api.local", fetchImpl });

    await expect(api.listCategories()).resolves.toEqual(["Procesadores", "Memorias RAM"]);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://api.local/api/inventory/categories");
    expect(fetchImpl.mock.calls[0][1].credentials).toBe("include");
  });

  it("rechaza un payload de listado que no contiene parts como arreglo", async () => {
    const api = createInventoryApi({
      baseUrl: "http://api.local",
      fetchImpl: fakeFetch({ status: 200, body: {} }),
    });

    await expect(api.list()).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("rechaza una respuesta de categorías con valores que no son texto", async () => {
    const api = createInventoryApi({
      baseUrl: "http://api.local",
      fetchImpl: fakeFetch({ status: 200, body: { categories: ["RAM", null] } }),
    });

    await expect(api.listCategories()).rejects.toMatchObject({ code: "invalid_response" });
  });
});



describe("confirmación de escrituras de inventario", () => {
  it.each(["create", "update"])("%s rechaza un cuerpo exitoso sin repuesto confirmado", async (method) => {
    const api = createInventoryApi({
      baseUrl: "http://api.local",
      fetchImpl: fakeFetch({ status: method === "create" ? 201 : 200, body: {} }),
    });

    await expect(api[method](fromApi(API_PART))).rejects.toMatchObject({ code: "invalid_response" });
  });
});
