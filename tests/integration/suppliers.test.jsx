import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SupplierList from "../../src/features/purchases/SupplierList.jsx";
import SupplierForm from "../../src/features/purchases/SupplierForm.jsx";
import { PurchaseError } from "../../src/features/purchases/purchasesApi.js";

const active = { id: 1, name: "Distribuidora Tech", tax_id: "20601234567", contact_name: "Ana Torres", contact_email: "ventas@tech.pe", phone: "+51 999 111 222", address: null, delivery_lead_days: 3, active: true };
const inactive = { id: 2, name: "Repuestos Norte", tax_id: null, contact_name: null, contact_email: null, phone: null, address: null, delivery_lead_days: null, active: false };

function fakeApi(overrides = {}) {
  return {
    mode: "api",
    listSuppliers: vi.fn().mockResolvedValue({ items: [active, inactive], total: 2 }),
    getSupplier: vi.fn().mockResolvedValue(active),
    createSupplier: vi.fn(async (payload) => ({ id: 9, active: true, ...payload })),
    updateSupplier: vi.fn(async (id, payload) => ({ ...active, ...payload })),
    ...overrides,
  };
}

function renderAt(path, api) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/taller/compras/proveedores" element={<SupplierList api={api} />} />
        <Route path="/taller/compras/proveedores/nuevo" element={<SupplierForm api={api} />} />
        <Route path="/taller/compras/proveedores/:id/editar" element={<SupplierForm api={api} />} />
        <Route path="/taller/acceso" element={<p>Acceso del taller</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("listado de proveedores", () => {
  it("muestra cada proveedor con su estado y sus datos de contacto", async () => {
    renderAt("/taller/compras/proveedores", fakeApi());
    const card = (await screen.findByText("Distribuidora Tech")).closest("li.supplier-card");
    expect(within(card).getByText("Activo")).toBeInTheDocument();
    expect(within(card).getByText("RUC 20601234567")).toBeInTheDocument();
    expect(within(card).getByText("3 días de entrega")).toBeInTheDocument();
    const other = screen.getByText("Repuestos Norte").closest("li.supplier-card");
    expect(within(other).getByText("Inactivo")).toBeInTheDocument();
    expect(within(other).getByText("Sin RUC registrado")).toBeInTheDocument();
  });

  it("filtra por estado y búsqueda en el servidor", async () => {
    const api = fakeApi();
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores", api);
    await screen.findByText("Distribuidora Tech");
    await user.selectOptions(screen.getByLabelText("Estado del proveedor"), "false");
    await waitFor(() => expect(api.listSuppliers).toHaveBeenLastCalledWith(expect.objectContaining({ active: "false", offset: 0 })));
    await user.type(screen.getByLabelText("Buscar proveedores"), "norte{Enter}");
    await waitFor(() => expect(api.listSuppliers).toHaveBeenLastCalledWith(expect.objectContaining({ search: "norte", active: "false" })));
  });

  it("ofrece limpiar filtros cuando no hay coincidencias", async () => {
    const api = fakeApi({ listSuppliers: vi.fn().mockResolvedValue({ items: [], total: 0 }) });
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores", api);
    await screen.findByText("Todavía no hay proveedores registrados.");
    await user.type(screen.getByLabelText("Buscar proveedores"), "zzz{Enter}");
    await user.click(await screen.findByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByLabelText("Buscar proveedores")).toHaveValue("");
  });

  it("desactiva con confirmación y reactiva sin borrar el proveedor", async () => {
    const api = fakeApi();
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores", api);
    await user.click(await screen.findByRole("button", { name: "Desactivar Distribuidora Tech" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/compras anteriores se conservan/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));
    expect(api.updateSupplier).toHaveBeenCalledWith(1, { active: false });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    await user.click(await screen.findByRole("button", { name: "Reactivar Repuestos Norte" }));
    expect(api.updateSupplier).toHaveBeenLastCalledWith(2, { active: true });
    expect(await screen.findByText(/vuelve a estar disponible/)).toBeInTheDocument();
  });

  it("mantiene el diálogo abierto con el motivo si el backend rechaza la desactivación", async () => {
    const api = fakeApi({ updateSupplier: vi.fn().mockRejectedValue(new PurchaseError("Compras no está disponible en este momento.", { status: 503 })) });
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores", api);
    await user.click(await screen.findByRole("button", { name: "Desactivar Distribuidora Tech" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Desactivar" }));
    expect(await within(screen.getByRole("alertdialog")).findByText(/no está disponible/)).toBeInTheDocument();
  });

  it("lleva al acceso del taller si la sesión venció", async () => {
    const api = fakeApi({ listSuppliers: vi.fn().mockRejectedValue(new PurchaseError("x", { status: 401, code: "session_required" })) });
    renderAt("/taller/compras/proveedores", api);
    expect(await screen.findByText("Acceso del taller")).toBeInTheDocument();
  });

  it("indica que el servicio no está configurado sin datos de ejemplo", () => {
    const api = fakeApi({ mode: "unconfigured" });
    renderAt("/taller/compras/proveedores", api);
    expect(screen.getByRole("alert")).toHaveTextContent(/no está configurado/);
    expect(api.listSuppliers).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /nuevo proveedor/i })).not.toBeInTheDocument();
  });
});

describe("formulario de proveedor", () => {
  it("valida antes de enviar y marca el campo con error", async () => {
    const api = fakeApi();
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores/nuevo", api);
    await user.type(screen.getByLabelText(/Razón social/), "Tech Sur");
    await user.type(screen.getByLabelText("Correo"), "correo-malo");
    await user.click(screen.getByRole("button", { name: "Registrar proveedor" }));
    expect(screen.getByText(/Ingresa un correo válido/)).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveFocus();
    expect(api.createSupplier).not.toHaveBeenCalled();
  });

  it("registra el proveedor y vuelve al listado con un aviso", async () => {
    const api = fakeApi();
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores/nuevo", api);
    await user.type(screen.getByLabelText(/Razón social/), "Tech Sur");
    await user.type(screen.getByLabelText(/Plazo estimado/), "2");
    await user.click(screen.getByRole("button", { name: "Registrar proveedor" }));
    expect(api.createSupplier).toHaveBeenCalledWith(expect.objectContaining({ name: "Tech Sur", delivery_lead_days: 2, tax_id: null }));
    expect(await screen.findByText("Tech Sur quedó registrado.")).toBeInTheDocument();
  });

  it("señala el RUC repetido sin vaciar el formulario", async () => {
    const api = fakeApi({ createSupplier: vi.fn().mockRejectedValue(new PurchaseError("El identificador tributario ya está asociado a otro proveedor.", { status: 409, code: "purchase_conflict" })) });
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores/nuevo", api);
    await user.type(screen.getByLabelText(/Razón social/), "Tech Sur");
    await user.type(screen.getByLabelText(/^RUC/), "20601234567");
    await user.click(screen.getByRole("button", { name: "Registrar proveedor" }));
    expect(await screen.findByText(/ya está asociado a otro proveedor/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^RUC/)).toHaveValue("20601234567");
    expect(screen.getByLabelText(/Razón social/)).toHaveValue("Tech Sur");
  });

  it("muestra junto al campo el error de validación del backend", async () => {
    const api = fakeApi({ createSupplier: vi.fn().mockRejectedValue(new PurchaseError("El teléfono no es válido.", { status: 422, code: "invalid", field: "phone" })) });
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores/nuevo", api);
    await user.type(screen.getByLabelText(/Razón social/), "Tech Sur");
    await user.type(screen.getByLabelText("Teléfono"), "999");
    await user.click(screen.getByRole("button", { name: "Registrar proveedor" }));
    expect(await screen.findByText("El teléfono no es válido.")).toBeInTheDocument();
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("aria-invalid", "true");
  });

  it("carga el proveedor por enlace directo y guarda los cambios", async () => {
    const api = fakeApi();
    const user = userEvent.setup();
    renderAt("/taller/compras/proveedores/1/editar", api);
    const name = await screen.findByLabelText(/Razón social/);
    expect(api.getSupplier).toHaveBeenCalledWith("1");
    expect(name).toHaveValue("Distribuidora Tech");
    await user.clear(name);
    await user.type(name, "Distribuidora Tech Peru");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(api.updateSupplier).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Distribuidora Tech Peru", tax_id: "20601234567" }));
    expect(await screen.findByText("Cambios guardados en Distribuidora Tech Peru.")).toBeInTheDocument();
  });

  it("informa si el proveedor ya no existe", async () => {
    const api = fakeApi({ getSupplier: vi.fn().mockRejectedValue(new PurchaseError("El proveedor ya no está disponible.", { status: 404, code: "not_found" })) });
    renderAt("/taller/compras/proveedores/77/editar", api);
    expect(await screen.findByText("El proveedor ya no está disponible.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al listado" })).toBeInTheDocument();
  });
});
