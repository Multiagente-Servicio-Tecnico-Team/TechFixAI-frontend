import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import App from "../../src/app/App.jsx";
import { StoreProvider } from "../../src/state/store.jsx";
import Inventory from "../../src/features/workshop/Inventory.jsx";
import PartForm from "../../src/features/workshop/PartForm.jsx";
import { InventoryError, INVENTORY_MESSAGES } from "../../src/features/workshop/inventoryApi.js";

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const staff = { role: "staff", name: "Carlos Quispe", email: "tecnico@taller.pe" };

function renderApp(path) {
  sessionStorage.setItem("techfix.session", JSON.stringify(staff));
  return render(
    <MemoryRouter future={future} initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>
  );
}

function renderInventory(api) {
  return render(
    <MemoryRouter future={future} initialEntries={["/taller/inventario"]}>
      <StoreProvider>
        <Routes>
          <Route path="/taller/inventario" element={<Inventory api={api} />} />
        </Routes>
      </StoreProvider>
    </MemoryRouter>
  );
}

function renderPartForm(api) {
  return render(
    <MemoryRouter future={future} initialEntries={["/taller/inventario/nuevo"]}>
      <StoreProvider>
        <Routes>
          <Route path="/taller/inventario/nuevo" element={<PartForm api={api} />} />
          <Route path="/taller/inventario" element={<Inventory api={api} />} />
        </Routes>
      </StoreProvider>
    </MemoryRouter>
  );
}

const row = (sku) => screen.getByText(`SKU: ${sku}`).closest("li");

describe("inventario en modo demostración", () => {
  it("lista los repuestos y filtra por búsqueda", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario");
    expect(screen.getByRole("heading", { name: "Inventario de Repuestos" })).toBeInTheDocument();
    expect(screen.getByText("Mostrando 4 de 4 ítems")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar repuestos"), "batería");
    expect(screen.getByText("Mostrando 1 de 1 ítems")).toBeInTheDocument();
    expect(row("BAT-APL-A2337")).toBeInTheDocument();
  });

  it("crea un repuesto y aparece en el listado", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario");
    await user.click(screen.getByRole("link", { name: /Nuevo Repuesto/ }));

    await user.type(screen.getByLabelText(/Código SKU/), "cha-usbc-65w");
    const category = screen.getByLabelText(/Categoría de Componente/);
    await user.clear(category);
    await user.type(category, "Cargadores");
    await user.type(screen.getByLabelText(/Nombre y Descripción/), "Cargador USB-C 65W");
    await user.type(screen.getByLabelText(/Cantidad Inicial/), "8");
    await user.type(screen.getByLabelText(/Stock Mínimo/), "2");
    await user.type(screen.getByLabelText(/Precio de Venta/), "79.90");
    await user.click(screen.getByRole("button", { name: /Guardar Repuesto/ }));

    expect(await screen.findByText("Mostrando 4 de 5 ítems")).toBeInTheDocument();
    expect(within(row("CHA-USBC-65W")).getByText("S/. 79.90")).toBeInTheDocument();
  });

  it("no guarda un repuesto inválido y muestra los errores", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario/nuevo");
    await user.type(screen.getByLabelText(/Código SKU/), "SSD-NVME-2TB-KC");
    await user.click(screen.getByRole("button", { name: /Guardar Repuesto/ }));

    expect(screen.getByText("Este SKU ya existe en el inventario.")).toBeInTheDocument();
    expect(screen.getByText("Importe válido, ej. 114.75.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Registrar Nuevo Repuesto (SKU)" })).toBeInTheDocument();
  });

  it("edita el stock y el repuesto deja de estar en estado crítico", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario");
    expect(within(row("LCD-156-FHD144-40P")).getByText("Stock crítico")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Editar LCD-156-FHD144-40P" }));
    const stock = screen.getByLabelText(/Stock Actual Disponible/);
    await user.clear(stock);
    await user.type(stock, "12");
    await user.click(screen.getByRole("button", { name: /Guardar Cambios/ }));

    expect(await screen.findByRole("heading", { name: "Inventario de Repuestos" })).toBeInTheDocument();
    expect(within(row("LCD-156-FHD144-40P")).getByText("En stock")).toBeInTheDocument();
    expect(within(row("LCD-156-FHD144-40P")).getByText("12 u.")).toBeInTheDocument();
  });

  it("pide confirmación para eliminar: cancelar lo conserva y confirmar lo quita", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario");

    await user.click(screen.getByRole("button", { name: "Eliminar RAM-CRU-16G-D5" }));
    const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar este repuesto?" });
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(row("RAM-CRU-16G-D5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar RAM-CRU-16G-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    expect(screen.queryByText("SKU: RAM-CRU-16G-D5")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Repuesto RAM-CRU-16G-D5 eliminado del inventario.");
    expect(screen.getByText("Mostrando 3 de 3 ítems")).toBeInTheDocument();
  });

  it("elimina desde la pantalla de edición y vuelve al listado", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario/BAT-APL-A2337/editar");
    await user.click(screen.getByRole("button", { name: /Eliminar repuesto/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByRole("heading", { name: "Inventario de Repuestos" })).toBeInTheDocument();
    expect(screen.queryByText("SKU: BAT-APL-A2337")).not.toBeInTheDocument();
  });
});

const API_PARTS = [
  { sku: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", compat: "Lenovo Legion", stock: 62, min: 10, price: 5200, icon: "ram" },
];

describe("inventario conectado a la API", () => {
  it("carga la lista del backend y la muestra", async () => {
    const api = { mode: "api", list: vi.fn().mockResolvedValue(API_PARTS) };
    renderInventory(api);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando inventario…");
    expect(await screen.findByText("SKU: RAM-16-D5")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 de 1 ítems")).toBeInTheDocument();
  });

  it("si la carga falla ofrece reintentar", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn()
        .mockRejectedValueOnce(new InventoryError(INVENTORY_MESSAGES.unavailable, { code: "network" }))
        .mockResolvedValueOnce(API_PARTS),
    };
    renderInventory(api);
    expect(await screen.findByText(INVENTORY_MESSAGES.unavailable)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(await screen.findByText("SKU: RAM-16-D5")).toBeInTheDocument();
  });

  it("si el backend no permite eliminar, el repuesto se conserva y se explica por qué", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      remove: vi.fn().mockRejectedValue(new InventoryError(INVENTORY_MESSAGES.inUse, { status: 409, code: "in_use" })),
    };
    renderInventory(api);
    await user.click(await screen.findByRole("button", { name: "Eliminar RAM-16-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("RAM-16-D5"));
    expect(within(screen.getByRole("alertdialog")).getByRole("alert")).toHaveTextContent(INVENTORY_MESSAGES.inUse);
    expect(screen.getByText("SKU: RAM-16-D5")).toBeInTheDocument();
  });
});


describe("inventario API con categorías del catálogo", () => {
  it("incluye categorías nuevas del backend en los filtros", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue([
        ...API_PARTS,
        { ...API_PARTS[0], sku: "CPU-I5", name: "Procesador Core i5", category: "Procesadores" },
      ]),
      listCategories: vi.fn().mockResolvedValue(["Memorias RAM", "Procesadores"]),
    };
    renderInventory(api);

    await user.click(await screen.findByRole("button", { name: "Procesadores (1)" }));
    expect(screen.getByText("SKU: CPU-I5")).toBeInTheDocument();
    expect(screen.queryByText("SKU: RAM-16-D5")).not.toBeInTheDocument();
  });

  it("no presenta datos demo si la primera carga API falla", async () => {
    const api = {
      mode: "api",
      list: vi.fn().mockRejectedValue(new InventoryError(INVENTORY_MESSAGES.unavailable, { code: "network" })),
      listCategories: vi.fn().mockResolvedValue([]),
    };
    renderInventory(api);

    expect(await screen.findByText(INVENTORY_MESSAGES.unavailable)).toBeInTheDocument();
    expect(screen.queryByText("SKU: SSD-NVME-2TB-KC")).not.toBeInTheDocument();
    expect(screen.queryByText(/Mostrando [1-9]/)).not.toBeInTheDocument();
  });

  it("usa las categorías de los repuestos si falla la consulta de categorías", async () => {
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue([
        ...API_PARTS,
        { ...API_PARTS[0], sku: "CPU-I5", category: "Procesadores" },
      ]),
      listCategories: vi.fn().mockRejectedValue(new InventoryError(INVENTORY_MESSAGES.unavailable, { code: "network" })),
    };
    renderInventory(api);

    expect(await screen.findByRole("button", { name: "Procesadores (1)" })).toBeInTheDocument();
    expect(screen.getByText("SKU: RAM-16-D5")).toBeInTheDocument();
  });
});



describe("alta API con categoría de texto libre", () => {
  it("permite guardar una categoría nueva y muestra solo el repuesto confirmado", async () => {
    const user = userEvent.setup();
    const savedPart = {
      sku: "GPU-RTX-4060",
      name: "Tarjeta RTX 4060",
      category: "Tarjetas de video",
      compat: "",
      stock: 4,
      min: 1,
      price: 159900,
      icon: "chip",
    };
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([savedPart]),
      listCategories: vi.fn()
        .mockResolvedValueOnce(["Procesadores"])
        .mockResolvedValue(["Procesadores", "Tarjetas de video"]),
      create: vi.fn().mockResolvedValue(savedPart),
    };
    renderPartForm(api);

    await user.type(screen.getByLabelText(/Código SKU/), "gpu-rtx-4060");
    const category = screen.getByLabelText(/Categoría de Componente/);
    await user.clear(category);
    await user.type(category, "Tarjetas de video");
    await user.type(screen.getByLabelText(/Nombre y Descripción/), "Tarjeta RTX 4060");
    await user.type(screen.getByLabelText(/Cantidad Inicial/), "4");
    await user.type(screen.getByLabelText(/Stock Mínimo/), "1");
    await user.type(screen.getByLabelText(/Precio de Venta/), "1599.00");
    await user.click(screen.getByRole("button", { name: /Guardar Repuesto/ }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ category: "Tarjetas de video" })));
    expect(await screen.findByText("SKU: GPU-RTX-4060")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tarjetas de video (1)" })).toBeInTheDocument();
  });
});



describe("eliminación API del inventario", () => {
  it("retira el artículo de la vista solo después de recibir éxito", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      listCategories: vi.fn().mockResolvedValue(["Memorias RAM"]),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    renderInventory(api);

    await user.click(await screen.findByRole("button", { name: "Eliminar RAM-16-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("RAM-16-D5"));
    expect(screen.queryByText("SKU: RAM-16-D5")).not.toBeInTheDocument();
  });

  it("conserva el artículo y permite reintentar tras un 404", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      listCategories: vi.fn().mockResolvedValue(["Memorias RAM"]),
      remove: vi.fn().mockRejectedValue(new InventoryError(INVENTORY_MESSAGES.notFound, { status: 404, code: "not_found" })),
    };
    renderInventory(api);

    await user.click(await screen.findByRole("button", { name: "Eliminar RAM-16-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    expect(await within(screen.getByRole("alertdialog")).findByRole("alert")).toHaveTextContent(INVENTORY_MESSAGES.notFound);
    expect(screen.getByText("SKU: RAM-16-D5")).toBeInTheDocument();
  });
});
