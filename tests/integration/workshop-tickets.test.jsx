import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { StoreProvider, useStore } from "../../src/state/store.jsx";
import Workshop from "../../src/features/workshop/Workshop.jsx";
import NewTicket from "../../src/features/workshop/NewTicket.jsx";
import TicketDetail from "../../src/features/workshop/TicketDetail.jsx";
import { createTicketsApi, TicketsError, TICKET_MESSAGES } from "../../src/features/workshop/ticketsApi.js";

const ticket = {
  id: "TCK-2040", date: "28/10/26", client: "Valeria Lozano", phone: "+51 916 310 844", email: "",
  device: "iPhone 15 Pro Max", issue: "Cambio de pantalla", category: "Reparación", budget: 31200,
  status: "Esperando Stock", origin: "Presencial", payment: "Pendiente", advance: null, method: null,
};
const created = { ...ticket, id: "TCK-9000", budget: null, status: "Nuevo" };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function ClientSnapshot() {
  const { clientTickets } = useStore();
  return <span data-testid="client-tickets">{JSON.stringify(clientTickets)}</span>;
}
function renderWorkshop(api, path = "/taller") {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StoreProvider>
        <Link to="/taller/tickets/nuevo">Nuevo Ticket</Link>
        <Routes>
          <Route path="/taller" element={<Workshop api={api} />} />
          <Route path="/taller/tickets/nuevo" element={<NewTicket api={api} />} />
          <Route path="/taller/tickets/:id" element={<TicketDetail api={api} />} />
        </Routes>
        <ClientSnapshot />
      </StoreProvider>
    </MemoryRouter>
  );
}
async function fillTicket(user) {
  await user.type(screen.getByLabelText(/Nombre Completo/), ticket.client);
  await user.type(screen.getByLabelText(/WhatsApp \/ Celular/), "916310844");
  await user.type(screen.getByLabelText(/Equipo \/ Marca y Modelo/), ticket.device);
  await user.type(screen.getByLabelText(/Detalle de la Falla o Solicitud/), ticket.issue);
}

describe("tickets del taller con API", () => {
  it("PATCH confirmado conserva solo el estado al navegar frente a GET fijo y respeta datos de solo lectura", async () => {
    const user = userEvent.setup();
    const updated = { ...ticket, status: "Entregado" };
    const requests = [];
    const api = createTicketsApi({ baseUrl: "https://mock.test", fetchImpl: vi.fn(async (url, options) => {
      requests.push({ url, ...options });
      return { ok: true, status: 200, json: async () => options.method === "PATCH" ? updated : url.endsWith("/tickets") ? [ticket] : ticket };
    }) });
    const view = renderWorkshop(api, "/taller/tickets/TCK-2040");
    const snapshot = screen.getByTestId("client-tickets").textContent;
    const select = await screen.findByLabelText("Estado del ticket");
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.selectOptions(select, "Entregado");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(await screen.findByRole("status")).toHaveTextContent("actualizado: Entregado");
    expect(requests.find((request) => request.method === "PATCH")).toMatchObject({ url: "https://mock.test/tickets/TCK-2040", body: '{"status":"Entregado"}' });
    await user.click(screen.getByRole("link", { name: "Volver a Gestión de Tickets" }));
    await screen.findByText("1 tickets");
    expect(screen.getAllByLabelText("Mover a, ticket TCK-2040")).toHaveLength(1);
    expect(screen.getByLabelText("Mover a, ticket TCK-2040")).toHaveValue("Entregado");
    await user.click(screen.getByRole("link", { name: "Ver TCK-2040" }));
    expect(await screen.findByLabelText("Estado del ticket")).toHaveValue("Entregado");
    expect(screen.getByText(ticket.client)).toBeInTheDocument();
    expect(screen.getByText(ticket.date)).toBeInTheDocument();
    expect(screen.getAllByText(ticket.device)).toHaveLength(2);
    expect(screen.getByText("S/. 312.00")).toBeInTheDocument();
    expect(screen.getByTestId("client-tickets").textContent).toBe(snapshot);
    view.unmount();
    renderWorkshop(api);
    expect(await screen.findByLabelText("Mover a, ticket TCK-2040")).toHaveValue("Esperando Stock");
  });

  it("explica PATCH discrepante sin informar éxito ni cambiar el estado compartido", async () => {
    const user = userEvent.setup();
    const api = createTicketsApi({ baseUrl: "https://mock.test", fetchImpl: vi.fn(async () => ({ ok: true, status: 200, json: async () => ticket })) });
    renderWorkshop(api, "/taller/tickets/TCK-2040");
    await user.selectOptions(await screen.findByLabelText("Estado del ticket"), "Entregado");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Se solicitó «Entregado», pero la API devolvió «Esperando Stock»");
    expect(screen.queryByText(/actualizado:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeEnabled();
  });

  it("POST repetido espera confirmación, reemplaza por ID y no duplica el ticket ni conserva un estado anterior", async () => {
    const user = userEvent.setup();
    const saved = { ...created, id: "TCK-2041" };
    const second = deferred();
    const api = { mode: "api", list: vi.fn().mockResolvedValue([ticket]), create: vi.fn().mockResolvedValueOnce(saved).mockReturnValueOnce(second.promise), get: vi.fn().mockResolvedValue(saved), updateStatus: vi.fn().mockResolvedValue({ ...saved, status: "Entregado" }) };
    renderWorkshop(api);
    await screen.findByLabelText("Mover a, ticket TCK-2040");
    await user.click(screen.getByRole("link", { name: "Nuevo Ticket" }));
    await fillTicket(user);
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    await user.selectOptions(await screen.findByLabelText("Estado del ticket"), "Entregado");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(await screen.findByRole("status")).toHaveTextContent("actualizado: Entregado");
    await user.click(screen.getByRole("link", { name: "Volver a Gestión de Tickets" }));
    await screen.findByText("2 tickets");
    await user.click(screen.getByRole("link", { name: "Nuevo Ticket" }));
    await fillTicket(user);
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Ticket #TCK-2041" })).not.toBeInTheDocument();
    await act(async () => second.resolve(saved));
    expect(await screen.findByLabelText("Estado del ticket")).toHaveValue("Nuevo");
    await user.click(screen.getByRole("link", { name: "Volver a Gestión de Tickets" }));
    await screen.findByText("2 tickets");
    expect(screen.getAllByLabelText("Mover a, ticket TCK-2041")).toHaveLength(1);
  });

  it("conserva el POST al volver a una lista GET fija, incluso mientras carga, sin duplicados ni cambios al cliente", async () => {
    const user = userEvent.setup();
    const saved = { ...created, id: "TCK-2041" };
    const staleList = deferred();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValueOnce([ticket]).mockReturnValueOnce(staleList.promise).mockResolvedValue([ticket, saved]),
      create: vi.fn().mockResolvedValue(saved), get: vi.fn().mockResolvedValue(saved),
    };
    const view = renderWorkshop(api);
    const snapshot = screen.getByTestId("client-tickets").textContent;
    await screen.findByLabelText("Mover a, ticket TCK-2040");
    await user.click(screen.getByRole("link", { name: "Nuevo Ticket" }));
    await fillTicket(user);
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    await screen.findByRole("heading", { name: "Ticket #TCK-2041" });
    await user.click(screen.getByRole("link", { name: "Volver a Gestión de Tickets" }));
    expect(screen.getByText("Cargando tickets…")).toBeInTheDocument();
    expect(screen.getByLabelText("Mover a, ticket TCK-2041")).toHaveValue("Nuevo");
    await act(async () => staleList.resolve([ticket]));
    expect(screen.getByText("2 tickets")).toBeInTheDocument();
    expect(screen.getByLabelText("Mover a, ticket TCK-2041")).toHaveValue("Nuevo");
    expect(screen.queryByText("Martín Gómez")).not.toBeInTheDocument();
    expect(screen.getByTestId("client-tickets").textContent).toBe(snapshot);
    await user.click(screen.getByRole("link", { name: "Ver TCK-2041" }));
    await screen.findByRole("heading", { name: "Ticket #TCK-2041" });
    await user.click(screen.getByRole("link", { name: "Volver a Gestión de Tickets" }));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByText("Cargando tickets…")).not.toBeInTheDocument());
    expect(screen.getAllByLabelText("Mover a, ticket TCK-2041")).toHaveLength(1);
    expect(screen.getByText("2 tickets")).toBeInTheDocument();
    view.unmount();
  });

  it("al recargar el estado en memoria se pierde y la lista vuelve a depender del GET", async () => {
    const user = userEvent.setup();
    const saved = { ...created, id: "TCK-2041" };
    const api = { mode: "api", list: vi.fn().mockResolvedValue([ticket]), create: vi.fn().mockResolvedValue(saved), get: vi.fn().mockResolvedValue(saved) };
    const view = renderWorkshop(api);
    await screen.findByLabelText("Mover a, ticket TCK-2040");
    await user.click(screen.getByRole("link", { name: "Nuevo Ticket" }));
    await fillTicket(user);
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    await screen.findByRole("heading", { name: "Ticket #TCK-2041" });
    await user.click(screen.getByRole("link", { name: "Volver a Gestión de Tickets" }));
    await screen.findByText("2 tickets");
    view.unmount();
    renderWorkshop(api);
    await screen.findByLabelText("Mover a, ticket TCK-2040");
    expect(screen.queryByLabelText("Mover a, ticket TCK-2041")).not.toBeInTheDocument();
    expect(screen.getByText("1 tickets")).toBeInTheDocument();
  });

  it("muestra carga, reemplaza demo y mantiene búsqueda, filtros y mostrar más", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const api = { mode: "api", list: vi.fn().mockReturnValue(pending.promise) };
    renderWorkshop(api);
    expect(screen.getByText("Cargando tickets…")).toBeInTheDocument();
    expect(screen.queryByText("Martín Gómez")).not.toBeInTheDocument();
    const rows = [ticket, ...Array.from({ length: 5 }, (_, i) => ({ ...ticket, id: `TCK-${3000 + i}`, client: `Cliente ${i}`, category: "Venta" }))];
    await act(async () => pending.resolve(rows));
    expect(screen.getByText("6 tickets")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Ver TCK-/ })).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: "Mostrar más (1)" }));
    expect(screen.getAllByRole("link", { name: /^Ver TCK-/ })).toHaveLength(6);
    await user.click(screen.getByRole("button", { name: "Reparación" }));
    expect(screen.getByText("1 tickets")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar tickets"), "no existe");
    expect(screen.getByText("No hay tickets con estos filtros.")).toBeInTheDocument();
  });
  it("ofrece reintento tras fallo de carga y distingue la lista vacía", async () => {
    const user = userEvent.setup();
    const api = { mode: "api", list: vi.fn().mockRejectedValueOnce(new TicketsError(TICKET_MESSAGES.unavailable)).mockResolvedValueOnce([]) };
    renderWorkshop(api);
    expect(await screen.findByRole("alert")).toHaveTextContent(TICKET_MESSAGES.unavailable);
    expect(screen.queryByText("No hay tickets con estos filtros.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("No hay tickets con estos filtros.")).toBeInTheDocument();
  });
  it("actualiza la lista solo después de confirmación y conserva los tickets del cliente", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const api = { mode: "api", list: vi.fn().mockResolvedValue([ticket]), updateStatus: vi.fn().mockReturnValue(pending.promise) };
    renderWorkshop(api);
    const snapshot = screen.getByTestId("client-tickets").textContent;
    const select = await screen.findByLabelText("Mover a, ticket TCK-2040");
    await user.selectOptions(select, "Entregado");
    expect(select).toBeDisabled();
    expect(select).toHaveValue("Esperando Stock");
    expect(api.updateStatus).toHaveBeenCalledWith(ticket.id, "Entregado");
    await act(async () => pending.resolve({ ...ticket, status: "Entregado" }));
    expect(screen.getByLabelText("Mover a, ticket TCK-2040")).toHaveValue("Entregado");
    expect(screen.getByLabelText("Mover a, ticket TCK-2040").closest("section")).toHaveAttribute("aria-label", "Entregado");
    expect(screen.getByText(/actualizado: Entregado/)).toBeInTheDocument();
    expect(screen.getByTestId("client-tickets").textContent).toBe(snapshot);
  });
  it("conserva el estado anterior al fallar PATCH desde la lista", async () => {
    const user = userEvent.setup();
    const api = { mode: "api", list: vi.fn().mockResolvedValue([ticket]), updateStatus: vi.fn().mockRejectedValue(new TicketsError(TICKET_MESSAGES.unavailable)) };
    renderWorkshop(api);
    const select = await screen.findByLabelText("Mover a, ticket TCK-2040");
    await user.selectOptions(select, "Entregado");
    expect(await screen.findByRole("alert")).toHaveTextContent(TICKET_MESSAGES.unavailable);
    expect(select).toHaveValue("Esperando Stock");
    expect(select).toBeEnabled();
  });
  it("crea con céntimos, bloquea doble envío y navega al ID real", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const saved = { ...created, advance: 3050, method: "Yape/Plin", payment: "Adelanto S/. 30.50 · Yape/Plin" };
    const api = { mode: "api", create: vi.fn().mockReturnValue(pending.promise), get: vi.fn().mockResolvedValue(saved) };
    renderWorkshop(api, "/taller/tickets/nuevo");
    await fillTicket(user);
    await user.type(screen.getByLabelText(/Monto Cobrado/), "30.50");
    await user.dblClick(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ advance: 3050, method: "Yape/Plin", phone: "+51 916 310 844" }));
    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
    expect(api.get).not.toHaveBeenCalled();
    await act(async () => pending.resolve(saved));
    expect(await screen.findByRole("heading", { name: "Ticket #TCK-9000" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("TCK-9000");
    expect(screen.getByRole("status")).toHaveTextContent("creado correctamente");
  });
  it("valida antes de POST y conserva los campos tras un fallo al crear", async () => {
    const user = userEvent.setup();
    const api = { mode: "api", create: vi.fn().mockRejectedValue(new TicketsError(TICKET_MESSAGES.unavailable)) };
    renderWorkshop(api, "/taller/tickets/nuevo");
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(api.create).not.toHaveBeenCalled();
    await fillTicket(user);
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(await screen.findByText(TICKET_MESSAGES.unavailable)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre Completo/)).toHaveValue(ticket.client);
    expect(screen.getByRole("button", { name: "Generar Ticket" })).toBeEnabled();
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ advance: null, method: null }));
  });
  it("carga detalle directo y permite reintentar un guardado fallido", async () => {
    const user = userEvent.setup();
    const api = { mode: "api", get: vi.fn().mockResolvedValue(ticket), updateStatus: vi.fn().mockRejectedValueOnce(new TicketsError(TICKET_MESSAGES.unavailable)).mockResolvedValueOnce({ ...ticket, status: "Entregado" }) };
    renderWorkshop(api, "/taller/tickets/TCK-2040");
    expect(screen.getByText("Cargando ticket…")).toBeInTheDocument();
    const select = await screen.findByLabelText("Estado del ticket");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeDisabled());
    await user.selectOptions(select, "Entregado");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(TICKET_MESSAGES.unavailable);
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(await screen.findByRole("status")).toHaveTextContent("actualizado: Entregado");
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeDisabled();
  });
  it("distingue 404 de error de conexión en detalle", async () => {
    const user = userEvent.setup();
    const api = { mode: "api", get: vi.fn().mockRejectedValueOnce(new TicketsError(TICKET_MESSAGES.unavailable)).mockRejectedValueOnce(new TicketsError(TICKET_MESSAGES.notFound, { status: 404 })) };
    renderWorkshop(api, "/taller/tickets/TCK-4040");
    expect(await screen.findByRole("alert")).toHaveTextContent(TICKET_MESSAGES.unavailable);
    expect(screen.queryByText("Ticket no encontrado")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Ticket no encontrado")).toBeInTheDocument();
  });
  it("conserva creación y edición en modo demostración sin llamadas HTTP", async () => {
    const user = userEvent.setup();
    const api = { mode: "mock", list: vi.fn(), create: vi.fn(), get: vi.fn(), updateStatus: vi.fn() };
    renderWorkshop(api, "/taller/tickets/nuevo");
    await fillTicket(user);
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(await screen.findByRole("heading", { name: "Ticket #TCK-2042" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Estado del ticket"), "Entregado");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    expect(screen.getByText(/actualizado: Entregado/)).toBeInTheDocument();
    for (const key of ["list", "create", "get", "updateStatus"]) expect(api[key]).not.toHaveBeenCalled();
  });
});
