import { CalendarDays, Mail } from "lucide-react";
import Eyebrow from "../../../shared/ui/Eyebrow.jsx";

export default function CallToAction() {
  return (
    <section className="cta" id="demo">
      <div className="container cta__grid">
        <div>
          <Eyebrow>Tu operación puede empezar hoy</Eyebrow>
          <h2 className="cta__title">Convierte cada ticket en un flujo claro, coordinado y medible</h2>
        </div>
        <div className="cta__side">
          <p>
            Conoce cómo TechFix.AI se adapta a tus reglas, herramientas y equipo. Diseñamos contigo
            el primer flujo y medimos el impacto desde la operación piloto.
          </p>
          <div className="btn-row">
            <a href="mailto:hola@techfix.ai?subject=Solicitud%20de%20demo" className="btn btn--lg cta__primary">
              <CalendarDays size={18} aria-hidden="true" /> Solicitar una demo
            </a>
            <a href="mailto:hola@techfix.ai?subject=Consulta%20de%20producto" className="btn btn--lg cta__secondary">
              <Mail size={18} aria-hidden="true" /> Hablar con producto
            </a>
          </div>
          <p className="cta__note">Respuesta de un especialista en menos de 1 día hábil</p>
        </div>
      </div>
    </section>
  );
}
