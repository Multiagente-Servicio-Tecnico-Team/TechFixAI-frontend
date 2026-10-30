import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Solo se guarda la preferencia visual; index.html la aplica antes del primer pintado.
export const THEME_KEY = "techfix-theme";

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(currentTheme);

  // Mantiene sincronizados los demás botones de la página (p. ej. el del menú móvil).
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
      className={`theme-toggle ${className}`.trim()}
      aria-label={next === "light" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={next === "light" ? "Tema claro" : "Tema oscuro"}
      onClick={change}
    >
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
