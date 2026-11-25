import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PurchaseDetail from "../../src/features/purchases/PurchaseDetail.jsx";

const purchase = {
  id: 7, supplier_id: 3, supplier_name: "Distribuidora Tech", supplier_tax_id: "20601234567", purchase_order_id: null,
  document_type: "FACTURA", document_series: "F001", document_number: "123", issue_date: "2026-11-10", due_date: null,
  currency: "PEN", subtotal: "65.00", tax_total: "0.00", discount_total: "0.00", other_charges: "0.00", total_amount: "65.00",
  payment_method: "TRANSFER", payment_status: "PENDING", status: "REGISTERED", notes: null,
  created_at: "2026-11-10T10:00:00Z", updated_at: "2026-11-10T10:00:00Z",
  items: [
    { id: 11, spare_part_id: 5, code_snapshot: "RAM-16", description: "Memoria RAM 16GB", quantity: "2", unit_cost: "30.00", discount_amount: "0.00", tax_amount: "0.00", line_total: "60.00" },
    { id: 12, spare_part_id: null, code_snapshot: null, description: "Flete", quantity: "1", unit_cost: "5.00", discount_amount: "0.00", tax_amount: "0.00", line_total: "5.00" },
  ],
  receipts: [], audit_events: [],
};

function renderDetail(api) {
  return render(
    <MemoryRouter initialEntries={["/taller/compras/7"]}>
      <Routes><Route path="/taller/compras/:id" element={<PurchaseDetail api={api} />} /></Routes>
    </MemoryRouter>,
  );
}

describe("detalle de compra", () => {
  it("muestra el formulario de recepción de una compra pendiente y la confirma con clave de idempotencia", async () => {
    const api = {
      mode: "api",
      getPurchase: vi.fn().mockResolvedValue(purchase),
      listReceipts: vi.fn().mockResolvedValue([]),
      receivePurchase: vi.fn().mockResolvedValue({ receipt: { id: 1, items: [] }, replayed: false }),
    };
    const user = userEvent.setup();
    renderDetail(api);
    // Antes de corregirse, esta sección fallaba al dibujarse (Field no estaba importado).
    expect(await screen.findByRole("heading", { name: "Confirmar recepción" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Memoria RAM 16GB · pendiente 2/)).toHaveValue("2");
    await user.click(screen.getByRole("button", { name: "Revisar cantidades" }));
    await user.click(screen.getByRole("button", { name: "Confirmar recepción" }));
    await waitFor(() => expect(api.receivePurchase).toHaveBeenCalledTimes(1));
    const [id, payload, key] = api.receivePurchase.mock.calls[0];
    expect(String(id)).toBe("7");
    expect(payload.items).toEqual(expect.arrayContaining([expect.objectContaining({ purchase_item_id: 11 })]));
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
