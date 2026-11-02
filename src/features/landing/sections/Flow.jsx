import { MessageCircle, ListTree, ScanSearch, Package, Send } from "lucide-react";
import Eyebrow from "../../../shared/ui/Eyebrow.jsx";

const steps = [
  { icon: MessageCircle, title: "Ingreso y contexto", text: "Captura equipo, síntoma, urgencia y evidencia desde chat o recepción.", result: "Ticket estructurado" },
  { icon: ListTree, title: "Triage automático", text: "Clasifica, prioriza y asigna SLA según reglas del servicio.", result: "Ruta y responsable" },
  { icon: ScanSearch, title: "Diagnóstico y precio", text: "Propone pruebas, mano de obra y piezas compatibles.", result: "Cotización validada" },
  { icon: Package, title: "Reserva y ejecución", text: "Bloquea stock, activa tareas y mantiene el expediente al día.", result: "Trabajo listo" },
  { icon: Send, title: "Seguimiento y cierre", text: "Solicita aprobación, avisa avances y coordina entrega.", result: "Cliente informado" },
];

export default function Flow() {
  return (
    <section className="section section--band" id="flujo">
      <div className="container">
        <Eyebrow>Del primer mensaje al cierre</Eyebrow>
        <h2 className="h2">Un flujo continuo, sin puntos ciegos</h2>
        <p className="lead">
          TechFix.AI convierte cada interacción en una acción operativa. El taller conserva el
          control y el cliente ve exactamente qué está ocurriendo.
        </p>
        <ol className="route">
          {steps.map(({ icon: Icon, title, text, result }, i) => (
            <li key={title} className="route__stop">
              <span className="route__num mono">{i + 1}</span>
              <Icon size={22} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="stamp">{result}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
