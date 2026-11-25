import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminCommerce from "../../src/features/commerce/AdminCommerce.jsx";
import SalesQuoteForm from "../../src/features/commerce/SalesQuoteForm.jsx";

vi.mock("../../src/features/workshop/inventoryApi.js", () => ({ inventoryApi: { mode: "api", list: vi.fn().mockResolvedValue([{ id: 44, name: "SSD SATA 480 GB", sku: "SSD-480", stock: 5, price: 48000 }]) } }));
vi.mock("../../src/features/customers/customersApi.js", () => ({ customersApi: { mode: "api", list: vi.fn().mockResolvedValue({ items: [{ id: 31, name: "Ana Torres", phone: "+51987654321", email: "ana@example.pe", originLabel: "Portal", accountLinked: true }], total: 1 }), create: vi.fn() } }));

const pendingAccepted = { id: 71, customerId: 31, customer_name: "Ana Torres", kind: "DIRECT_SALE", kindLabel: "Venta de productos", status: "ACCEPTED", statusLabel: "Aceptada", paymentStatus: "PENDING", paymentStatusLabel: "Pendiente", reservationStatus: "RESERVED", totalAmount: "480.00", lines: [{ sparePartId: 44, name: "SSD SATA 480 GB", quantity: 1, subtotal: "480.00" }] };

describe("ADMIN commerce", () => {
  it("requires explicit customer acceptance evidence before recording a manual acceptance", async () => {
    const api = {
      listAdminSalesQuotes: vi.fn().mockResolvedValue([{ ...pendingAccepted, status: "PENDING", statusLabel: "Pendiente", paymentStatus: null, paymentStatusLabel: null }]),
      listAdminSalesOrders: vi.fn().mockResolvedValue([]),
      listAdminPayments: vi.fn().mockResolvedValue([]),
      recordManualAcceptance: vi.fn().mockResolvedValue(pendingAccepted),
    };
    const user = userEvent.setup();
    render(<AdminCommerce api={api} />);
    await user.click(await screen.findByRole("button", { name: /registrar aceptación presencial/i }));
    const submit = screen.getByRole("button", { name: /confirmar aceptación del cliente/i });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/evidencia o nota/i), "Aceptó en mostrador");
    await user.click(submit);
    expect(api.recordManualAcceptance).toHaveBeenCalledWith(71, { confirmation_channel: "IN_PERSON", notes: "Aceptó en mostrador" }, { idempotencyKey: expect.any(String) });
  });

  it("confirms an external payment and only then shows the backend sale", async () => {
    const api = {
      listAdminSalesQuotes: vi.fn().mockResolvedValue([pendingAccepted]),
      listAdminSalesOrders: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([{
        id: 90, quoteId: 71, paymentId: 81, status: "PAID", statusLabel: "Pagada", totalAmount: "480.00", lines: [],
      }]),
      listAdminPayments: vi.fn().mockResolvedValue([]),
      confirmAdminPayment: vi.fn().mockResolvedValue({ id: 90, quoteId: 71, paymentId: 81, status: "PAID", statusLabel: "Pagada", totalAmount: "480.00", lines: [] }),
    };
    const user = userEvent.setup();
    render(<AdminCommerce api={api} />);
    await user.click(await screen.findByRole("button", { name: /confirmar pago recibido/i }));
    await user.click(screen.getByRole("button", { name: /confirmar pago y registrar venta/i }));
    expect(api.confirmAdminPayment).toHaveBeenCalledWith(71, { method: "CASH", transaction_reference: null, notes: null }, { idempotencyKey: expect.any(String) });
    expect(await screen.findByText(/Venta #90/)).toBeInTheDocument();
  });

  it("creates a sale quote with the selected numeric inventory ID and no ticket ID", async () => {
    const api = { createAdminSalesQuote: vi.fn().mockResolvedValue({ id: 72 }) };
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<SalesQuoteForm api={api} onCreated={onCreated} />);
    await user.click(await screen.findByRole("button", { name: "Buscar" }));
    await user.click(await screen.findByRole("button", { name: /Ana Torres/ }));
    await user.selectOptions(await screen.findByLabelText(/Repuesto 1/), "44");
    await user.click(screen.getByRole("button", { name: "Crear cotización" }));
    expect(api.createAdminSalesQuote).toHaveBeenCalledWith(expect.objectContaining({ customer_id: 31, lines: [{ spare_part_id: 44, quantity: 1 }], expires_at: expect.any(String) }));
    expect(api.createAdminSalesQuote.mock.calls[0][0]).not.toHaveProperty("ticket_id");
    expect(onCreated).toHaveBeenCalled();
  });
});
