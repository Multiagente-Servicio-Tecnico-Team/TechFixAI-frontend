import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "../../state/store.jsx";

/** Protege rutas por rol; si no hay sesión, envía al acceso correspondiente. */
export function RequireRole({ role, children }) {
  const { session, signedOut } = useStore();
  const location = useLocation();
  if (session?.role === role) return children;
  // Tras "Cerrar sesión" se vuelve a la landing en lugar de pedir acceso otra vez.
  if (!session && signedOut) return <Navigate to="/" replace />;
  const to = role === "staff" ? "/taller/acceso" : "/portal/acceso";
  return <Navigate to={to} replace state={{ from: location.pathname }} />;
}
