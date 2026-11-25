// Reglas de proveedores que comparten el formulario y las pruebas. Los límites son los del backend (SupplierWrite).
export const SUPPLIER_LIMITS = Object.freeze({ name: 200, tax_id: 20, contact_name: 200, contact_email: 255, phone: 30, address: 500 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s()-]*$/;
const TAX_ID_RE = /^[A-Za-z0-9-]+$/;

export const SUPPLIER_STATUS_FILTERS = Object.freeze([
  { value: "", label: "Todos los estados" },
  { value: "true", label: "Solo activos" },
  { value: "false", label: "Solo inactivos" },
]);

export function emptySupplierDraft() {
  return { name: "", tax_id: "", contact_name: "", contact_email: "", phone: "", address: "", delivery_lead_days: "" };
}

export function supplierToDraft(supplier) {
  const text = (value) => (value == null ? "" : String(value));
  return {
    name: text(supplier.name),
    tax_id: text(supplier.tax_id),
    contact_name: text(supplier.contact_name),
    contact_email: text(supplier.contact_email),
    phone: text(supplier.phone),
    address: text(supplier.address),
    delivery_lead_days: text(supplier.delivery_lead_days),
  };
}

/** Valida el borrador y devuelve el cuerpo que acepta el backend (campos vacíos como null). */
export function validateSupplier(draft) {
  const errors = {};
  const clean = (key) => String(draft[key] ?? "").trim();
  const name = clean("name").replace(/\s+/g, " ");
  const taxId = clean("tax_id").toUpperCase();
  const contactName = clean("contact_name");
  const email = clean("contact_email").toLowerCase();
  const phone = clean("phone");
  const address = clean("address");
  const days = clean("delivery_lead_days");

  if (!name) errors.name = "Ingresa la razón social del proveedor.";
  else if (name.length > SUPPLIER_LIMITS.name) errors.name = `La razón social admite hasta ${SUPPLIER_LIMITS.name} caracteres.`;
  if (taxId && (taxId.length > SUPPLIER_LIMITS.tax_id || !TAX_ID_RE.test(taxId))) {
    errors.tax_id = `Usa solo letras, números o guiones (máximo ${SUPPLIER_LIMITS.tax_id}).`;
  }
  if (contactName.length > SUPPLIER_LIMITS.contact_name) errors.contact_name = `El contacto admite hasta ${SUPPLIER_LIMITS.contact_name} caracteres.`;
  if (email && (email.length > SUPPLIER_LIMITS.contact_email || !EMAIL_RE.test(email))) errors.contact_email = "Ingresa un correo válido, por ejemplo ventas@proveedor.pe.";
  if (phone && (phone.length > SUPPLIER_LIMITS.phone || !PHONE_RE.test(phone))) errors.phone = "Ingresa un teléfono válido, por ejemplo +51 987 654 321.";
  if (address.length > SUPPLIER_LIMITS.address) errors.address = `La dirección admite hasta ${SUPPLIER_LIMITS.address} caracteres.`;
  if (days && !/^\d{1,3}$/.test(days)) errors.delivery_lead_days = "Indica los días como un número entero entre 0 y 999.";

  if (Object.keys(errors).length) return { errors, payload: null };
  return {
    errors,
    payload: {
      name,
      tax_id: taxId || null,
      contact_name: contactName || null,
      contact_email: email || null,
      phone: phone || null,
      address: address || null,
      delivery_lead_days: days === "" ? null : Number(days),
    },
  };
}

export function leadTimeLabel(days) {
  if (days == null) return "Sin plazo indicado";
  if (days === 0) return "Entrega el mismo día";
  return days === 1 ? "1 día de entrega" : `${days} días de entrega`;
}
