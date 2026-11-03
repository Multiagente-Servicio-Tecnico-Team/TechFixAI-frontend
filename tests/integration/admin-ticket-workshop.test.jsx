import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "../../src/state/store.jsx";

const apiState = vi.hoisted(() => ({ mode: "api", rows: [], calls: [], fail: false, update: vi.fn() }));
vi.mock("../../src/features/workshop/ticketsApi.js", () => ({
  ticketsApi: {
    get mode() { return apiState.mode; },
    listTickets: async (filters) => {
      apiState.calls.push(filters);
      if (apiState.fail) throw new Error("Tickets no está disponible.");
      const matching = apiState.rows.filter((row) => (!filters.status || row.statusCode === filters.status) && (!filters.request_type || row.requestType === filters.request_type) && (!filters.origin || row.originCode === filters.origin) && (!filters.search || `${row.code} ${row.device} ${row.client}`.toLowerCase().includes(filters.search.toLowerCase())));
      return { items: matching.slice(filters.offset, filters.offset + filters.limit), total: matching.length, offset: filters.offset };
    },
    normalizeTicket: (row) => row,
    updateTicket: (...args) => apiState.update(...args),
  },
}));
import Workshop from "../../src/features/workshop/Workshop.jsx";

const makeRow = (id, statusCode = "NEW", requestType = "REPAIR") => ({
  id, code: `TCK-${id}`, client: `Cliente ${id}`, phone: "999123456", email: "", device: `Equipo ${id}`, issue: "No enciende",
  category: requestType === "PC_BUILD" ? "Armado de PC" : "Reparación", requestType, statusCode, status: statusCode === "NEW" ? "Nuevo" : "En reparación",
  origin: "Presencial", originCode: "MANUAL", budget: null, advance: null, date: "2 nov. 2026",
});

function renderBoard() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><StoreProvider><Workshop /></StoreProvider></MemoryRouter>);
}

describe("tablero administrativo conectado", () => {
  it("recorre las páginas completas, traduce datos, filtra y actualiza por PATCH", async () => {
    apiState.rows = [...Array.from({ length: 200 }, (_, i) => makeRow(i + 1)), makeRow(201, "IN_REPAIR", "PC_BUILD")];
    apiState.calls = [];
    apiState.fail = false;
    apiState.update.mockReset().mockResolvedValue(makeRow(1, "IN_REPAIR"));
    const user = userEvent.setup();
    renderBoard();

    expect(await screen.findByText("Equipo 3")).toBeInTheDocument();
    expect(apiState.calls.some((call) => call.offset === 200)).toBe(true);
    expect(screen.getByRole("region", { name: "Tablero por estado" })).toHaveTextContent("En reparación");

    await user.click(screen.getByRole("button", { name: "Armado de PC" }));
    expect(await screen.findByText("Equipo 201")).toBeInTheDocument();
    await waitFor(() => expect(apiState.calls.at(-1).request_type).toBe("PC_BUILD"));
    await user.type(screen.getByLabelText("Buscar tickets"), "TCK-201");
    await waitFor(() => expect(apiState.calls.at(-1).search).toBe("TCK-201"));

    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "IN_REPAIR");
    await waitFor(() => expect(apiState.calls.at(-1).status).toBe("IN_REPAIR"));

    await user.selectOptions(screen.getByLabelText("Filtrar por origen"), "ONLINE");
    apiState.rows[200].originCode = "ONLINE";
    await waitFor(() => expect(apiState.calls.at(-1).origin).toBe("ONLINE"));

    await user.selectOptions(screen.getByLabelText("Filtrar por origen"), "");
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "");
    await user.click(screen.getByRole("button", { name: "Todos" }));
    await user.clear(screen.getByLabelText("Buscar tickets"));
    await waitFor(() => expect(apiState.calls.at(-1).search).toBe(""));
    const move = screen.getByLabelText("Mover a, ticket TCK-1");
    await user.selectOptions(move, "IN_REPAIR");
    await waitFor(() => expect(apiState.update).toHaveBeenCalledWith(1, { status: "IN_REPAIR" }));
    expect(screen.queryByText("secret internals")).not.toBeInTheDocument();
  });

  it("exporta el conjunto completo que supera el límite de una página", async () => {
    apiState.rows = [...Array.from({ length: 200 }, (_, i) => makeRow(i + 1)), makeRow(201, "IN_REPAIR")];
    apiState.calls = [];
    apiState.fail = false;
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:ticket-export"), revokeObjectURL: vi.fn() });
    vi.stubGlobal("Blob", class { constructor(parts) { this.content = parts.join(""); } text() { return Promise.resolve(this.content); } });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    renderBoard();
    await waitFor(() => expect(screen.getByRole("button", { name: /Exportar Reporte/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /Exportar Reporte/ }));
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect((await blob.text()).split("\r\n")).toHaveLength(202);
  });

  it("muestra reintento ante error y no cae a datos demo", async () => {
    apiState.rows = [];
    apiState.calls = [];
    apiState.fail = true;
    renderBoard();
    expect(await screen.findByRole("alert")).toHaveTextContent("Tickets no está disponible");
    expect(screen.queryByText("PlayStation 5 Slim")).not.toBeInTheDocument();
    apiState.fail = false;
    apiState.rows = [makeRow(88)];
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Equipo 88")).toBeInTheDocument();
  });
});
