import { describe, expect, it } from "vitest";
import { centsToInput, formatPEN, parseMoney } from "../../src/domain/money.js";
import { EMAIL_RE, isMobilePhone, isStrongPassword, PASSWORD_RULES } from "../../src/domain/validation.js";
import { TICKET_STATUS_LABEL } from "../../src/domain/tickets.js";
import { fullName, nameFromEmail, normalizeEmail } from "../../src/domain/user.js";

describe("dinero en céntimos", () => {
  it("formatea soles sin errores de coma flotante", () => {
    expect(formatPEN(21500)).toBe("S/. 215.00");
    expect(formatPEN(425000)).toBe("S/. 4,250.00");
    expect(formatPEN(-150)).toBe("-S/. 1.50");
    expect(formatPEN(null)).toBe("Por cotizar");
  });

  it("lee importes escritos y los devuelve como texto de formulario", () => {
    expect(parseMoney("114.75")).toBe(11475);
    expect(parseMoney("1,250.5")).toBe(125050);
    expect(parseMoney("12.345")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(centsToInput(11475)).toBe("114.75");
    expect(centsToInput(null)).toBe("");
  });
});

describe("validaciones", () => {
  it("correo y móvil", () => {
    expect(EMAIL_RE.test("ana.torres@demo.pe")).toBe(true);
    expect(EMAIL_RE.test("ana@demo")).toBe(false);
    expect(isMobilePhone("987 654 321")).toBe(true);
    expect(isMobilePhone("98765432")).toBe(false);
    expect(isMobilePhone("9876543210")).toBe(false);
  });

  it("la contraseña cumple las cuatro reglas del backend", () => {
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual(["len", "upper", "num", "sym"]);
    expect(isStrongPassword("Prueba#2026")).toBe(true);
    expect(isStrongPassword("Ab#1234")).toBe(false);
    expect(isStrongPassword("abcd#1234")).toBe(false);
    expect(isStrongPassword("Abcd12345")).toBe(false);
  });
});

describe("cuenta y tickets", () => {
  it("normaliza correo y nombres", () => {
    expect(normalizeEmail("  Ana@Demo.PE ")).toBe("ana@demo.pe");
    expect(nameFromEmail("ana.torres@demo.pe")).toBe("Ana Torres");
    expect(fullName({ nombre: "Ana", apellido: "Torres" })).toBe("Ana Torres");
    expect(fullName({ nombre: "Ana" })).toBe("Ana");
  });

  it("traduce los estados del esquema de base de datos", () => {
    expect(TICKET_STATUS_LABEL.QUOTED).toBe("Presupuesto enviado");
    expect(TICKET_STATUS_LABEL.CANCELLED).toBe("Cancelado");
  });
});
