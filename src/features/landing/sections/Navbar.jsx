import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "../../../shared/ui/Logo.jsx";
import ThemeToggle from "../../../shared/ui/ThemeToggle.jsx";
import { useStore } from "../../../state/store.jsx";

const links = [
  { href: "#plataforma", label: "Plataforma" },
  { href: "#agentes", label: "Agentes" },
  { href: "#flujo", label: "Flujo" },
  { href: "#seguridad", label: "Seguridad" },
];

export default function Navbar() {
  const { session } = useStore();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Con sesión abierta se ofrece volver al área correspondiente en lugar de "Iniciar sesión".
  const account = session
    ? { to: session.role === "staff" ? "/taller" : "/portal/tickets", label: session.role === "staff" ? "Ir al panel" : "Ir a mi portal" }
    : { to: "/portal/acceso", label: "Iniciar sesión" };

  return (
    <header className="strip nav">
      <Logo />
      <nav className="nav__links" aria-label="Principal">
        {links.map((l) => (
          <a key={l.href} href={l.href} className="strip__link">{l.label}</a>
        ))}
      </nav>
      <div className="strip__actions">
        <Link to={account.to} className="strip__link nav__wide">{account.label}</Link>
        <a href="#demo" className="btn nav__demo nav__wide">
          <ArrowRight size={18} aria-hidden="true" /> Solicitar demo
        </a>
        <ThemeToggle />
        <button
          type="button"
          className="theme-toggle nav__toggle"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="nav__mobile">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={close}>{l.label}</a>
          ))}
          <Link to={account.to} onClick={close}>{account.label}</Link>
          {!session && <Link to="/taller/acceso" onClick={close}>Acceso para el taller</Link>}
          <a href="#demo" onClick={close}>Solicitar demo</a>
        </div>
      )}
    </header>
  );
}
