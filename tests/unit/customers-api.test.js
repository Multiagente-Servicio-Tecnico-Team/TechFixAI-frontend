import { describe, expect, it, vi } from "vitest";
import { createCustomersApi } from "../../src/features/customers/customersApi.js";
import { customerDto } from "./fixtures/customerCommerce.js";

const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("commercial customers API", () => {
  it("uses paginated search instead of an email-specific identity lookup", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { items: [customerDto], total: 1, limit: 50, offset: 0 }));
    const api = createCustomersApi({ baseUrl: "https://api.test", fetchImpl });
    const page = await api.list({ search: "ana", limit: 50, offset: 0 });
    expect(fetchImpl.mock.calls[0][0]).toContain("/api/admin/customers?search=ana");
    expect(page.items[0]).toMatchObject({ id: 31, accountLinked: false });
  });

  it("creates a manual customer without account or credential fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(201, customerDto));
    const api = createCustomersApi({ baseUrl: "https://api.test", fetchImpl });
    await api.create({ display_name: "Ana Torres", phone: "+51987654321", email: "" });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toEqual({ display_name: "Ana Torres", phone: "+51987654321", email: null });
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("user_id");
  });

  it("includes the session cookie and maps authorization failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(403, {}));
    const api = createCustomersApi({ baseUrl: "https://api.test", fetchImpl });
    await expect(api.list()).rejects.toMatchObject({ status: 403, message: expect.stringContaining("ADMIN") });
    expect(fetchImpl.mock.calls[0][1].credentials).toBe("include");
  });

  it("updates only the selected commercial profile through PATCH", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, customerDto));
    const api = createCustomersApi({ baseUrl: "https://api.test", fetchImpl });
    await api.update(31, { display_name: " Ana Torres ", phone: " +51987654321 ", email: " " });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.test/api/admin/customers/31");
    expect(fetchImpl.mock.calls[0][1].method).toBe("PATCH");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ display_name: "Ana Torres", phone: "+51987654321", email: null });
  });
});
