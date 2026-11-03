import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AccountingList from "../../src/features/accounting/AccountingList.jsx";

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const rows = [{ id: 4, entry_number: "105", operation_date: "2026-03-01", concept: "Compra de repuesto", category: { name: "Repuestos" }, amount: "125.50", status: "CONFIRMED", responsible: { display_name: "Admin" } }];
function renderList(api) { return render(<MemoryRouter future={future}><AccountingList api={api}/></MemoryRouter>); }
afterEach(cleanup);

describe("listado contable", () => {
  it("lista resumen, total y acceso al detalle con 50 resultados por página", async () => {
    const api = { listEntries: vi.fn().mockResolvedValue({ items: rows, total: 51, limit: 50, offset: 0 }), listCategories: vi.fn().mockResolvedValue({items:[]}) };
    renderList(api);
    expect(await screen.findByRole("link", { name: "Asiento N.º 105" })).toHaveAttribute("href", "/taller/contabilidad/4");
    expect(screen.getByText("Compra de repuesto")).toBeInTheDocument();
    expect(screen.getByText("S/. 125.50")).toBeInTheDocument();
    expect(screen.getByText("51 asientos")).toBeInTheDocument();
    expect(api.listEntries).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, offset: 0 }));
  });

  it("envía filtros y permite limpiarlos; muestra error y reintenta", async () => {
    const user = userEvent.setup();
    const api = { listEntries: vi.fn().mockRejectedValueOnce(new Error("Servicio no disponible")).mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }), listCategories: vi.fn().mockResolvedValue({items:[{id:2,name:"Repuestos"}]}) };
    renderList(api);
    expect(await screen.findByRole("alert")).toHaveTextContent("Servicio no disponible");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText("Todavía no hay asientos registrados.");
    await user.type(screen.getByLabelText("Correlativo"), "105");
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(api.listEntries).toHaveBeenLastCalledWith(expect.objectContaining({ entry_number: "105", limit: 50, offset: 0 })));
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(api.listEntries).toHaveBeenLastCalledWith(expect.objectContaining({ entry_number: "", limit: 50, offset: 0 })));
  });
});
