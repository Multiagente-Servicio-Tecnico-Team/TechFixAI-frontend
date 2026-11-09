import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import App from "../../src/app/App.jsx";
import { StoreProvider } from "../../src/state/store.jsx";
import Inventory from "../../src/features/workshop/Inventory.jsx";
import InventoryMovements from "../../src/features/workshop/InventoryMovements.jsx";
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

function renderHistory(api, path = "/taller/inventario/17/movimientos") {
  return render(
    <MemoryRouter future={future} initialEntries={[path]}>
      <StoreProvider>
        <Routes><Route path="/taller/inventario/:partId/movimientos" element={<InventoryMovements api={api} />} /></Routes>
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
    await user.type(screen.getByLabelText(/Cantidad inicial/i), "8");
    await user.type(screen.getByLabelText(/Motivo del saldo inicial/), "Conteo inicial de demostración");
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

  it("ajusta el stock con conteo físico y el repuesto deja de estar en estado crítico", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario");
    expect(within(row("LCD-156-FHD144-40P")).getByText("Stock crítico")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ajustar stock LCD-156-FHD144-40P" }));
    const stock = screen.getByLabelText(/Conteo físico/);
    await user.clear(stock);
    await user.type(stock, "12");
    await user.type(screen.getByLabelText(/Motivo del ajuste/), "Conteo de prueba");
    await user.click(screen.getByRole("button", { name: "Confirmar conteo" }));

    expect(within(row("LCD-156-FHD144-40P")).getByText("En stock")).toBeInTheDocument();
    expect(within(row("LCD-156-FHD144-40P")).getByText("12 u.")).toBeInTheDocument();
  });

  it("pide confirmación para eliminar: cancelar lo conserva y confirmar lo quita", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario");

    await user.click(screen.getByRole("button", { name: "Retirar RAM-CRU-16G-D5" }));
    const dialog = screen.getByRole("alertdialog", { name: "¿Retirar este repuesto del catálogo?" });
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(row("RAM-CRU-16G-D5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retirar RAM-CRU-16G-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Retirar" }));

    expect(screen.queryByText("SKU: RAM-CRU-16G-D5")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("RAM SODIMM Crucial 16GB DDR5 4800MHz CL40 fue retirado del catálogo activo.");
    expect(screen.getByText("Mostrando 3 de 3 ítems")).toBeInTheDocument();
  });

  it("elimina desde la pantalla de edición y vuelve al listado", async () => {
    const user = userEvent.setup();
    renderApp("/taller/inventario/BAT-APL-A2337/editar");
    await user.click(screen.getByRole("button", { name: /Retirar del catálogo/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Retirar" }));

    expect(await screen.findByRole("heading", { name: "Inventario de Repuestos" })).toBeInTheDocument();
    expect(screen.queryByText("SKU: BAT-APL-A2337")).not.toBeInTheDocument();
  });
});

const API_PARTS = [
  { id: 17, sku: "RAM-16-D5", name: "RAM 16GB DDR5", category: "Memorias RAM", compat: "Lenovo Legion", stock: 62, min: 10, price: 5200, icon: "ram" },
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
    await user.click(await screen.findByRole("button", { name: "Retirar RAM-16-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Retirar" }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("RAM-16-D5"));
    expect(within(screen.getByRole("alertdialog")).getByRole("alert")).toHaveTextContent(INVENTORY_MESSAGES.inUse);
    expect(screen.getByText("SKU: RAM-16-D5")).toBeInTheDocument();
  });

  it("actualiza el saldo solo con el resultado confirmado por el backend", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      adjustStock: vi.fn().mockResolvedValue({ part: { id: 17, code: "RAM-16-D5", current_stock: 70 }, changed: true, movement: {} }),
    };
    renderInventory(api);
    await user.click(await screen.findByRole("button", { name: "Ajustar stock RAM-16-D5" }));
    await user.clear(screen.getByLabelText("Conteo físico"));
    await user.type(screen.getByLabelText("Conteo físico"), "70");
    await user.type(screen.getByLabelText("Motivo del ajuste"), "Conteo físico de almacén");
    await user.click(screen.getByRole("button", { name: "Confirmar conteo" }));

    await waitFor(() => expect(api.adjustStock).toHaveBeenCalledTimes(1));
    expect(api.adjustStock.mock.calls[0][0]).toBe(17);
    expect(api.adjustStock.mock.calls[0][1]).toEqual({ counted_stock: 70, reason: "Conteo físico de almacén" });
    expect(api.adjustStock.mock.calls[0][2]).toMatch(/^[\da-f-]{36}$/i);
    expect(within(row("RAM-16-D5")).getByText("70 u.")).toBeInTheDocument();
  });

  it("conserva el saldo y reutiliza la clave al reintentar un ajuste fallido", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      adjustStock: vi.fn()
        .mockRejectedValueOnce(new InventoryError(INVENTORY_MESSAGES.reservedStock, { status: 409, code: "reserved_stock" }))
        .mockResolvedValueOnce({ part: { id: 17, code: "RAM-16-D5", current_stock: 60 }, changed: true, movement: {} }),
    };
    renderInventory(api);
    await user.click(await screen.findByRole("button", { name: "Ajustar stock RAM-16-D5" }));
    await user.clear(screen.getByLabelText("Conteo físico"));
    await user.type(screen.getByLabelText("Conteo físico"), "60");
    await user.type(screen.getByLabelText("Motivo del ajuste"), "Conciliación de conteo");
    await user.click(screen.getByRole("button", { name: "Confirmar conteo" }));

    expect(await screen.findByText(INVENTORY_MESSAGES.reservedStock)).toBeInTheDocument();
    expect(within(row("RAM-16-D5")).getByText("62 u.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar conteo" }));
    await waitFor(() => expect(api.adjustStock).toHaveBeenCalledTimes(2));
    expect(api.adjustStock.mock.calls[1][2]).toBe(api.adjustStock.mock.calls[0][2]);
    expect(within(row("RAM-16-D5")).getByText("60 u.")).toBeInTheDocument();
  });

  it("exige motivo y comunica que un conteo igual no cambia el stock", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      adjustStock: vi.fn().mockResolvedValue({ part: { id: 17, code: "RAM-16-D5", current_stock: 62 }, changed: false, movement: null }),
    };
    renderInventory(api);
    await user.click(await screen.findByRole("button", { name: "Ajustar stock RAM-16-D5" }));
    await user.click(screen.getByRole("button", { name: "Confirmar conteo" }));
    expect(screen.getByText("Indica el motivo del ajuste.")).toBeInTheDocument();
    expect(api.adjustStock).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Motivo del ajuste"), "Verificación de saldo");
    await user.click(screen.getByRole("button", { name: "Confirmar conteo" }));
    await waitFor(() => expect(api.adjustStock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("El conteo coincide con el stock de RAM-16-D5; no hubo variación.")).toBeInTheDocument();
    expect(within(row("RAM-16-D5")).getByText("62 u.")).toBeInTheDocument();
  });

  it("no agrega historial de demostración en modo mock y lo identifica claramente", async () => {
    const api = { mode: "mock" };
    renderHistory(api, "/taller/inventario/17/movimientos");
    expect(await screen.findByText(/no hay historial persistido conectado/)).toBeInTheDocument();
    expect(screen.getByText("No hay movimientos que coincidan con estos filtros.")).toBeInTheDocument();
  });

  it("muestra las instantáneas, el responsable y la marca de historia anterior al corte", async () => {
    const movement = { id: 4, part_id: 17, code_snapshot: "RAM-16-D5", name_snapshot: "RAM 16GB DDR5", movement_type: "OPENING_BALANCE", quantity_delta: 8, stock_before: 0, stock_after: 8, reason: "Conteo inicial", actor_kind: "USER", actor_user_id: 2, actor_name: "Carlos Quispe", created_at: "2026-11-08T12:00:00Z", source_type: null, source_id: null, is_before_cutover: true };
    const api = { mode: "api", listMovements: vi.fn().mockResolvedValue({ items: [movement], total: 1, limit: 50, offset: 0 }) };
    renderHistory(api);
    expect(await screen.findByText("RAM 16GB DDR5")).toBeInTheDocument();
    expect(screen.getByText("Saldo inicial")).toBeInTheDocument();
    expect(screen.getByText("+8")).toBeInTheDocument();
    expect(screen.getByText("Carlos Quispe")).toBeInTheDocument();
    expect(screen.getByText("Conteo inicial")).toBeInTheDocument();
    expect(screen.getByText("Historia anterior al corte")).toBeInTheDocument();
    expect(api.listMovements).toHaveBeenCalledWith(17, { movement_type: "", from_date: "", to_date: "", limit: 50, offset: 0 });
  });

  it("página el historial con el offset del backend", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      listMovements: vi.fn().mockImplementation(async (_id, filters) => ({
        items: [{ id: filters.offset + 1, part_id: 17, code_snapshot: "RAM-16-D5", name_snapshot: "RAM 16GB DDR5", movement_type: "ADJUSTMENT_IN", quantity_delta: 1, stock_before: filters.offset, stock_after: filters.offset + 1, reason: null, actor_kind: "SYSTEM", actor_user_id: null, actor_name: null, created_at: "2026-11-08T12:00:00Z", source_type: null, source_id: null, is_before_cutover: false }],
        total: 51, limit: 50, offset: filters.offset,
      })),
    };
    renderHistory(api);
    await screen.findByText("+1");
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(api.listMovements).toHaveBeenLastCalledWith(17, { movement_type: "", from_date: "", to_date: "", limit: 50, offset: 50 }));
  });

  it("filtra historial por tipo y rango de fechas y valida fechas invertidas", async () => {
    const user = userEvent.setup();
    const api = { mode: "api", listMovements: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }) };
    renderHistory(api);
    await screen.findByText("No hay movimientos que coincidan con estos filtros.");
    await user.selectOptions(screen.getByLabelText("Tipo de movimiento"), "SALE");
    await user.type(screen.getByLabelText("Desde"), "2026-11-10");
    await user.type(screen.getByLabelText("Hasta"), "2026-11-01");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha inicial no puede ser posterior a la fecha final.");
    expect(api.listMovements).toHaveBeenCalledTimes(1);

    await user.clear(screen.getByLabelText("Hasta"));
    await user.type(screen.getByLabelText("Hasta"), "2026-11-12");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(api.listMovements).toHaveBeenLastCalledWith(17, { movement_type: "SALE", from_date: "2026-11-10", to_date: "2026-11-12", limit: 50, offset: 0 }));
  });

  it("mantiene una referencia al historial tras retirar un artículo conectado", async () => {
    const user = userEvent.setup();
    const api = { mode: "api", list: vi.fn().mockResolvedValue(API_PARTS), remove: vi.fn().mockResolvedValue(undefined) };
    renderInventory(api);
    await user.click(await screen.findByRole("button", { name: "Retirar RAM-16-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Retirar" }));
    expect(await screen.findByRole("link", { name: "Consultar su historial" })).toHaveAttribute("href", "/taller/inventario/17/movimientos");
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

describe("apertura inicial de inventario conectado", () => {
  it("crea con saldo cero sin solicitar ni registrar un movimiento de apertura", async () => {
    const user = userEvent.setup();
    const created = { ...API_PARTS[0], id: 19, sku: "RAM-NEW-8", name: "RAM nueva 8GB", stock: 0 };
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      listCategories: vi.fn().mockResolvedValue(["Memorias RAM"]),
      create: vi.fn().mockResolvedValue(created),
      recordOpening: vi.fn(),
    };
    renderPartForm(api);
    await user.type(await screen.findByLabelText(/Código SKU/), "RAM-NEW-8");
    const category = screen.getByLabelText(/Categoría de Componente/);
    await user.clear(category);
    await user.type(category, "Memorias RAM");
    await user.type(screen.getByLabelText(/Nombre y Descripción/), "RAM nueva 8GB");
    await user.type(screen.getByLabelText(/Cantidad inicial/), "0");
    await user.type(screen.getByLabelText(/Stock Mínimo/), "1");
    await user.type(screen.getByLabelText(/Precio de Venta/), "30.00");
    expect(screen.queryByLabelText(/Motivo del saldo inicial/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar Repuesto" }));
    await screen.findByRole("heading", { name: "Inventario de Repuestos" });
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0][0].stock).toBe(0);
    expect(api.recordOpening).not.toHaveBeenCalled();
  });

  it("crea el artículo en cero y registra la apertura positiva; un reintento no repite el alta", async () => {
    const user = userEvent.setup();
    const created = { ...API_PARTS[0], id: 18, sku: "SSD-NEW-1TB", name: "SSD nuevo 1TB", stock: 0 };
    const api = {
      mode: "api",
      list: vi.fn().mockResolvedValue(API_PARTS),
      listCategories: vi.fn().mockResolvedValue(["Memorias RAM", "Almacenamiento SSD / HDD"]),
      create: vi.fn().mockResolvedValue(created),
      recordOpening: vi.fn()
        .mockRejectedValueOnce(new InventoryError(INVENTORY_MESSAGES.unavailable, { code: "network" }))
        .mockResolvedValueOnce({ part: { id: 18, code: created.sku, current_stock: 8 }, changed: true, movement: {} }),
    };
    renderPartForm(api);
    await user.type(await screen.findByLabelText(/Código SKU/), "SSD-NEW-1TB");
    const category = screen.getByLabelText(/Categoría de Componente/);
    await user.clear(category);
    await user.type(category, "Almacenamiento SSD / HDD");
    await user.type(screen.getByLabelText(/Nombre y Descripción/), "SSD nuevo 1TB");
    await user.type(screen.getByLabelText(/Cantidad inicial/), "8");
    await user.type(screen.getByLabelText(/Motivo del saldo inicial/), "Conteo de apertura");
    await user.type(screen.getByLabelText(/Stock Mínimo/), "1");
    await user.type(screen.getByLabelText(/Precio de Venta/), "100.00");
    await user.click(screen.getByRole("button", { name: "Guardar Repuesto" }));

    expect(await screen.findByText(/El repuesto ya existe con saldo cero/)).toBeInTheDocument();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0][0].stock).toBe(0);
    expect(api.recordOpening).toHaveBeenCalledTimes(1);
    expect(api.recordOpening.mock.calls[0][0]).toBe(18);
    expect(api.recordOpening.mock.calls[0][1]).toEqual({ counted_stock: 8, reason: "Conteo de apertura" });

    await user.click(screen.getByRole("button", { name: "Reintentar apertura" }));
    await waitFor(() => expect(api.recordOpening).toHaveBeenCalledTimes(2));
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.recordOpening.mock.calls[1][2]).toBe(api.recordOpening.mock.calls[0][2]);
    expect(await screen.findByRole("heading", { name: "Inventario de Repuestos" })).toBeInTheDocument();
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
    await user.type(screen.getByLabelText(/Cantidad inicial/i), "4");
    await user.type(screen.getByLabelText(/Motivo del saldo inicial/), "Conteo inicial de demostración");
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

    await user.click(await screen.findByRole("button", { name: "Retirar RAM-16-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Retirar" }));

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

    await user.click(await screen.findByRole("button", { name: "Retirar RAM-16-D5" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Retirar" }));

    expect(await within(screen.getByRole("alertdialog")).findByRole("alert")).toHaveTextContent(INVENTORY_MESSAGES.notFound);
    expect(screen.getByText("SKU: RAM-16-D5")).toBeInTheDocument();
  });
});
