import { describe, expect, it, vi } from "vitest";
import { createCommerceApi } from "../../src/features/commerce/commerceApi.js";
import { orderDto, quoteDto, ticketDto } from "./fixtures/customerCommerce.js";

const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("commercial API", () => {
  it("loads portal resources with cookie credentials and no customer identifier", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { tickets: [ticketDto] }));
    const api = createCommerceApi({ baseUrl: "https://api.test", fetchImpl });
    const tickets = await api.listMyTickets();
    expect(tickets[0].quotes).toHaveLength(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.test/api/customer/tickets");
    expect(fetchImpl.mock.calls[0][1].credentials).toBe("include");
    expect(fetchImpl.mock.calls[0][1].body).toBeUndefined();
  });

  it("strips ownership and contact overrides from a portal ticket request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(201, ticketDto));
    const api = createCommerceApi({ baseUrl: "https://api.test", fetchImpl });
    await api.createMyTicket({ title: "Laptop", failure_description: "No enciende", request_type: "REPAIR", customer_id: 999, contact_name: "Otra persona" });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ title: "Laptop", failure_description: "No enciende", request_type: "REPAIR" });
  });

  it("accepts a quote with idempotency header and does not change payment state", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { ...quoteDto, payment_status: "PENDING" }));
    const api = createCommerceApi({ baseUrl: "https://api.test", fetchImpl, createIdempotencyKey: () => "same-action-key" });
    const quote = await api.acceptMyQuote(71);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.test/api/customer/quotes/71/acceptance");
    expect(fetchImpl.mock.calls[0][1].headers["Idempotency-Key"]).toBe("same-action-key");
    expect(quote.status).toBe("ACCEPTED");
    expect(quote.paymentStatus).toBe("PENDING");
  });

  it("uses numeric inventory IDs when creating a direct sale quote", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(201, quoteDto));
    const api = createCommerceApi({ baseUrl: "https://api.test", fetchImpl });
    await api.createAdminSalesQuote({ customer_id: 31, lines: [{ spare_part_id: 4, quantity: 1 }], expires_at: "2027-01-01T00:00:00Z" });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).lines[0]).toEqual({ spare_part_id: 4, quantity: 1 });
    expect(fetchImpl.mock.calls[0][0]).toContain("/api/admin/sales-quotes");
  });

  it("returns the backend sale after an idempotent payment confirmation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(201, orderDto));
    const api = createCommerceApi({ baseUrl: "https://api.test", fetchImpl });
    const order = await api.confirmAdminPayment(71, { method: "CASH" }, { idempotencyKey: "confirm-once" });
    expect(fetchImpl.mock.calls[0][1].headers["Idempotency-Key"]).toBe("confirm-once");
    expect(order.id).toBe(90);
  });

  it("does not turn a missing commercial profile into an account ID fallback", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(403, { code: "customer_profile_missing" }));
    const api = createCommerceApi({ baseUrl: "https://api.test", fetchImpl });
    await expect(api.listMyTickets()).rejects.toMatchObject({ code: "customer_profile_missing", message: expect.stringContaining("perfil comercial") });
  });
});
