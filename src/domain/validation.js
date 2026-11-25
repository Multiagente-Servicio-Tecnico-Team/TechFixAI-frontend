// Reglas de validación de formularios; las mismas que aplica el backend.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Móvil peruano: 9 dígitos (se ignoran espacios y guiones). */
export const isMobilePhone = (phone) => /^\d{9}$/.test(String(phone).replace(/\D/g, ""));

export const PASSWORD_RULES = [
  { id: "len", label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { id: "upper", label: "Una mayúscula (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "num", label: "Al menos un número (0-9)", test: (p) => /\d/.test(p) },
  { id: "sym", label: "Un símbolo especial (!@#$)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isStrongPassword = (p) => PASSWORD_RULES.every((r) => r.test(p));
