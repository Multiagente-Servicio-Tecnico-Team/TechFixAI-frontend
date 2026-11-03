import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { StoreProvider } from "../../src/state/store.jsx";

const createTicket = vi.hoisted(() => vi.fn());
vi.mock("../../src/features/workshop/ticketsApi.js", () => ({ ticketsApi: { mode: "api", createManualTicket: (...args) => createTicket(...args) } }));
import NewTicket from "../../src/features/workshop/NewTicket.jsx";

function CurrentPath() { const location = useLocation(); return <output>{location.pathname}</output>; }
function renderForm() {
  return render(<MemoryRouter initialEntries={["/taller/tickets/nuevo"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><StoreProvider><Routes><Route path="/taller/tickets/nuevo" element={<NewTicket />} /><Route path="/taller/tickets/:id" element={<CurrentPath />} /></Routes></StoreProvider></MemoryRouter>);
}
async function fillRequired(user) {
  await user.type(screen.getByLabelText(/^Nombre Completo \/ Razón Social/), "Valeria Torres");
  await user.type(screen.getByLabelText(/^WhatsApp \/ Celular/), "987654321");
  await user.type(screen.getByLabelText(/^Equipo \/ Marca y Modelo/), "Dell XPS 15");
  await user.type(screen.getByLabelText(/^Detalle de la Falla o Solicitud/), "No enciende al presionar el botón");
}

describe("alta manual conectada al backend", () => {
  it("envía tipo canónico y navega usando la respuesta del servidor", async () => {
    createTicket.mockReset().mockResolvedValue({ id: 741, code: "TCK-741" });
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    expect(screen.getAllByRole("option")).toHaveLength(5);
    expect(screen.getByRole("option", { name: "Reclamo de garantía" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Categoría"), "WARRANTY_CLAIM");
    await user.type(screen.getByLabelText("Monto Cobrado / Adelanto"), "99999999.99");
    await user.click(screen.getByLabelText("Efectivo"));
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    await waitFor(() => expect(createTicket).toHaveBeenCalledWith(expect.objectContaining({ request_type: "WARRANTY_CLAIM", title: "Dell XPS 15", failure_description: "No enciende al presionar el botón", advance_amount: "99999999.99", advance_payment_method: "CASH" })));
    expect(await screen.findByText("/taller/tickets/741")).toBeInTheDocument();
  });

  it("omite el método sin adelanto y evita doble envío", async () => {
    let resolveCreate;
    createTicket.mockReset().mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    const submit = screen.getByRole("button", { name: "Generar Ticket" });
    await user.click(submit);
    await user.click(submit);
    expect(createTicket).toHaveBeenCalledTimes(1);
    expect(createTicket.mock.calls[0][0]).not.toHaveProperty("advance_payment_method");
    resolveCreate({ id: 742, code: "TCK-742" });
    expect(await screen.findByText("/taller/tickets/742")).toBeInTheDocument();
  });

  it("conserva formulario en error y permite reintentar", async () => {
    createTicket.mockReset().mockRejectedValueOnce(new Error("No se pudo guardar")).mockResolvedValue({ id: 743, code: "TCK-743" });
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
    expect(screen.getByLabelText(/^Nombre Completo/)).toHaveValue("Valeria Torres");
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(await screen.findByText("/taller/tickets/743")).toBeInTheDocument();
  });

  it("valida límites de campos antes de llamar al servicio", async () => {
    createTicket.mockReset();
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/^Nombre Completo/), "Al");
    await user.type(screen.getByLabelText(/^WhatsApp \/ Celular/), "12345678");
    await user.type(screen.getByLabelText(/^Correo Electrónico/), "correo-inválido");
    await user.type(screen.getByLabelText(/^Equipo \/ Marca y Modelo/), "X");
    await user.type(screen.getByLabelText(/^Detalle de la Falla o Solicitud/), "mal");
    await user.type(screen.getByLabelText("Monto Cobrado / Adelanto"), "0");
    await user.click(screen.getByRole("button", { name: "Generar Ticket" }));
    expect(await screen.findByText(/nombre de 3 a 200/i)).toBeInTheDocument();
    expect(screen.getByText(/número local/i)).toBeInTheDocument();
    expect(screen.getByText(/correo no válido/i)).toBeInTheDocument();
    expect(screen.getByText(/equipo \(2 a 200/i)).toBeInTheDocument();
    expect(screen.getByText(/falla o solicitud \(5 a 10000/i)).toBeInTheDocument();
    expect(screen.getByText(/importe positivo/i)).toBeInTheDocument();
    expect(createTicket).not.toHaveBeenCalled();
  });
});
