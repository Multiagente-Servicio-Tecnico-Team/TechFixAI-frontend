import { useEffect, useRef } from "react";
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

  const firstRender = useRef(true);

  useEffect(() => {
    // Cada pantalla se anuncia con su título y el foco pasa al contenido nuevo.
    const heading = document.querySelector("main h1")?.textContent;
    document.title = heading ? `${heading} · TechFix.AI` : "TechFix.AI";
    const isFirst = firstRender.current;
    firstRender.current = false;

    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        if (!isFirst) {
          el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
        }
        return;
      }
    }
    window.scrollTo(0, 0);
    if (!isFirst) document.querySelector("main")?.focus({ preventScroll: true });
  }, [pathname, hash]);
  return null;
}
