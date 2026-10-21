// Importes en céntimos (enteros) para evitar errores de coma flotante. Sin React ni navegador.

export function formatPEN(cents) {
  if (cents === null || cents === undefined) return "Por cotizar";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const soles = Math.floor(abs / 100).toLocaleString("en-US");
  const cts = String(abs % 100).padStart(2, "0");
  return `${sign}S/. ${soles}.${cts}`;
}

/** Convierte "114.75" en 11475. Devuelve null si el texto no es un importe válido. */
export function parseMoney(text) {
  const clean = String(text).trim().replace(/,/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(clean);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || "0").padEnd(2, "0"));
}

export function centsToInput(cents) {
  if (cents === null || cents === undefined) return "";
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
