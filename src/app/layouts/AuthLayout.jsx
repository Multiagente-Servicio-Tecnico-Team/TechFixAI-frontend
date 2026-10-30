import { Link, Outlet } from "react-router-dom";
import { UserRound } from "lucide-react";
import Logo from "../../shared/ui/Logo.jsx";
import ThemeToggle from "../../shared/ui/ThemeToggle.jsx";

export default function AuthLayout() {
  return (
    <div className="app">
      <header className="strip">
        <Logo />
        <div className="strip__actions">
          <nav className="strip__actions" aria-label="Ayuda">
            <Link to="/ayuda" className="strip__link hide-xs">Soporte Técnico</Link>
            <Link to="/ayuda#faq" className="strip__link hide-xs">Preguntas Frecuentes</Link>
            <span className="lang-badge" aria-label="Idioma: español">ES</span>
          </nav>
          <ThemeToggle />
          <Link to="/portal/acceso" className="avatar" aria-label="Acceder a mi cuenta">
            <UserRound size={18} />
          </Link>
        </div>
      </header>
      <main className="app__main">
        <Outlet />
      </main>
      <footer className="app-foot">
        <p>© 2026 TechFix.AI Inc. Todos los derechos reservados.</p>
        <nav aria-label="Legal">
          <Link to="/ayuda#legal">Términos de Servicio</Link>
          <Link to="/ayuda#legal">Política de Privacidad</Link>
          <Link to="/ayuda#legal">Certificaciones de Seguridad</Link>
        </nav>
      </footer>
    </div>
  );
}
