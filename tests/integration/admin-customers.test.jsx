import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CustomerManager from "../../src/features/customers/CustomerManager.jsx";
import CustomerPicker from "../../src/features/customers/CustomerPicker.jsx";

const first = { id: 1, name: "Ana Torres", phone: "+51987654321", email: "ana@example.pe", originLabel: "Portal", accountLinked: true };
const second = { id: 2, name: "Ana Torres", phone: "+51911111111", email: "ana@example.pe", originLabel: "Presencial", accountLinked: false };

describe("ADMIN commercial customers", () => {
  it("requires an explicit choice for ambiguous contact results", async () => {
    const api = { list: vi.fn().mockResolvedValue({ items: [first, second], total: 2 }), create: vi.fn() };
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CustomerPicker api={api} value={null} onChange={onChange} />);
    await user.type(screen.getByLabelText(/buscar por nombre/i), "Ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findAllByRole("button", { name: /Ana Torres/ })).toHaveLength(2);
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole("button", { name: /Ana Torres/ })[1]);
    expect(onChange).toHaveBeenCalledWith(second);
  });

  it("creates a manual customer without creating a portal account", async () => {
    const created = { ...second, id: 33 };
    const api = { list: vi.fn(), create: vi.fn().mockResolvedValue(created) };
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CustomerPicker api={api} value={null} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /registrar cliente sin cuenta/i }));
    await user.type(screen.getByLabelText(/nombre o razón social/i), "Ana Torres");
    await user.type(screen.getByLabelText(/Teléfono.*obligatorio/i), "+51911111111");
    await user.click(screen.getByRole("button", { name: "Crear y seleccionar" }));
    expect(api.create).toHaveBeenCalledWith({ display_name: "Ana Torres", phone: "+51911111111", email: "" });
    expect(onChange).toHaveBeenCalledWith(created);
  });

  it("lists customer origin and account link as read-only information", async () => {
    const api = { list: vi.fn().mockResolvedValue({ items: [first], total: 1 }), create: vi.fn() };
    render(<MemoryRouter><CustomerManager api={api} /></MemoryRouter>);
    expect(await screen.findByText("Cuenta del portal vinculada")).toBeInTheDocument();
    expect(screen.getAllByText("Portal")).toHaveLength(2); // Filtro y origen del registro.
    expect(screen.queryByRole("button", { name: /vincular cuenta/i })).not.toBeInTheDocument();
  });
});
