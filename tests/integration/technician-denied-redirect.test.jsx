import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Con la API configurada, el Banco de tickets también es solo para ADMIN.
vi.mock("../../src/features/workshop/ticketsApi.js", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, ticketsApi: { ...original.ticketsApi, mode: "api" } };
});
import App from "../../src/app/App.jsx";
import { StoreProvider } from "../../src/state/store.jsx";

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const technician = { role: "staff", accountRole: "TECHNICIAN", name: "Técnico", email: "tech@demo.test" };

function renderApp(path) {
  sessionStorage.setItem("techfix.session", JSON.stringify(technician));
  return render(
    <MemoryRouter future={future} initialEntries={[path]}>
      <StoreProvider><App /></StoreProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("técnico en una ruta solo para ADMIN", () => {
  it.each([
    ["/taller/contabilidad", "Solo administradores pueden acceder a Contabilidad."],
    ["/taller/asistente", "Solo administradores pueden usar el asistente administrativo."],
  ])("en %s muestra un único aviso y no el de tickets", (path, message) => {
    renderApp(path);
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(message);
    expect(screen.queryByText("Solo administradores pueden gestionar tickets.")).not.toBeInTheDocument();
  });
});
