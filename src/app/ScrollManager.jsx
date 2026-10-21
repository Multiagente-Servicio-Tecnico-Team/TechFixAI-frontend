import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../state/store.jsx";

/** Lleva al inicio en cada cambio de ruta, o al ancla indicada en el hash. */
export function ScrollManager() {
  const { pathname, hash } = useLocation();
  const { signedOut, dispatch } = useStore();

  // Al llegar a la landing tras cerrar sesión, las rutas protegidas vuelven a pedir acceso.
  useEffect(() => {
    if (signedOut && pathname === "/") dispatch({ type: "clearSignedOut" });
  }, [signedOut, pathname, dispatch]);

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
