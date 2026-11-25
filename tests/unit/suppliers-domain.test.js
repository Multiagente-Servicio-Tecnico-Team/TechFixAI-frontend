import { describe, expect, it } from "vitest";
import { emptySupplierDraft, leadTimeLabel, supplierToDraft, validateSupplier } from "../../src/domain/suppliers.js";

const draft = (overrides = {}) => ({ ...emptySupplierDraft(), name: "Distribuidora Tech", ...overrides });

describe("validateSupplier", () => {
  it("exige la razón social", () => {
    const { errors, payload } = validateSupplier(draft({ name: "   " }));
    expect(payload).toBeNull();
    expect(errors.name).toMatch(/razón social/);
  });

  it("envía campos vacíos como null y normaliza RUC, correo y espacios", () => {
    const { payload } = validateSupplier(draft({ name: "  Distribuidora   Tech ", tax_id: " 20601234567 ", contact_email: " Ventas@Prov.PE ", delivery_lead_days: "0" }));
    expect(payload).toEqual({
      name: "Distribuidora Tech",
      tax_id: "20601234567",
      contact_name: null,
      contact_email: "ventas@prov.pe",
      phone: null,
      address: null,
      delivery_lead_days: 0,
    });
  });

  it.each([
    ["contact_email", "no-es-correo"],
    ["phone", "llamar mañana"],
    ["tax_id", "RUC 2060"],
    ["delivery_lead_days", "-1"],
    ["delivery_lead_days", "2.5"],
  ])("rechaza %s inválido (%s)", (field, value) => {
    const { errors, payload } = validateSupplier(draft({ [field]: value }));
    expect(payload).toBeNull();
    expect(errors[field]).toBeTruthy();
  });

  it("convierte un proveedor del backend en borrador editable", () => {
    expect(supplierToDraft({ id: 4, name: "X", tax_id: null, delivery_lead_days: 5, active: true })).toEqual({
      ...emptySupplierDraft(), name: "X", delivery_lead_days: "5",
    });
  });
});

describe("leadTimeLabel", () => {
  it("describe el plazo en español", () => {
    expect(leadTimeLabel(null)).toBe("Sin plazo indicado");
    expect(leadTimeLabel(0)).toBe("Entrega el mismo día");
    expect(leadTimeLabel(1)).toBe("1 día de entrega");
    expect(leadTimeLabel(4)).toBe("4 días de entrega");
  });
});
