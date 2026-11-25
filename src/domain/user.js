// Datos de la cuenta: nombre, correo, teléfono y rol. Las claves (nombre, apellido, rol) son las del backend.

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** "+51" + "987 654 321" -> "+51987654321" (formato E.164). */
export function toE164(prefix, phone) {
  return `${prefix}${String(phone).replace(/\D/g, "")}`;
}

/** "Martín Gómez Ruiz" -> { firstName: "Martín", lastName: "Gómez Ruiz" } (columnas name y last_name). */
export function splitFullName(full) {
  const clean = String(full).trim().split(/\s+/).filter(Boolean);
  return { firstName: clean[0] || "", lastName: clean.slice(1).join(" ") || undefined };
}

export function fullName(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(" ");
}

/** Rol de la tabla users -> área del frontend. Sin rol (modo demostración) se usa el área de la pantalla. */
export function areaForRole(role, fallback) {
  if (role === "CUSTOMER") return "client";
  if (role === "TECHNICIAN" || role === "ADMIN") return "staff";
  return fallback;
}

export function nameFromEmail(email) {
  const local = String(email).split("@")[0].replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) || "Cliente";
}
