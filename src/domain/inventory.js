// Reglas del inventario de repuestos. Sin React ni navegador.
import { parseMoney } from "./money.js";

export const PART_CATEGORIES = [
  "Memorias RAM",
  "Almacenamiento SSD / HDD",
  "Pantallas",
  "Baterías",
  "Cargadores",
];

/** Mayúsculas, números y guiones: SSD-NVME-2TB-KC. */
export const SKU_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

const WHOLE = /^\d{1,6}$/;

/** Stock crítico: quedan tantas unidades como el mínimo de alerta, o menos. */
export const isLowStock = (part) => part.stock <= part.min;

/**
 * Valida el formulario de un repuesto. Devuelve los errores por campo y, si no hay, el repuesto listo
 * para guardar con el precio en céntimos.
 * @param form valores de texto del formulario: sku, name, category, compat, stock, min, price
 * @param options.editing al editar no se valida el SKU (no se puede cambiar)
 * @param options.existingSkus SKU ya registrados, para evitar duplicados al crear
 */
export function validatePart(form, { editing = false, existingSkus = [] } = {}) {
  const errors = {};
  const sku = String(form.sku ?? "").trim().toUpperCase();
  if (!editing) {
    if (!SKU_RE.test(sku) || sku.length > 50) errors.sku = "Usa mayúsculas, números y guiones (ej. SSD-NVME-2TB-KC).";
    else if (existingSkus.includes(sku)) errors.sku = "Este SKU ya existe en el inventario.";
  }
  const name = String(form.name ?? "").trim();
  if (name.length < 3 || name.length > 150) errors.name = "Ingresa el nombre del componente (3 a 150 caracteres).";
  if (!PART_CATEGORIES.includes(form.category)) errors.category = "Elige una categoría.";
  const stockText = String(form.stock ?? "").trim();
  const minText = String(form.min ?? "").trim();
  if (!WHOLE.test(stockText)) errors.stock = "Cantidad entera mayor o igual a 0.";
  if (!WHOLE.test(minText)) errors.min = "Cantidad entera mayor o igual a 0.";
  const price = parseMoney(form.price ?? "");
  if (price === null || price === 0) errors.price = "Importe válido, ej. 114.75.";

  if (Object.keys(errors).length) return { errors, part: null };
  return {
    errors,
    part: {
      sku,
      name,
      category: form.category,
      compat: String(form.compat ?? "").trim(),
      stock: Number(stockText),
      min: Number(minText),
      price,
    },
  };
}
