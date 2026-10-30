import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Ticket, Package, MessageCircle, CircleCheck } from "lucide-react";

const views = {
  taller: {
    nav: "Taller y triage",
    to: "/taller",
    icon: Ticket,
    stats: [
      { label: "Tickets activos", value: "24", note: "Capacidad al 78%" },
      { label: "Esperando repuestos", value: "05", note: "Reserva automatizada" },
      { label: "Listos para retiro", value: "11", note: "Aviso enviado" },
    ],
  },
  stock: {
    nav: "Stock y repuestos",
    to: "/taller/inventario",
    icon: Package,
    stats: [
      { label: "Reservas activas", value: "17", note: "Vinculadas a tickets" },
      { label: "Bajo mínimo", value: "03", note: "Reposición sugerida" },
      { label: "Compatibilidad validada", value: "98%", note: "Últimos 30 días" },
    ],
  },
  portal: {
    nav: "Portal del cliente",
    to: "/portal/tickets",
    icon: MessageCircle,
    stats: [
      { label: "Conversaciones abiertas", value: "09", note: "Respuesta media 2 min" },
      { label: "Aprobaciones pendientes", value: "04", note: "Recordatorio programado" },
      { label: "Aprobadas hoy", value: "12", note: "Sin llamada telefónica" },
    ],
  },
};

const stations = ["Nuevo", "En revisión", "Esperando stock", "Aprobado"];

export default function Dashboard() {
  const [view, setView] = useState("taller");
  const current = views[view];

  return (
    <div className="dash">
      <div className="toggle-group" role="group" aria-label="Vista del panel">
        {Object.entries(views).map(([key, v]) => {
          const Icon = v.icon;
          return (
            <button key={key} type="button" className="toggle dash__view" aria-pressed={view === key} onClick={() => setView(key)}>
              <Icon size={15} aria-hidden="true" /> {v.nav}
            </button>
          );
        })}
      </div>

      <dl className="dash__stats" key={view}>
        {current.stats.map(({ label, value, note }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="dash__value">{value}</dd>
            <dd className="dash__note">{note}</dd>
          </div>
        ))}
      </dl>

      <article className="jobtag jobtag--lg">
        <p className="kicker">#TCK-2041</p>
        <h2 className="subtitle">MacBook Pro 14”</h2>
        <ol className="rail" style={{ "--rail-steps": stations.length }}>
          {stations.map((s, i) => (
            <li key={s} className={i === 0 ? "is-done" : i === 1 ? "is-now" : ""}>{s}</li>
          ))}
        </ol>
        <p className="dash__result">
          <CircleCheck size={18} aria-hidden="true" />
          <span><strong>Diagnóstico validado · repuesto reservado</strong><br />Cotización S/. 395.00 preparada para aprobación</span>
        </p>
      </article>

      <Link to={current.to} className="link dash__open">
        Abrir {current.nav.toLowerCase()} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
