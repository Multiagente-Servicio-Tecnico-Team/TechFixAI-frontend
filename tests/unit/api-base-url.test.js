import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "../../src/shared/api/baseUrl.js";

describe("URL base de cuentas y chat", () => {
  it("usa el proxy del mismo origen si producción no define URL", () => {
    expect(resolveApiBaseUrl("", "/backend", true)).toBe("/backend");
    expect(resolveApiBaseUrl("", "/backend", true)).toBe("/backend");
  });

  it("evita enviar cookies de sesión a un origen externo en producción", () => {
    expect(
      resolveApiBaseUrl(
        "https://backend.example.test/auth",
        "/backend",
        true,
      ),
    ).toBe("/backend");
  });

  it("conserva URLs de desarrollo y rutas relativas de producción", () => {
    expect(
      resolveApiBaseUrl("http://localhost:8000", "/backend", false),
    ).toBe("http://localhost:8000");
    expect(
      resolveApiBaseUrl("/backend", "/backend", true),
    ).toBe("/backend");
  });
});
