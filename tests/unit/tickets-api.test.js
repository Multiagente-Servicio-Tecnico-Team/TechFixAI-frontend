import { describe, expect, it, vi } from "vitest";
import { createTicketsApi, TICKET_MESSAGES } from "../../src/features/workshop/ticketsApi.js";

const ticket = {
  id: "TCK-2041", date: "28/10/26", client: "Valeria Lozano", phone: "+51 916 310 844", email: "",
  device: "iPhone 15 Pro Max", issue: "Cambio de pantalla", category: "Reparación", budget: null,
  status: "Nuevo", origin: "Presencial", payment: "Pendiente", advance: null, method: null,
};
const draft = (({ id, date, budget, status, origin, ...fields }) => fields)(ticket);
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
function setup(data, status) {
  const fetchImpl = vi.fn().mockResolvedValue(response(data, status));
  return { fetchImpl, api: createTicketsApi({ baseUrl: "https://mock.test/", fetchImpl }) };
}

describe("contrato REST de tickets del taller", () => {
  it("lista un arreglo directo, conserva null y céntimos y envía credenciales", async () => {
    const row = { ...ticket, budget: 31200, advance: 3000, method: "Efectivo" };
    const { api, fetchImpl } = setup([row]);
    expect(await api.list()).toEqual([row]);
    expect(fetchImpl).toHaveBeenCalledWith("https://mock.test/tickets", expect.objectContaining({ method: "GET", credentials: "include" }));
  });
  it("acepta una lista vacía", async () => {
    expect(await setup([]).api.list()).toEqual([]);
  });
  it("carga un detalle y codifica el ID", async () => {
    const { api, fetchImpl } = setup({ ...ticket, id: "TCK/2041" });
    expect((await api.get("TCK/2041")).id).toBe("TCK/2041");
    expect(fetchImpl.mock.calls[0][0]).toBe("https://mock.test/tickets/TCK%2F2041");
  });
  it("POST envía solo los campos del formulario y usa el ID confirmado", async () => {
    const { api, fetchImpl } = setup(ticket, 201);
    expect((await api.create({ ...draft, id: "ignorar", budget: 999 })).id).toBe("TCK-2041");
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://mock.test/tickets");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(draft);
    expect(options.headers["Content-Type"]).toBe("application/json");
  });
  it("PATCH envía solo status y exige confirmación del mismo ID y estado", async () => {
    const { api, fetchImpl } = setup({ ...ticket, status: "Entregado" });
    expect((await api.updateStatus(ticket.id, "Entregado")).status).toBe("Entregado");
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ status: "Entregado" }) });
  });
  it.each([
    ["contenedor no acordado", { tickets: [ticket] }],
    ["importe en soles como texto", [{ ...ticket, budget: "312.00" }]],
    ["campo ausente", [{ ...ticket, advance: undefined }]],
    ["estado desconocido", [{ ...ticket, status: "NEW" }]],
  ])("rechaza %s sin inventar datos", async (_, data) => {
    await expect(setup(data).api.list()).rejects.toThrow(TICKET_MESSAGES.contract);
  });
  it("rechaza un arreglo en POST", async () => {
    await expect(setup([ticket]).api.create(draft)).rejects.toThrow(TICKET_MESSAGES.contract);
  });
  it("rechaza POST que devuelve otros datos", async () => {
    await expect(setup(ticket).api.create({ ...draft, client: "Otro cliente" })).rejects.toThrow(TICKET_MESSAGES.mismatch);
  });
  it("rechaza PATCH con estado distinto", async () => {
    await expect(setup(ticket).api.updateStatus(ticket.id, "Entregado")).rejects.toThrow(
      "Se solicitó «Entregado», pero la API devolvió «Nuevo». El cambio no se confirmó.",
    );
  });
  it("distingue un 404 al actualizar y rechaza PATCH de otro ID", async () => {
    await expect(setup(null, 404).api.updateStatus(ticket.id, "Entregado")).rejects.toThrow(TICKET_MESSAGES.updateNotFound);
    await expect(setup({ ...ticket, id: "TCK-2040", status: "Entregado" }).api.updateStatus(ticket.id, "Entregado")).rejects.toThrow(TICKET_MESSAGES.mismatch);
  });
  it("rechaza un detalle de otro ID", async () => {
    await expect(setup(ticket).api.get("TCK-2040")).rejects.toThrow(TICKET_MESSAGES.mismatch);
  });
  it.each([[401, "session"], [403, "forbidden"], [404, "notFound"], [422, "invalid"], [500, "unavailable"]])("maneja HTTP %s con mensaje controlado", async (status, key) => {
    await expect(setup({ message: "texto interno" }, status).api.list()).rejects.toThrow(TICKET_MESSAGES[key]);
  });
  it("oculta excepciones de red y rechaza JSON inválido", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("texto interno"))
      .mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("json interno"); } });
    const api = createTicketsApi({ fetchImpl });
    await expect(api.list()).rejects.toThrow(TICKET_MESSAGES.unavailable);
    await expect(api.list()).rejects.toThrow(TICKET_MESSAGES.contract);
  });
  it("sin URL mantiene el modo de demostración", () => {
    expect(createTicketsApi().mode).toBe("mock");
  });
});
