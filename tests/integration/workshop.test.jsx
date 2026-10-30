import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "../../src/state/store.jsx";
import Workshop from "../../src/features/workshop/Workshop.jsx";

function renderBoard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StoreProvider><Workshop /></StoreProvider>
    </MemoryRouter>
  );
}

const station = (name) => screen.getByRole("region", { name: "Tablero por estado" }).querySelector(`section[aria-label="${name}"]`);

describe("tablero del taller", () => {
  it("muestra cada ticket en su estación y lo mueve al cambiar el estado", async () => {
    const user = userEvent.setup();
    renderBoard();

    expect(within(station("Nuevo")).getByText("PlayStation 5 Slim")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Mover a, ticket TCK-2037"), "Esperando Stock");

    expect(within(station("Nuevo")).queryByText("PlayStation 5 Slim")).not.toBeInTheDocument();
    expect(within(station("Esperando Stock")).getByText("PlayStation 5 Slim")).toBeInTheDocument();
  });

  it("filtra por búsqueda, categoría y estado", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.type(screen.getByLabelText("Buscar tickets"), "Dell");
    expect(screen.getByText("Dell XPS 15 9520")).toBeInTheDocument();
    expect(screen.queryByText("PlayStation 5 Slim")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Buscar tickets"));
    await user.click(screen.getByRole("button", { name: "Venta" }));
    expect(screen.queryByText("Dell XPS 15 9520")).not.toBeInTheDocument();
    expect(screen.getByText("Armado PC Workstation Threadripper")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "Nuevo");
    expect(screen.getByText("No hay tickets con estos filtros.")).toBeInTheDocument();
  });
});
