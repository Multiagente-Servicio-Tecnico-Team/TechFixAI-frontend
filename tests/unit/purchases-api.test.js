import { describe, expect, it, vi } from "vitest";
import { createPurchasesApi } from "../../src/features/purchases/purchasesApi.js";

const reply = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: () => Promise.resolve(body) });

describe("purchasesApi · proveedores", () => {
  it("no llama al backend si no está configurado", async () => {
    const fetchImpl = vi.fn();
    const api = createPurchasesApi({ baseUrl: "", fetchImpl });
    expect(api.mode).toBe("unconfigured");
    await expect(api.listSuppliers()).rejects.toMatchObject({ code: "unconfigured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("envía la cookie de sesión y los filtros no vacíos", async () => {
    const fetchImpl = vi.fn(() => reply(200, { items: [], total: 0 }));
    const api = createPurchasesApi({ baseUrl: "http://api.test/", fetchImpl });
    await api.listSuppliers({ search: "tech", active: "", limit: 12, offset: 0 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://api.test/api/admin/suppliers?search=tech&limit=12&offset=0");
    expect(init.credentials).toBe("include");
  });

  it("conserva el mensaje y el campo de un 422 del backend", async () => {
    const fetchImpl = vi.fn(() => reply(422, { detail: "El correo no tiene un formato válido.", field: "contact_email" }));
    const api = createPurchasesApi({ baseUrl: "http://api.test", fetchImpl });
    await expect(api.createSupplier({ name: "X" })).rejects.toMatchObject({
      status: 422, field: "contact_email", message: "El correo no tiene un formato válido.",
    });
  });

  it("distingue sesión vencida y conflicto", async () => {
    const api401 = createPurchasesApi({ baseUrl: "http://api.test", fetchImpl: () => reply(401, {}) });
    await expect(api401.listSuppliers()).rejects.toMatchObject({ code: "session_required" });
    const api409 = createPurchasesApi({ baseUrl: "http://api.test", fetchImpl: () => reply(409, { detail: "El identificador tributario ya está asociado a otro proveedor." }) });
    await expect(api409.createSupplier({ name: "X" })).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/tributario/) });
  });

  it("consulta un proveedor por id con una sola petición", async () => {
    const fetchImpl = vi.fn(() => reply(200, { supplier: { id: 101, name: "Último", active: false } }));
    const api = createPurchasesApi({ baseUrl: "http://api.test", fetchImpl });
    await expect(api.getSupplier("101")).resolves.toMatchObject({ name: "Último", active: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://api.test/api/admin/suppliers/101");
    expect(fetchImpl.mock.calls[0][1].credentials).toBe("include");
  });

  it("informa 404 si el proveedor no existe", async () => {
    const api = createPurchasesApi({ baseUrl: "http://api.test", fetchImpl: () => reply(404, { code: "supplier_not_found" }) });
    await expect(api.getSupplier(9)).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});
