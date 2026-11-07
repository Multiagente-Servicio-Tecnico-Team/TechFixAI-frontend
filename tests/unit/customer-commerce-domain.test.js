import { describe, expect, it } from "vitest";
import { normalizeCommercialQuote, normalizeCommercialTicket, normalizeCustomer, normalizePayment, normalizeSalesOrder } from "../../src/domain/customerCommerce.js";
import { customerDto, orderDto, paymentDto, quoteDto, ticketDto } from "./fixtures/customerCommerce.js";

describe("customer commerce domain", () => {
  it("normalizes a customer without treating it as an account", () => {
    expect(normalizeCustomer(customerDto)).toMatchObject({ id: 31, name: "Ana Torres", accountLinked: false });
  });

  it("preserves canonical quote, payment and order statuses with Spanish labels", () => {
    expect(normalizeCommercialQuote(quoteDto)).toMatchObject({ status: "ACCEPTED", statusLabel: "Aceptada", paymentStatus: "PENDING", paymentStatusLabel: "Pendiente" });
    expect(normalizePayment(paymentDto)).toMatchObject({ status: "PENDING", statusLabel: "Pendiente" });
    expect(normalizeSalesOrder(orderDto)).toMatchObject({ status: "PAID", statusLabel: "Pagada" });
  });

  it("keeps all ticket quotes when the plural contract is present", () => {
    const normalized = normalizeCommercialTicket({ ...ticketDto, quotes: [quoteDto, { ...quoteDto, id: 73 }] });
    expect(normalized.quotes.map(({ id }) => id)).toEqual([71, 73]);
  });

  it("uses the singular legacy quote only when quotes is absent", () => {
    expect(normalizeCommercialTicket({ id: 15, quote: quoteDto }).quotes).toHaveLength(1);
    expect(normalizeCommercialTicket({ id: 15, quotes: [], quote: quoteDto }).quotes).toEqual([]);
  });

  it("does not mutate canonical codes or turn acceptance into payment completion", () => {
    const normalized = normalizeCommercialQuote(quoteDto);
    expect(normalized.kind).toBe("DIRECT_SALE");
    expect(normalized.status).toBe("ACCEPTED");
    expect(normalized.paymentStatus).toBe("PENDING");
    expect(normalized.totalAmount).toBe("150.00");
  });
});
