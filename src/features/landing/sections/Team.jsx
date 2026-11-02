import { RefreshCw, GitBranch, UserCheck, Stethoscope, Filter, PackageSearch, MessageSquareText, Timer, BadgeCheck, BellRing } from "lucide-react";
import Eyebrow from "../../../shared/ui/Eyebrow.jsx";

const points = [
  { icon: RefreshCw, title: "Contexto compartido, sin duplicar trabajo", text: "El expediente acompaña al ticket de principio a fin." },
  { icon: GitBranch, title: "Decisiones conectadas a datos reales", text: "Precios, stock y tiempos se verifican antes de responder." },
  { icon: UserCheck, title: "Control humano donde importa", text: "Reglas, permisos y escalamiento para cada decisión sensible." },
];

const nodes = [
  { icon: Stethoscope, title: "Diagnóstico y cotización", text: "Hipótesis, piezas y presupuesto" },
  { icon: Filter, title: "Triage y tickets", text: "Prioridad, SLA y asignación" },
  { icon: PackageSearch, title: "Inventario y reserva", text: "Disponibilidad y reposición" },
  { icon: MessageSquareText, title: "Seguimiento al cliente", text: "Estados, aprobaciones y avisos" },
];

const benefits = [
  { icon: Timer, title: "Menos espera entre etapas", text: "El siguiente paso se activa en cuanto existe la información necesaria, sin depender de seguimientos manuales.", tag: "SLA visible en cada transición" },
  { icon: BadgeCheck, title: "Cotizaciones consistentes", text: "Mano de obra, repuestos y disponibilidad se validan antes de presentar una propuesta al cliente.", tag: "Precio y stock trazables" },
  { icon: BellRing, title: "Clientes siempre informados", text: "Cada cambio relevante dispara el mensaje correcto por el canal preferido, con contexto y próximo paso.", tag: "Comunicación proactiva" },
];

export default function Team() {
  return (
    <section className="section">
      <div className="container">
        <div className="split">
          <div>
            <Eyebrow>Una operación, múltiples especialistas</Eyebrow>
            <h2 className="h2">No es un chatbot. Es un equipo digital coordinado.</h2>
            <p className="lead">
              Cada agente entiende una parte crítica del servicio. El orquestador comparte contexto,
              asigna tareas y valida dependencias para que diagnóstico, stock y comunicación avancen
              como un solo sistema.
            </p>
            <ul className="ruled">
              {points.map(({ icon: Icon, title, text }) => (
                <li key={title} className="ruled__item">
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="orch" role="group" aria-label="Diagrama: el orquestador TechFix coordina cuatro agentes">
            <div className="orch__hub">
              <strong>Orquestador TechFix</strong>
              <p>Coordina contexto, prioridades y reglas</p>
            </div>
            <ul className="orch__nodes">
              {nodes.map(({ icon: Icon, title, text }) => (
                <li key={title} className="jobtag">
                  <Icon size={20} aria-hidden="true" />
                  <strong>{title}</strong>
                  <p className="muted small">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="benefits">
          {benefits.map(({ icon: Icon, title, text, tag }) => (
            <article key={title} className="benefit">
              <Icon size={24} aria-hidden="true" />
              <h3 className="subtitle">{title}</h3>
              <p>{text}</p>
              <span className="stamp stamp--info">{tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
