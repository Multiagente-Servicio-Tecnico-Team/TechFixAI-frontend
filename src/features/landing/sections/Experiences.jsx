import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleCheck } from "lucide-react";
import Eyebrow from "../../../shared/ui/Eyebrow.jsx";

const queue = [
  { id: "#TCK-2041", device: "MacBook Pro 14”", status: "Diagnóstico", tone: "info" },
  { id: "#TCK-2040", device: "iPhone 15 Pro Max", status: "Espera stock", tone: "warn" },
  { id: "#TCK-2038", device: "Dell XPS 15", status: "Listo retiro", tone: "ok" },
];

const workshopPoints = [
  "Carga de trabajo y SLA siempre visibles",
  "Reservas de piezas vinculadas al ticket",
  "Excepciones destacadas antes del retraso",
];

const clientPoints = [
  "Presupuesto explicado, no solo enviado",
  "Aprobación digital con registro de hora",
  "Seguimiento 24/7 desde cualquier dispositivo",
];

function Checks({ items }) {
  return (
    <ul className="exp__checks">
      {items.map((it) => (
        <li key={it}><CircleCheck size={16} aria-hidden="true" />{it}</li>
      ))}
    </ul>
  );
}

export default function Experiences() {
  const [approved, setApproved] = useState(false);

  return (
    <section className="section section--band">
      <div className="container">
        <Eyebrow>Dos experiencias, un mismo expediente</Eyebrow>
        <h2 className="h2">Claridad para el taller. Confianza para el cliente.</h2>
        <p className="lead">
          El equipo operativo gana una vista accionable de cada caso, mientras el cliente recibe
          información concreta, aprueba presupuestos y consulta avances sin perseguir respuestas.
        </p>

        <div className="exp">
          <article className="exp__side">
            <p className="kicker">Para el taller</p>
            <h3 className="subtitle">Priorizar, resolver y anticipar</h3>
            <div className="exp__sample">
              <div className="exp__samplehead"><strong>Cola inteligente de hoy</strong><span className="kicker">24 tickets activos</span></div>
              <ul className="exp__queue">
                {queue.map((t) => (
                  <li key={t.id} className="jobtag">
                    <span className="kicker">{t.id}</span>
                    <strong>{t.device}</strong>
                    <span className={`stamp stamp--${t.tone}`}>{t.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Checks items={workshopPoints} />
            <Link to="/taller" className="link exp__link">Ir al panel del taller <ArrowRight size={16} aria-hidden="true" /></Link>
          </article>

          <article className="exp__side">
            <p className="kicker">Para el cliente</p>
            <h3 className="subtitle">Entender, aprobar y seguir</h3>
            <div className="exp__sample">
              <p className="bubble bubble--me">¿Ya confirmaron si el SSD necesita reemplazo?</p>
              <p className="bubble">
                Sí. El diagnóstico fue validado y reservamos una unidad compatible. La
                cotización está lista para tu aprobación.
              </p>
              <div className="jobtag">
                <span className="small muted">Total calculado</span>
                <strong className="mono exp__total">S/. 395.00</strong>
                <button type="button" className="btn btn--primary btn--block" onClick={() => setApproved(true)} disabled={approved}>
                  {approved ? (
                    <><CircleCheck size={18} aria-hidden="true" /> Presupuesto aprobado · reparación autorizada</>
                  ) : (
                    "Aprobar presupuesto y autorizar reparación"
                  )}
                </button>
              </div>
            </div>
            <Checks items={clientPoints} />
            <Link to="/portal/tickets" className="link exp__link">Ir al portal del cliente <ArrowRight size={16} aria-hidden="true" /></Link>
          </article>
        </div>
      </div>
    </section>
  );
}
