import { Brain, Waypoints, Warehouse, MessagesSquare, Check } from "lucide-react";
import Eyebrow from "../../../shared/ui/Eyebrow.jsx";

const agents = [
  { icon: Brain, name: "Agente Diagnóstico", chain: ["Evidencia", "Hipótesis", "Cotización"], items: ["Interpreta síntomas y antecedentes", "Sugiere pruebas y nivel técnico", "Genera presupuesto trazable"] },
  { icon: Waypoints, name: "Agente Triage", chain: ["Entrada", "Prioridad", "Responsable"], items: ["Clasifica tipo y urgencia", "Aplica SLA y reglas del taller", "Escala excepciones críticas"] },
  { icon: Warehouse, name: "Agente Inventario", chain: ["Demanda", "Stock", "Reserva"], items: ["Valida compatibilidad de repuestos", "Reserva unidades por ticket", "Anticipa quiebres de stock"] },
  { icon: MessagesSquare, name: "Agente Seguimiento", chain: ["Evento", "Mensaje", "Respuesta"], items: ["Explica estados con lenguaje claro", "Solicita y registra aprobaciones", "Coordina retiro y postservicio"] },
];

export default function Agents() {
  return (
    <section className="section" id="agentes">
      <div className="container">
        <Eyebrow>Especialización que escala</Eyebrow>
        <h2 className="h2">Cada agente domina una decisión crítica</h2>
        <p className="lead">
          Activa las capacidades que necesita tu operación y conserva reglas específicas por sede,
          categoría o nivel técnico.
        </p>
        <ul className="agents">
          {agents.map(({ icon: Icon, name, chain, items }) => (
            <li key={name} className="agent">
              <div className="agent__name">
                <Icon size={26} aria-hidden="true" />
                <h3 className="subtitle">{name}</h3>
              </div>
              <p className="kicker agent__chain">{chain.join(" → ")}</p>
              <ul className="agent__items">
                {items.map((it) => (
                  <li key={it}><Check size={16} aria-hidden="true" />{it}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
