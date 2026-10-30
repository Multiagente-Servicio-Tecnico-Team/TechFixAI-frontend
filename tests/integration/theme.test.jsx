import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle, { THEME_KEY } from "../../src/shared/ui/ThemeToggle.jsx";

afterEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

describe("selector de tema", () => {
  it("empieza en oscuro, cambia a claro y guarda solo la preferencia", async () => {
    render(<ThemeToggle />);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Cambiar a tema claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");

    await userEvent.click(screen.getByRole("button", { name: "Cambiar a tema oscuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("respeta el tema aplicado antes de montar y sincroniza los demás botones", async () => {
    document.documentElement.dataset.theme = "light";
    render(<><ThemeToggle /><ThemeToggle /></>);
    const [first] = screen.getAllByRole("button", { name: "Cambiar a tema oscuro" });

    await userEvent.click(first);
    expect(await screen.findAllByRole("button", { name: "Cambiar a tema claro" })).toHaveLength(2);
  });
});
