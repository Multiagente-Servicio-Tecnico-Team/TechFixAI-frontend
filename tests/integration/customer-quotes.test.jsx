import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CustomerQuotes from "../../src/features/commerce/CustomerQuotes.jsx";
import CustomerOrders from "../../src/features/commerce/CustomerOrders.jsx";

const quote = { id: 71, kind: "DIRECT_SALE", kindLabel: "Venta de productos", status: "PENDING", statusLabel: "Pendiente", totalAmount: "150.00", paymentStatus: "PENDING", paymentStatusLabel: "Pendiente", lines: [{ name: "Memoria DDR4", quantity: 1, subtotal: "150.00" }] };

function renderQuotes(api) {
  return render(<MemoryRouter initialEntries={["/portal/cotizaciones"]}><Routes><Route path="/portal/cotizaciones" element={<CustomerQuotes api={api} />} /><Route path="/portal/acceso" element={<h1>Acceso</h1>} /></Routes></MemoryRouter>);
}

describe("customer quotes", () => {
  it("keeps offer acceptance separate from payment and displays backend response", async () => {
    const api = { listMyQuotes: vi.fn().mockResolvedValue([quote]), acceptMyQuote: vi.fn().mockResolvedValue({ ...quote, status: "ACCEPTED", statusLabel: "Aceptada" }) };
    const user = userEvent.setup();
    renderQuotes(api);
    await user.click(await screen.findByRole("button", { name: /aceptar cotización/i }));
    expect(await screen.findByText(/Oferta: Aceptada/i)).toBeInTheDocument();
    expect(screen.getByText(/Pago: Pendiente/i)).toBeInTheDocument();
    expect(api.acceptMyQuote).toHaveBeenCalledWith(71, { idempotencyKey: expect.any(String) });
  });

  it("keeps the same idempotency key when retrying an uncertain acceptance", async () => {
    const api = { listMyQuotes: vi.fn().mockResolvedValue([quote]), acceptMyQuote: vi.fn().mockRejectedValueOnce(new Error("Red inestable")).mockResolvedValue({ ...quote, status: "ACCEPTED", statusLabel: "Aceptada" }) };
    const user = userEvent.setup();
    renderQuotes(api);
    await user.click(await screen.findByRole("button", { name: /aceptar cotización/i }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: /aceptar cotización/i }));
    expect(api.acceptMyQuote.mock.calls[0][1].idempotencyKey).toBe(api.acceptMyQuote.mock.calls[1][1].idempotencyKey);
  });

  it("shows confirmed payment and sales to the customer without payment controls", async () => {
    const api = {
      listMyPayments: vi.fn().mockResolvedValue([{ id: 4, quoteId: 71, status: "COMPLETED", statusLabel: "Pagado", amount: "150.00" }]),
      listMySalesOrders: vi.fn().mockResolvedValue([{ id: 90, quoteId: 71, status: "PAID", statusLabel: "Pagada", totalAmount: "150.00", lines: [] }]),
    };
    render(<MemoryRouter><CustomerOrders api={api} /></MemoryRouter>);
    expect(await screen.findByText(/Venta #90/)).toBeInTheDocument();
    expect(screen.getByText(/Pagado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar pago/i })).not.toBeInTheDocument();
  });
});
