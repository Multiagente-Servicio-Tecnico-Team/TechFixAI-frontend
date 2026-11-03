import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "../../src/state/store.jsx";

const apiState = vi.hoisted(() => ({ mode: "api" }));
vi.mock("../../src/features/workshop/ticketsApi.js", () => ({ ticketsApi: { get mode() { return apiState.mode; } } }));
import TicketAdminRoute from "../../src/features/workshop/TicketAdminRoute.jsx";
import StaffLayout from "../../src/app/layouts/StaffLayout.jsx";

const renderProtected = (accountRole) => render(<MemoryRouter><StoreProvider><TicketAdminRoute><p>Cola protegida</p></TicketAdminRoute></StoreProvider></MemoryRouter>);

describe("acceso a tickets administrativos", () => {
  it("permite ADMIN cuando la API está configurada", () => {
    apiState.mode = "api";
    sessionStorage.setItem("techfix.session", JSON.stringify({ role: "staff", accountRole: "ADMIN" }));
    renderProtected("ADMIN");
    expect(screen.getByText("Cola protegida")).toBeInTheDocument();
  });

  it("deniega TECHNICIAN con un mensaje estático", () => {
    apiState.mode = "api";
    sessionStorage.setItem("techfix.session", JSON.stringify({ role: "staff", accountRole: "TECHNICIAN" }));
    renderProtected("TECHNICIAN");
    expect(screen.getByRole("alert")).toHaveTextContent(/solo administradores/i);
    expect(screen.queryByText("Cola protegida")).not.toBeInTheDocument();
  });

  it("oculta enlaces de tickets ADMIN a TECHNICIAN en modo API", () => {
    apiState.mode = "api";
    sessionStorage.setItem("techfix.session", JSON.stringify({ role: "staff", accountRole: "TECHNICIAN" }));
    render(<MemoryRouter><StoreProvider><StaffLayout /></StoreProvider></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Banco" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nuevo Ticket" })).not.toBeInTheDocument();
  });

  it("conserva acceso demo si no hay URL del servicio", () => {
    apiState.mode = "demo";
    sessionStorage.setItem("techfix.session", JSON.stringify({ role: "staff", accountRole: "TECHNICIAN" }));
    renderProtected("TECHNICIAN");
    expect(screen.getByText("Cola protegida")).toBeInTheDocument();
  });
});
