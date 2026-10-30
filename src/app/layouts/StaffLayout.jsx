import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Archive, ExternalLink, PlusCircle, Wrench } from "lucide-react";
import Logo from "../../shared/ui/Logo.jsx";
import ThemeToggle from "../../shared/ui/ThemeToggle.jsx";
import { UserMenu } from "./PortalLayout.jsx";

export default function StaffLayout() {
  const { pathname } = useLocation();
  // «Banco» sigue activo en el detalle de un ticket, pero no al crear uno.
  const onBench = pathname === "/taller" || (pathname.startsWith("/taller/tickets") && pathname !== "/taller/tickets/nuevo");

  return (
    <div className="app app--nav">
      <header className="strip">
        <Logo />
        <nav className="tabs" aria-label="Navegación del taller">
          <NavLink to="/taller" end aria-current={onBench ? "page" : undefined} className={() => `tabs__link${onBench ? " is-active" : ""}`}><Wrench size={17} aria-hidden="true" /> Banco</NavLink>
          <NavLink to="/taller/inventario" className={({ isActive }) => `tabs__link${isActive ? " is-active" : ""}`}><Archive size={17} aria-hidden="true" /> Repuestos</NavLink>
          <NavLink to="/taller/tickets/nuevo" className={({ isActive }) => `tabs__link tabs__link--cta${isActive ? " is-active" : ""}`}><PlusCircle size={17} aria-hidden="true" /> Nuevo Ticket</NavLink>
        </nav>
        <div className="strip__actions">
          <ThemeToggle />
          <UserMenu extra={<Link to="/" className="user-menu__item"><ExternalLink size={16} aria-hidden="true" /> Sitio web</Link>} />
        </div>
      </header>
      <main className="app__main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
