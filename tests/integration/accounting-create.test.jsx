import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AccountingCreate from "../../src/features/accounting/AccountingCreate.jsx";
import EntryLinesEditor from "../../src/features/accounting/EntryLinesEditor.jsx";
import { calculateEntryTotals } from "../../src/domain/accounting.js";
import { StoreProvider } from "../../src/state/store.jsx";

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const categories = { items: [{ id: 1, code: "SERVICE", name: "Servicio técnico" }] };

function renderForm(api) {
  return render(
    <MemoryRouter future={future}>
      <StoreProvider><AccountingCreate api={api} /></StoreProvider>
    </MemoryRouter>,
  );
}

async function completeBalancedForm(user) {
  await user.selectOptions(await screen.findByLabelText(/Categoría/), "1");
  await user.type(screen.getByLabelText(/Concepto/), "Mantenimiento preventivo");
  await user.type(screen.getByLabelText(/Detalle/), "Servicio realizado en taller");
  await user.type(screen.getByLabelText(/Código de cuenta, línea 1/), "101");
  await user.type(screen.getByLabelText(/Nombre de cuenta, línea 1/), "Caja");
  await user.type(screen.getByLabelText(/Debe, línea 1/), "50.00");
  await user.type(screen.getByLabelText(/Código de cuenta, línea 2/), "401");
  await user.type(screen.getByLabelText(/Nombre de cuenta, línea 2/), "Ingresos");
  await user.type(screen.getByLabelText(/Haber, línea 2/), "50.00");
}

afterEach(() => cleanup());

describe("alta contable", () => {
  it("revisa y confirma una sola vez y presenta el correlativo devuelto", async () => {
    const user = userEvent.setup();
    const api = {
      listCategories: vi.fn().mockResolvedValue(categories),
      createEntry: vi.fn().mockResolvedValue({ id: 17, entry_number: "117", status: "CONFIRMED", amount: "50.00", responsible: { display_name: "Admin" } }),
    };
    renderForm(api);
    await completeBalancedForm(user);
    expect(screen.getAllByText("S/. 50.00")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Revisar y registrar" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("no se podrá editar ni borrar");
    const confirm = screen.getByRole("button", { name: "Registrar asiento" });
    await user.click(confirm);
    expect(await screen.findByRole("heading", { name: /Asiento N.º 117/ })).toBeInTheDocument();
    expect(api.createEntry).toHaveBeenCalledTimes(1);
    expect(api.createEntry.mock.calls[0][0].lines[0].debit).toBe("50.00");
    expect(api.createEntry.mock.calls[0][1]).toMatch(/[0-9a-f-]{36}/i);
  });

  it("no permite revisar si hay un desbalance o líneas sin una cuenta", async () => {
    const user = userEvent.setup();
    const api = { listCategories: vi.fn().mockResolvedValue(categories), createEntry: vi.fn() };
    renderForm(api);
    await completeBalancedForm(user);
    await user.clear(screen.getByLabelText(/Haber, línea 2/));
    await user.click(screen.getByRole("button", { name: "Revisar y registrar" }));
    expect(screen.getByText(/Cada línea debe tener un importe positivo/i)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(api.createEntry).not.toHaveBeenCalled();
  });

  it("conserva la misma clave al reintentar la misma solicitud incierta", async () => {
    const user = userEvent.setup();
    const api = {
      listCategories: vi.fn().mockResolvedValue(categories),
      createEntry: vi.fn().mockRejectedValueOnce(Object.assign(new Error("network"), { code: "network" }))
        .mockResolvedValueOnce({ id: 17, entry_number: "117", status: "CONFIRMED", amount: "50.00" }),
    };
    renderForm(api);
    await completeBalancedForm(user);
    await user.click(screen.getByRole("button", { name: "Revisar y registrar" }));
    await user.click(screen.getByRole("button", { name: "Registrar asiento" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar registro" }));
    await waitFor(() => expect(api.createEntry).toHaveBeenCalledTimes(2));
    expect(api.createEntry.mock.calls[0]).toEqual(api.createEntry.mock.calls[1]);
  });

  it("respeta el mínimo de dos líneas y desactiva añadir al llegar a cien", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const lines = Array.from({ length: 100 }, (_, i) => ({ account_code: String(i + 1), account_name: `Cuenta ${i + 1}`, description: "", debit: "1.00", credit: "" }));
    const { rerender } = render(<EntryLinesEditor lines={lines} onChange={change} totals={calculateEntryTotals(lines)} />);
    expect(screen.getByRole("button", { name: /Añadir línea/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Quitar línea 1" }));
    expect(change).toHaveBeenCalledWith(lines.slice(1));
    const minimum = lines.slice(0, 2);
    rerender(<EntryLinesEditor lines={minimum} onChange={change} totals={calculateEntryTotals(minimum)} />);
    expect(screen.getByRole("button", { name: "Quitar línea 1" })).toBeDisabled();
  });
});
