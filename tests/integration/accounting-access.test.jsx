import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "../../src/app/App.jsx";
import { StoreProvider } from "../../src/state/store.jsx";

const future = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderApp(path, session) {
  sessionStorage.setItem("techfix.session", JSON.stringify(session));
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

describe("acceso frontend a contabilidad", () => {
  it("muestra Contabilidad en el taller para ADMIN", () => {
    renderApp("/taller", { role: "staff", accountRole: "ADMIN", name: "Admin", email: "admin@demo.test" });
    expect(screen.getByRole("link", { name: "Contabilidad" })).toBeInTheDocument();
  });

  it("oculta Contabilidad y bloquea la ruta directa para TECHNICIAN", () => {
    renderApp("/taller/contabilidad", { role: "staff", accountRole: "TECHNICIAN", name: "Técnico", email: "tech@demo.test" });
    expect(screen.queryByRole("link", { name: "Contabilidad" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Solo administradores pueden acceder a Contabilidad");
    expect(screen.queryByRole("heading", { name: "Contabilidad" })).not.toBeInTheDocument();
  });

  it("no entrega datos contables a CUSTOMER por una ruta directa", () => {
    renderApp("/taller/contabilidad", { role: "client", accountRole: "CUSTOMER", name: "Cliente", email: "client@demo.test" });
    expect(screen.queryByRole("heading", { name: "Contabilidad" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
  });
});
