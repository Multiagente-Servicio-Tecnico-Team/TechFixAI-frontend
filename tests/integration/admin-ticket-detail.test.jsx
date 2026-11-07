import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "../../src/state/store.jsx";

const ticketApiState = vi.hoisted(() => ({ mode: "api", getTicket: vi.fn(), updateTicket: vi.fn(), createServiceQuote: vi.fn() }));
vi.mock("../../src/features/workshop/ticketsApi.js", () => ({ ticketsApi: ticketApiState }));
vi.mock("../../src/features/workshop/inventoryApi.js", () => ({ inventoryApi: { mode: "api", list: vi.fn().mockResolvedValue([{ id: 4, name: "Memoria DDR4", sku: "RAM-4", stock: 10, price: 15000 }]) } }));
import TicketDetail from "../../src/features/workshop/TicketDetail.jsx";

const detail = (changes = {}) => ({
  id: 76, code: "TCK-76", client: "María Torres", phone: "999123456", email: "maria@test.pe", device: "Lenovo ThinkPad", issue: "No enciende",
  requestType: "REPAIR", category: "Reparación", statusCode: "NEW", status: "Nuevo", originCode: "ONLINE", origin: "En línea", advance: 2500, advanceCents: 2500,
  method: "Yape/Plin", payment: "Adelanto registrado", budget: 12345, date: "2 nov. 2026", quote: { quote_type: "REPAIR", labor_cost: "80.00", laborCents: 8000, parts_cost: "43.45", partsCents: 4345, total_amount: "123.45", totalCents: 12345, status: "PENDING", statusLabel: "Pendiente", observations: "Revisar placa", dateLabel: "2 nov. 2026" },
  audit_events: [{ event_type: "CREATED", actor_user_id: 1, created_at: "2026-11-02T12:00:00Z" }], ...changes,
});

function renderDetail() {
  return render(<MemoryRouter initialEntries={["/taller/tickets/76"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><StoreProvider><Routes><Route path="/taller/tickets/:id" element={<TicketDetail />} /></Routes></StoreProvider></MemoryRouter>);
}

describe("detalle de ticket administrativo", () => {
  it("consulta por ID numérico y separa cotización, adelanto y auditoría", async () => {
    ticketApiState.getTicket.mockReset().mockResolvedValue(detail());
    renderDetail();
    expect(await screen.findByRole("heading", { name: "Ticket TCK-76" })).toBeInTheDocument();
    expect(ticketApiState.getTicket).toHaveBeenCalledWith("76");
    expect(screen.getAllByText("Lenovo ThinkPad")).toHaveLength(2);
    expect(screen.getAllByText("S/. 123.45")).toHaveLength(2);
    expect(screen.getByText("S/. 25.00 · Yape/Plin")).toBeInTheDocument();
    expect(screen.getByText("Revisar placa")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Trazabilidad del ticket" })).toHaveTextContent("Ticket creado");
    expect(screen.getByRole("button", { name: /añadir cotización de servicio/i })).toBeInTheDocument();
  });

  it("envía PATCH parcial y refleja solo la respuesta confirmada", async () => {
    ticketApiState.getTicket.mockReset().mockResolvedValue(detail());
    ticketApiState.updateTicket.mockReset().mockResolvedValue(detail({ statusCode: "IN_REPAIR", status: "En reparación" }));
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Ticket TCK-76" });
    await user.selectOptions(screen.getByLabelText("Estado del ticket"), "IN_REPAIR");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    await waitFor(() => expect(ticketApiState.updateTicket).toHaveBeenCalledWith("76", { status: "IN_REPAIR" }));
    expect(await screen.findByRole("status")).toHaveTextContent("actualizado");
  });

  it("muestra ticket faltante y reintenta errores seguros", async () => {
    ticketApiState.getTicket.mockReset().mockRejectedValueOnce(new Error("Este ticket ya no está disponible.")).mockResolvedValue(detail());
    const user = userEvent.setup();
    renderDetail();
    expect(await screen.findByRole("alert")).toHaveTextContent("ya no está disponible");
    expect(screen.queryByRole("heading", { name: "Ticket TCK-76" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Ticket TCK-76" })).toBeInTheDocument();
  });

  it("indica que no existe cotización sin ocultar el adelanto", async () => {
    ticketApiState.getTicket.mockReset().mockResolvedValue(detail({ quote: null, budget: null }));
    renderDetail();
    expect(await screen.findByText("No hay una cotización registrada.")).toBeInTheDocument();
    expect(screen.getByText("S/. 25.00 · Yape/Plin")).toBeInTheDocument();
  });

  it("crea una cotización con ID numérico de inventario y conserva el historial", async () => {
    const updated = detail({ quote: null, quotes: [{ id: 91, kind: "REPAIR", status: "PENDING", total_amount: "150.00", totalCents: 15000, lines: [{ spare_part_id: 4, name_snapshot: "Memoria DDR4", quantity: 1, subtotal: "150.00" }] }] });
    ticketApiState.getTicket.mockReset().mockResolvedValueOnce(detail()).mockResolvedValueOnce(updated);
    ticketApiState.createServiceQuote.mockReset().mockResolvedValue({ id: 91 });
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByRole("button", { name: /añadir cotización de servicio/i }));
    await user.selectOptions(await screen.findByLabelText(/Repuesto/), "4");
    await user.click(screen.getByRole("button", { name: "Crear cotización" }));
    await waitFor(() => expect(ticketApiState.createServiceQuote).toHaveBeenCalledWith("76", { kind: "REPAIR", lines: [{ spare_part_id: 4, quantity: 1 }], observations: null }));
    expect(await screen.findByText("Cotización #91")).toBeInTheDocument();
  });
});
