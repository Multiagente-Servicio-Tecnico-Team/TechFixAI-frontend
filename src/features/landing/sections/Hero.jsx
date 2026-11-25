import { Link } from "react-router-dom";
import { Play, Layers, CircleCheck, ShieldCheck, Workflow } from "lucide-react";
import Eyebrow from "../../../shared/ui/Eyebrow.jsx";
import Dashboard from "./Dashboard.jsx";

const trust = [
  { icon: CircleCheck, label: "Implementación guiada" },
  { icon: ShieldCheck, label: "Datos bajo control" },
  { icon: Workflow, label: "Integración operativa" },
];

const integrations = ["WhatsApp Business", "Correo transaccional", "Catálogos de repuestos", "ERP y facturación"];

export default function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="container hero__grid">
        <div className="hero__copy">
          <Eyebrow>Sistema multiagente para servicio técnico</Eyebrow>
          <h1 className="hero__title">Cada reparación avanza con inteligencia coordinada</h1>
          <p className="lead">
            TechFix.AI conecta diagnóstico, triage, inventario y comunicación en un solo flujo.
            Agentes especializados colaboran para resolver más rápido, cotizar con precisión y
            mantener a cada cliente informado.
          </p>
          <div className="btn-row">
            <Link to="/portal/asistente" className="btn btn--primary btn--lg">
              <Play size={18} aria-hidden="true" /> Ver TechFix.AI en acción
            </Link>
            <a href="#agentes" className="btn btn--lg">
              <Layers size={18} aria-hidden="true" /> Explorar capacidades
            </a>
          </div>
          <ul className="hero__trust">
            {trust.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={16} aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
        </div>
        <div id="plataforma">
          <Dashboard />
        </div>
      </div>
      <div className="integrations">
        <div className="container integrations__inner">
          <span className="kicker">Operación conectada con</span>
          {integrations.map((name) => (
            <span key={name} className="integrations__item">{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
