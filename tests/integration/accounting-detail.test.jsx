import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AccountingDetail from "../../src/features/accounting/AccountingDetail.jsx";

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const detail = { id: 5, entry_number: "205", operation_date: "2026-02-01", concept: "Servicio", detail: "Reparación de equipo", category: { name: "Técnico" }, currency: "PEN", debit_total: "40.00", credit_total: "40.00", amount: "40.00", status: "CONFIRMED", responsible: { display_name: "Admin" }, created_at: "2026-02-01T10:00:00Z", updated_at: "2026-02-01T10:00:00Z", lines: [{line_number:2, account_code:"401", account_name:"Ingreso", debit:"0.00", credit:"40.00"}, {line_number:1, account_code:"101", account_name:"Caja", debit:"40.00", credit:"0.00"}], audit_events:[{event_type:"ENTRY_CREATED", actor:{display_name:"Admin"},created_at:"2026-02-01T10:00:00Z"}] };
function renderDetail(api) { return render(<MemoryRouter future={future} initialEntries={["/taller/contabilidad/5"]}><Routes><Route path="/taller/contabilidad/:id" element={<AccountingDetail api={api}/>}/></Routes></MemoryRouter>); }
afterEach(cleanup);

describe("detalle contable", () => {
  it("presenta resumen, líneas ordenadas, responsable, historial y acción permitida", async () => {
    renderDetail({ getEntry: vi.fn().mockResolvedValue(detail), reverseEntry: vi.fn() });
    expect(await screen.findByRole("heading", { name: "Asiento N.º 205" })).toBeInTheDocument();
    expect(screen.getByText("Reparación de equipo")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("101");
    expect(rows[2]).toHaveTextContent("401");
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Asiento registrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revertir asiento/ })).toBeInTheDocument();
  });

  it("muestra 404 de forma recuperable y ofrece volver al listado", async () => {
    renderDetail({ getEntry: vi.fn().mockRejectedValue(new Error("Este asiento ya no está disponible")) });
    expect(await screen.findByRole("alert")).toHaveTextContent("ya no está disponible");
    expect(screen.getByRole("link", { name: "Volver a Contabilidad" })).toHaveAttribute("href", "/taller/contabilidad");
  });
});
