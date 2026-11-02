import { ShieldCheck, KeyRound, History, UserRoundCheck } from "lucide-react";
import Eyebrow from "../../../shared/ui/Eyebrow.jsx";

const items = [
  { icon: ShieldCheck, title: "Permisos por rol y sede", text: "Cada persona y agente accede solo al contexto necesario para su trabajo." },
  { icon: KeyRound, title: "Datos protegidos", text: "Cifrado en tránsito y reposo, retención configurable y entornos segregados." },
  { icon: History, title: "Bitácora de decisiones", text: "Diagnósticos, cambios de estado, reservas y aprobaciones quedan registrados." },
  { icon: UserRoundCheck, title: "Supervisión humana", text: "Escalamientos y aprobaciones obligatorias según monto, riesgo o excepción." },
];

export default function Security() {
  return (
    <section className="section" id="seguridad">
      <div className="container split">
        <div>
          <Eyebrow>Control empresarial</Eyebrow>
          <h2 className="h2">IA gobernada para una operación confiable</h2>
          <p className="lead">Automatiza con límites claros, trazabilidad completa y control humano en decisiones sensibles.</p>
        </div>
        <ul className="ruled">
          {items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="ruled__item">
              <Icon size={22} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
