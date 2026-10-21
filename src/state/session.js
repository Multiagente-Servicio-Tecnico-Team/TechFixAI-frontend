// Sesión del navegador: solo rol, nombre y correo; nunca contraseñas ni tokens.

const SESSION_KEY = "techfix.session";

export function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
}
