import { describe, expect, it, vi } from "vitest";
import { AccountingError, createAccountingApi } from "../../src/features/accounting/accountingApi.js";

const ok = (data, status = 200) => ({ ok: true, status, json: async () => data });
const failure = (status, data = {}) => ({ ok: false, status, json: async () => data });

describe("cliente de asientos contables", () => {
  it("se desactiva sin URL en desarrollo y no usa datos de demostración", async () => {
    const fetchImpl = vi.fn();
    const api = createAccountingApi({ fetchImpl });
    expect(api.mode).toBe("unconfigured");
    await expect(api.listCategories()).rejects.toMatchObject({ code: "unconfigured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("consulta categorías y listado con parámetros, cookie y misma base URL", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ok({ items: [{ id: 1, code: "SALE", name: "Venta" }] }))
      .mockResolvedValueOnce(ok({ items: [], total: 0, limit: 50, offset: 0 }));
    const api = createAccountingApi({ baseUrl: "http://localhost:8000/", fetchImpl });
    await api.listCategories();
    await api.listEntries({ from_date: "2026-11-01", category_id: 1, status: "CONFIRMED", entry_number: "9", limit: 50, offset: 0 });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://localhost:8000/api/admin/accounting/categories");
    expect(fetchImpl.mock.calls[0][1].credentials).toBe("include");
    const [url, options] = fetchImpl.mock.calls[1];
    expect(url).toContain("from_date=2026-11-01");
    expect(url).toContain("entry_number=9");
    expect(options.credentials).toBe("include");
  });

  it("consulta un detalle y serializa alta exacta con una clave idempotente", async () => {
    const entry = { id: 4, entry_number: "104", amount: "50.00" };
    const fetchImpl = vi.fn().mockResolvedValueOnce(ok(entry)).mockResolvedValueOnce(ok(entry, 201));
    const api = createAccountingApi({ baseUrl: "/backend", fetchImpl });
    await api.getEntry(4);
    await api.createEntry({ concept: "Servicio", lines: [{ debit: "50.00", credit: "0.00" }] }, "123e4567-e89b-42d3-a456-426614174000");
    expect(fetchImpl.mock.calls[0][0]).toBe("/backend/api/admin/accounting/entries/4");
    const [url, options] = fetchImpl.mock.calls[1];
    expect(url).toBe("/backend/api/admin/accounting/entries");
    expect(options.credentials).toBe("include");
    expect(options.headers["Idempotency-Key"]).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(JSON.parse(options.body).lines[0].debit).toBe("50.00");
  });

  it("reproduce la operación con la misma UUID y devuelve la respuesta replay del servidor", async () => {
    const created = { id: 4, entry_number: "104", status: "CONFIRMED" };
    const fetchImpl = vi.fn().mockResolvedValueOnce(ok(created, 201)).mockResolvedValueOnce(ok(created, 200));
    const api = createAccountingApi({ baseUrl: "/backend", fetchImpl });
    const payload = { concept: "Servicio", lines: [{ debit: "50.00", credit: "0.00" }] };
    const key = "123e4567-e89b-42d3-a456-426614174000";
    await expect(api.createEntry(payload, key)).resolves.toEqual(created);
    await expect(api.createEntry(payload, key)).resolves.toEqual(created);
    expect(fetchImpl.mock.calls.map(([, options]) => options.headers["Idempotency-Key"])).toEqual([key, key]);
  });

  it("envía reversión y conserva una base de same-origin en producción", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ original: {}, reversal: {} }, 201));
    const api = createAccountingApi({ baseUrl: "/backend", fetchImpl });
    await api.reverseEntry(4, { operation_date: "2026-11-02", reason: "Corrección" });
    expect(fetchImpl.mock.calls[0][0]).toBe("/backend/api/admin/accounting/entries/4/reverse");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).reason).toBe("Corrección");
  });

  it.each([401, 403, 404, 409, 422, 503])("mapea HTTP %i a un error seguro", async (status) => {
    const api = createAccountingApi({ baseUrl: "/backend", fetchImpl: vi.fn().mockResolvedValue(failure(status, { detail: "SQL privado", code: "internal" })) });
    await expect(api.listCategories()).rejects.toBeInstanceOf(AccountingError);
    await expect(api.listCategories()).rejects.not.toHaveProperty("message", "SQL privado");
  });

  it("mapea fallo de red a error seguro", async () => {
    const api = createAccountingApi({ baseUrl: "/backend", fetchImpl: vi.fn().mockRejectedValue(new Error("network secret")) });
    await expect(api.listCategories()).rejects.toMatchObject({ code: "network" });
  });
});
