import { describe, expect, it } from "vitest";
import { pageWindow } from "../../src/shared/ui/ui.jsx";

describe("pageWindow", () => {
  it("muestra todas las páginas cuando son pocas", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("con muchas páginas muestra extremos, vecinas y saltos (110 páginas del inventario real)", () => {
    expect(pageWindow(1, 110)).toEqual([1, 2, "gap-110", 110]);
    expect(pageWindow(50, 110)).toEqual([1, "gap-49", 49, 50, 51, "gap-110", 110]);
    expect(pageWindow(110, 110)).toEqual([1, "gap-109", 109, 110]);
  });

  it("no deja un salto de una sola página: la muestra", () => {
    expect(pageWindow(4, 10)).toEqual([1, 2, 3, 4, 5, "gap-10", 10]);
  });

  it("nunca dibuja más de 7 elementos", () => {
    for (let page = 1; page <= 110; page += 1) expect(pageWindow(page, 110).length).toBeLessThanOrEqual(7);
  });
});
