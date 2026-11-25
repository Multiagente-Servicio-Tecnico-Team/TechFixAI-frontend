import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AccountingDetail from "../../src/features/accounting/AccountingDetail.jsx";

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const original = { id: 5, entry_number:"205", operation_date:"2026-02-01", concept:"Servicio", detail:"Detalle", category:{name:"Técnico"}, currency:"PEN", debit_total:"40.00", credit_total:"40.00", amount:"40.00", status:"CONFIRMED", responsible:{display_name:"Admin"}, created_at:"2026-02-01T10:00:00Z", updated_at:"2026-02-01T10:00:00Z", lines:[{line_number:1,account_code:"101",account_name:"Caja",debit:"40.00",credit:"0.00"},{line_number:2,account_code:"401",account_name:"Ingreso",debit:"0.00",credit:"40.00"}], audit_events:[] };
function renderDetail(api) { return render(<MemoryRouter future={future} initialEntries={["/taller/contabilidad/5"]}><Routes><Route path="/taller/contabilidad/:id" element={<AccountingDetail api={api}/>}/></Routes></MemoryRouter>); }
afterEach(cleanup);

describe("reversión contable", () => {
  it("confirma y presenta la reversión recibida, vinculada al original", async () => {
    const user = userEvent.setup();
    const api = { getEntry: vi.fn().mockResolvedValueOnce(original).mockResolvedValueOnce({...original,status:"REVERSED",reversal_entry_id:6}), reverseEntry: vi.fn().mockResolvedValue({ original:{...original,status:"REVERSED",reversal_entry_id:6}, reversal:{id:6,entry_number:"206"} }) };
    renderDetail(api);
    await user.click(await screen.findByRole("button", { name: /Revertir asiento/ }));
    await user.type(screen.getByLabelText(/Razón/), "Registro duplicado");
    await user.click(screen.getByRole("button", { name: "Confirmar reversión" }));
    expect(await screen.findByText("Reversión confirmada:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Asiento N.º 206" })).toHaveAttribute("href", "/taller/contabilidad/6");
    expect(api.reverseEntry).toHaveBeenCalledWith("5", { operation_date: expect.any(String), reason: "Registro duplicado" });
    expect(screen.queryByRole("button", { name: /Revertir asiento/ })).not.toBeInTheDocument();
  });

  it("en conflicto vuelve a consultar el original y no muestra éxito falso", async () => {
    const user = userEvent.setup();
    const changed = {...original, status:"REVERSED", reversal_entry_id:6};
    const api = { getEntry: vi.fn().mockResolvedValueOnce(original).mockResolvedValueOnce(changed), reverseEntry: vi.fn().mockRejectedValue(Object.assign(new Error("conflicto"), {status:409, code:"conflict"})) };
    renderDetail(api);
    await user.click(await screen.findByRole("button", { name: /Revertir asiento/ }));
    await user.type(screen.getByLabelText(/Razón/), "Corrección");
    await user.click(screen.getByRole("button", { name: "Confirmar reversión" }));
    expect(await screen.findByText("El asiento cambió o ya fue revertido. Se actualizó su estado.")).toBeInTheDocument();
    expect(api.getEntry).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Reversión confirmada:")).not.toBeInTheDocument();
  });
});
