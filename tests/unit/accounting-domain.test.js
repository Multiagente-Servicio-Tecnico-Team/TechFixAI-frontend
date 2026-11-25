import { describe, expect, it } from "vitest";
import {
  calculateEntryTotals,
  formatAccountingAmount,
  formatAccountingDecimal,
  parseAccountingAmount,
  validateEntryDraft,
} from "../../src/domain/accounting.js";

describe("montos contables exactos", () => {
  it("parsea entradas hasta NUMERIC(14,2) sin perder céntimos", () => {
    expect(parseAccountingAmount("12")).toBe(1200n);
    expect(parseAccountingAmount("12.3")).toBe(1230n);
    expect(parseAccountingAmount("999999999999.99")).toBe(99999999999999n);
    expect(formatAccountingDecimal(99999999999999n)).toBe("999999999999.99");
  });

  it.each(["", "-1.00", "01.00", "1.234", "1000000000000.00", "abc"]) (
    "rechaza importe fuera del formato o rango: %s",
    (value) => expect(parseAccountingAmount(value)).toBeNull(),
  );

  it("formatea soles conservando exactitud y separadores", () => {
    expect(formatAccountingAmount(425000n)).toBe("S/. 4,250.00");
    expect(formatAccountingAmount(1n)).toBe("S/. 0.01");
  });

  it("suma las líneas exactamente e identifica una línea inválida o desbalanceada", () => {
    const lines = [
      { debit: "1250.25", credit: "" },
      { debit: "", credit: "1250.25" },
    ];
    expect(calculateEntryTotals(lines)).toMatchObject({ debit: 125025n, credit: 125025n, balanced: true, valid: true });
    expect(calculateEntryTotals([{ debit: "1.00", credit: "1.00" }, { debit: "", credit: "1.00" }]).valid).toBe(false);
    expect(calculateEntryTotals([{ debit: "1.00", credit: "" }, { debit: "", credit: "2.00" }]).balanced).toBe(false);
  });
});

describe("reglas del asiento", () => {
  const draft = {
    operation_date: "2026-11-02",
    concept: "Servicio técnico",
    detail: "Pago por mantenimiento",
    category_id: 2,
    plan_id: 1,
    lines: [
      { account_id: 101, account: { id: 101, plan_id: 1, code: "1011", status: "ACTIVE", is_postable: true, effective_from: "2019-01-01" }, description: "", debit: "50.00", credit: "" },
      { account_id: 701, account: { id: 701, plan_id: 1, code: "7041", status: "ACTIVE", is_postable: true, effective_from: "2019-01-01" }, description: "Servicio", debit: "", credit: "50.00" },
    ],
  };

  it("acepta un asiento balanceado de dos o más líneas", () => {
    expect(validateEntryDraft(draft)).toEqual({ valid: true, errors: {} });
  });

  it("aplica longitudes y cantidad de líneas del contrato", () => {
    expect(validateEntryDraft({ ...draft, concept: "x".repeat(201) }).errors.concept).toBeTruthy();
    expect(validateEntryDraft({ ...draft, detail: "x".repeat(4001) }).errors.detail).toBeTruthy();
    expect(validateEntryDraft({ ...draft, lines: [draft.lines[0]] }).errors.lines).toBeTruthy();
    expect(validateEntryDraft({ ...draft, lines: Array.from({ length: 101 }, (_, i) => ({ ...draft.lines[i % 2] })) }).errors.lines).toBeTruthy();
    // Las cuentas vienen del catálogo: deben ser del plan elegido e imputables.
    expect(validateEntryDraft({ ...draft, lines: [{ ...draft.lines[0], account: { ...draft.lines[0].account, plan_id: 2 } }, draft.lines[1]] }).errors.line_fields).toBeTruthy();
    expect(validateEntryDraft({ ...draft, lines: [{ ...draft.lines[0], account: { ...draft.lines[0].account, is_postable: false } }, draft.lines[1]] }).errors.line_fields).toBeTruthy();
    expect(validateEntryDraft({ ...draft, plan_id: "" }).errors.plan_id).toBeTruthy();
    expect(validateEntryDraft({ ...draft, lines: [{ ...draft.lines[0], description: "x".repeat(1001) }, draft.lines[1]] }).errors.line_fields).toBeTruthy();
  });
});
