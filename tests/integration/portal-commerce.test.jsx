import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tickets from "../../src/features/tickets/Tickets.jsx";
import { StoreProvider } from "../../src/state/store.jsx";
import { ticketDto, quoteDto } from "../unit/fixtures/customerCommerce.js";

function renderTickets(api) {
  return render(<MemoryRouter><StoreProvider><Tickets api={api} /></StoreProvider></MemoryRouter>);
}

describe("portal commerce", () => {
  it("shows all service quotes from the session-scoped ticket response", async () => {
    const api = { mode: "api", listMyTickets: vi.fn().mockResolvedValue([{ ...ticketDto, quotes: [quoteDto, { ...quoteDto, id: 72, total_amount: "220.00" }] }]) };
    renderTickets(api);
    expect(await screen.findByText(/2 cotizaciones de servicio/i)).toBeInTheDocument();
    expect(screen.getAllByText("S/. 150.00")).toHaveLength(2);
    expect(screen.getAllByText("S/. 220.00")).toHaveLength(2);
  });

  it("shows a recoverable profile message without switching to demo tickets", async () => {
    const api = { mode: "api", listMyTickets: vi.fn().mockRejectedValue(Object.assign(new Error("Tu cuenta todavía no tiene un perfil comercial disponible."), { code: "customer_profile_missing" })) };
    renderTickets(api);
    expect(await screen.findByRole("alert")).toHaveTextContent(/perfil comercial/i);
    expect(screen.queryByText(/consultas de ejemplo/i)).not.toBeInTheDocument();
  });

  it("keeps an empty response separate from sales quotations", async () => {
    const api = { mode: "api", listMyTickets: vi.fn().mockResolvedValue([]) };
    renderTickets(api);
    expect(await screen.findByText(/Todavía no tienes tickets/i)).toBeInTheDocument();
  });
});
