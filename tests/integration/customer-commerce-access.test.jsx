import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../src/app/App.jsx";
import { StoreProvider } from "../../src/state/store.jsx";

function renderApp(path, session) {
  sessionStorage.setItem("techfix.session", JSON.stringify(session));
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><StoreProvider><App /></StoreProvider></MemoryRouter>);
}

describe("commerce route access", () => {
  it("denies a technician from the customer and sales administration routes", async () => {
    renderApp("/taller/clientes", { role: "staff", accountRole: "TECHNICIAN", name: "Técnico", email: "tech@example.pe" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/solo administradores pueden gestionar clientes y ventas/i);
    expect(screen.queryByRole("heading", { name: "Clientes comerciales" })).not.toBeInTheDocument();
  });

  it("denies a customer access to admin sales routes", async () => {
    renderApp("/taller/ventas", { role: "client", name: "Cliente", email: "client@example.pe" });
    expect(await screen.findByRole("heading", { name: "Ingresar al Panel del Taller" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ventas y pagos" })).not.toBeInTheDocument();
  });

  it("allows ADMIN into the commercial area but backend still supplies its records", async () => {
    renderApp("/taller/ventas", { role: "staff", accountRole: "ADMIN", name: "Admin", email: "admin@example.pe" });
    expect(await screen.findByRole("heading", { name: "Ventas y pagos" })).toBeInTheDocument();
  });
});
