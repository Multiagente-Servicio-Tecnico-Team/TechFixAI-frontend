import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, MessageSquareText, TicketCheck, UserRound } from "lucide-react";
import Logo from "../../shared/ui/Logo.jsx";
import ThemeToggle from "../../shared/ui/ThemeToggle.jsx";
import { useStore } from "../../state/store.jsx";
import { authApi } from "../../features/auth/authApi.js";

export function UserMenu({ extra }) {
  const { session, logout } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    await authApi.logout();
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de usuario"
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound size={18} />
      </button>
      {open && (
        <div className="user-menu__panel" role="menu">
          <p className="user-menu__name">{session?.name}</p>
          <p className="user-menu__mail">{session?.email}</p>
          {extra}
          <button type="button" role="menuitem" className="user-menu__item" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

const tabClass = ({ isActive }) => `tabs__link${isActive ? " is-active" : ""}`;

export default function PortalLayout() {
  return (
    <div className="app app--nav">
      <header className="strip">
        <Logo />
        <nav className="tabs" aria-label="Portal del cliente">
          <NavLink to="/portal/tickets" className={tabClass}><TicketCheck size={17} aria-hidden="true" /> Mis Tickets</NavLink>
          <NavLink to="/portal/asistente" className={tabClass}><MessageSquareText size={17} aria-hidden="true" /> Asistente</NavLink>
        </nav>
        <div className="strip__actions">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="app__main">
        <Outlet />
      </main>
      <footer className="app-foot">
        <p>TechFix.AI · Plataforma Inteligente de Servicio Técnico</p>
        <p>© 2026 TechFix.AI. Diagnóstico autónomo y gestión de triage de hardware.</p>
      </footer>
    </div>
  );
}
