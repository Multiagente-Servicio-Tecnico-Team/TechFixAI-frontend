import { describe, expect, it, vi } from "vitest";
import { createTicketsApi, TICKETS_MESSAGES, TicketsApiError } from "../../src/features/workshop/ticketsApi.js";

const response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

describe("cliente administrativo de tickets", () => {
  it("envía filtros y pagina con credenciales de sesión", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { items: [], total: 0, limit: 20, offset: 0 }));
    const api = createTicketsApi({ baseUrl: "http://localhost:8000/", fetchImpl });
    await api.listTickets({ search: "Rosa & PC", status: "NEW", origin: "ONLINE", limit: 20, offset: 0 });
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:8000/api/admin/tickets?status=NEW&origin=ONLINE&search=Rosa+%26+PC&limit=20&offset=0", expect.objectContaining({ credentials: "include" }));
  });

  it("envía alta manual con códigos canónicos y PATCH parcial", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(201, { id: 7, code: "TCK-7" })).mockResolvedValueOnce(response(200, { id: 7, status: "IN_REPAIR" }));
    const api = createTicketsApi({ baseUrl: "http://localhost:8000", fetchImpl });
    await api.createManualTicket({ contact_name: "Ana Torres", contact_phone: "+51987654321", title: "Dell XPS", failure_description: "No enciende", request_type: "REPAIR", advance_amount: "40.00", advance_payment_method: "CASH" });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ request_type: "REPAIR", advance_amount: "40.00", advance_payment_method: "CASH" });
    await api.updateTicket(7, { status: "IN_REPAIR" });
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ method: "PATCH", credentials: "include", body: JSON.stringify({ status: "IN_REPAIR" }) });
  });

  it.each([401, 403, 404, 409, 503])("mapea HTTP %i a mensaje seguro", async (status) => {
    const api = createTicketsApi({ baseUrl: "http://localhost:8000", fetchImpl: vi.fn().mockResolvedValue(response(status, { detail: "secret internals" })) });
    await expect(api.getTicket(1)).rejects.toMatchObject({ status, message: expect.not.stringContaining("secret internals") });
  });

  // El 422 muestra la validación que el backend redacta para el usuario, con el nombre del campo en español.
  it("mapea HTTP 422 a los errores de validación por campo", async () => {
    const body = { detail: "Datos inválidos.", errors: [{ campo: "quantity", mensaje: "Debe ser mayor que cero." }] };
    const api = createTicketsApi({ baseUrl: "http://localhost:8000", fetchImpl: vi.fn().mockResolvedValue(response(422, body)) });
    await expect(api.getTicket(1)).rejects.toMatchObject({ status: 422, code: "invalid", message: "Cantidad: Debe ser mayor que cero." });
  });

  it("usa el mensaje genérico si el 422 no trae detalle útil", async () => {
    const api = createTicketsApi({ baseUrl: "http://localhost:8000", fetchImpl: vi.fn().mockResolvedValue(response(422, { detail: "Datos inválidos." })) });
    await expect(api.getTicket(1)).rejects.toMatchObject({ status: 422, message: TICKETS_MESSAGES.invalid });
  });

  it("mapea error de red y base no configurada", async () => {
    await expect(createTicketsApi({ baseUrl: "http://localhost:8000", fetchImpl: vi.fn().mockRejectedValue(new Error("secret")) }).listTickets()).rejects.toBeInstanceOf(TicketsApiError);
    await expect(createTicketsApi({ baseUrl: "", fetchImpl: vi.fn() }).listTickets()).rejects.toMatchObject({ code: "unconfigured" });
  });

  it("normaliza contacto online, tipos y los IDs de backend", () => {
    const api = createTicketsApi({ baseUrl: "http://localhost:8000", fetchImpl: vi.fn() });
    expect(api.normalizeTicket({ id: 22, code: "TCK-22", customer_name: "Luis", customer_phone: "999", customer_email: "l@test.pe", request_type: "PC_BUILD", status: "NEW", origin: null, title: "PC", failure_description: "Armado" })).toMatchObject({ id: 22, code: "TCK-22", client: "Luis", phone: "999", email: "l@test.pe", requestType: "PC_BUILD", origin: "Desconocido", originCode: "UNKNOWN" });
  });
});
