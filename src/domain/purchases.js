import { formatPEN } from "./money.js";

export const PURCHASE_STATUS_LABELS = Object.freeze({
  REGISTERED: "Registrada",
  PARTIALLY_RECEIVED: "Recepción parcial",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
});

export const PAYMENT_STATUS_LABELS = Object.freeze({ PENDING: "Pendiente", PAID: "Pagada" });
export const PAYMENT_METHOD_LABELS = Object.freeze({ TRANSFER: "Transferencia", CASH: "Efectivo", CARD: "Tarjeta", OTHER: "Otro" });
export const DOCUMENT_TYPE_LABELS = Object.freeze({ FACTURA: "Factura", BOLETA: "Boleta", RECIBO: "Recibo", NOTA_CREDITO: "Nota de crédito", OTRO: "Otro" });

export function parsePurchaseMoney(value) {
  const match = /^(0|[1-9]\d{0,11})\.(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return BigInt(match[1]) * 100n + BigInt(match[2]);
}

export function formatPurchaseMoney(cents) {
  if (typeof cents !== "bigint") return "—";
  return formatPEN(Number(cents));
}

export function quantityToMilli(value) {
  const match = /^(0|[1-9]\d{0,8})(?:\.(\d{1,3}))?$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return BigInt(match[1]) * 1000n + BigInt((match[2] ?? "").padEnd(3, "0") || "0");
}

export function milliToQuantity(milli) {
  if (typeof milli !== "bigint" || milli < 0n) return "";
  const whole = milli / 1000n;
  const fraction = String(milli % 1000n).padStart(3, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function calculateLineGrossCents(quantity, unitCost) {
  const milli = quantityToMilli(quantity);
  const cents = parsePurchaseMoney(unitCost);
  if (milli === null || cents === null) return null;
  return (milli * cents + 500n) / 1000n;
}

export function calculatePurchaseTotals(draft) {
  let subtotal = 0n;
  let discounts = 0n;
  let taxes = 0n;
  let valid = true;
  for (const line of draft.items ?? []) {
    const gross = calculateLineGrossCents(line.quantity, line.unit_cost);
    const discount = parsePurchaseMoney(line.discount_amount || "0.00");
    const tax = parsePurchaseMoney(line.tax_amount || "0.00");
    if (gross === null || discount === null || tax === null || discount > gross) {
      valid = false;
      continue;
    }
    subtotal += gross;
    discounts += discount;
    taxes += tax;
  }
  const charges = parsePurchaseMoney(draft.other_charges || "0.00");
  if (charges === null) valid = false;
  return {
    valid,
    subtotal,
    discounts,
    taxes,
    charges: charges ?? 0n,
    total: subtotal - discounts + taxes + (charges ?? 0n),
  };
}

export function validatePurchaseDraft(draft) {
  const errors = {};
  if (!Number.isInteger(Number(draft.supplier_id)) || Number(draft.supplier_id) < 1) errors.supplier_id = "Selecciona un proveedor activo.";
  if (!draft.document_type) errors.document_type = "Selecciona el tipo de comprobante.";
  if (!draft.document_number?.trim() || draft.document_number.trim().length > 40) errors.document_number = "Ingresa un número de comprobante (máximo 40 caracteres).";
  if (!draft.issue_date) errors.issue_date = "Ingresa la fecha de emisión.";
  if (draft.due_date && draft.issue_date && draft.due_date < draft.issue_date) errors.due_date = "El vencimiento no puede ser anterior a la emisión.";
  if (!PAYMENT_METHOD_LABELS[draft.payment_method]) errors.payment_method = "Selecciona un método de pago.";
  if (!PAYMENT_STATUS_LABELS[draft.payment_status]) errors.payment_status = "Selecciona un estado de pago.";
  if (parsePurchaseMoney(draft.other_charges || "0.00") === null) errors.other_charges = "Usa un importe con dos decimales.";
  if (!Array.isArray(draft.items) || draft.items.length < 1) errors.items = "Agrega al menos una línea.";
  (draft.items ?? []).forEach((line, index) => {
    if (!line.description?.trim() || line.description.trim().length > 300) errors[`items.${index}.description`] = "La descripción es obligatoria (máximo 300 caracteres).";
    if (line.type === "catalog" && (!Number.isInteger(line.spare_part_id) || line.spare_part_id < 1)) errors[`items.${index}.spare_part_id`] = "Selecciona un repuesto del inventario.";
    const quantity = quantityToMilli(line.quantity);
    if (quantity === null || quantity <= 0n) errors[`items.${index}.quantity`] = "Ingresa una cantidad mayor que cero, con hasta tres decimales.";
    if (line.spare_part_id && quantity !== null && quantity % 1000n !== 0n) errors[`items.${index}.quantity`] = "Para repuestos del inventario usa una cantidad entera.";
    const gross = calculateLineGrossCents(line.quantity, line.unit_cost);
    const discount = parsePurchaseMoney(line.discount_amount || "0.00");
    if (gross === null) errors[`items.${index}.unit_cost`] = "Ingresa un costo con dos decimales.";
    if (discount === null || (gross !== null && discount > gross)) errors[`items.${index}.discount_amount`] = "El descuento no puede superar el importe bruto.";
    if (parsePurchaseMoney(line.tax_amount || "0.00") === null) errors[`items.${index}.tax_amount`] = "Ingresa un impuesto con dos decimales.";
  });
  const totals = calculatePurchaseTotals(draft);
  if (!totals.valid && !Object.keys(errors).length) errors.items = "Revisa las cantidades e importes de las líneas.";
  return { valid: Object.keys(errors).length === 0, errors, totals };
}
