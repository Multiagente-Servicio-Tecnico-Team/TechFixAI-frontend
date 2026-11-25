import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Solo se guarda la preferencia visual; index.html la aplica antes del primer pintado.
export const THEME_KEY = "techfix-theme";

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);

  // Mantiene sincronizados otros botones de la misma página.
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(currentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  const change = () => {
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Sin almacenamiento el tema dura hasta recargar.
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={next === "light" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      onClick={change}
    >
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
