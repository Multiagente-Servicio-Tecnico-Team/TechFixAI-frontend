import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle, { THEME_KEY } from "../../src/shared/ui/ThemeToggle.jsx";

afterEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

describe("selector de tema", () => {
  it("cambia entre claro y oscuro y guarda solo la preferencia", async () => {
    render(<ThemeToggle />);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Cambiar a tema oscuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");

    await userEvent.click(screen.getByRole("button", { name: "Cambiar a tema claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("respeta el tema aplicado antes de montar y sincroniza otros botones", async () => {
    document.documentElement.dataset.theme = "dark";
    render(<><ThemeToggle /><ThemeToggle /></>);
    const [first] = screen.getAllByRole("button", { name: "Cambiar a tema claro" });

    await userEvent.click(first);
    expect(await screen.findAllByRole("button", { name: "Cambiar a tema oscuro" })).toHaveLength(2);
  });
});
