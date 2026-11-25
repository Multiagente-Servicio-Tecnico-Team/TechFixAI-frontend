import { Link } from "react-router-dom";
import { Activity, LifeBuoy, Mail, MessageSquareText, Scale } from "lucide-react";

/** Pantalla creada: los diseños enlazan "Soporte Técnico" y "Preguntas Frecuentes" pero no los incluían. */
const faqs = [
  {
    q: "¿Cómo consulto el estado de mi reparación?",
    a: "Ingresa al portal de clientes y abre Mis Tickets. Cada ticket muestra su estado actual: esperando aprobación, en diagnóstico, listo para retiro o completado.",
  },
  {
    q: "¿Cómo apruebo un presupuesto?",
    a: "Desde Mis Tickets o desde el chat con el asistente IA. El presupuesto detalla mano de obra y repuestos; al aprobarlo se registra la fecha y hora y el taller inicia la reparación.",
  },
  {
    q: "¿El asistente IA puede cambiar el precio de mi presupuesto?",
    a: "No. Los importes provienen del catálogo y del inventario del taller. Las excepciones las revisa una persona del equipo antes de comunicarse contigo.",
  },
  {
    q: "Olvidé mi contraseña, ¿qué hago?",
    a: "Usa la opción ¿Olvidaste tu contraseña? en la pantalla de acceso. Recibirás un enlace temporal válido durante 15 minutos.",
  },
  {
    q: "¿Para qué usan mi número de teléfono?",
    a: "Solo para avisos de retiro y actualizaciones del triage de tus equipos.",
  },
];

export default function Help() {
  return (
    <div className="help">
      <nav className="help__index" aria-label="Contenido de la ayuda">
        <a href="#faq">Preguntas Frecuentes</a>
        <a href="#estado">Estado del sistema</a>
        <a href="#legal">Términos, privacidad y certificaciones</a>
      </nav>
      <div className="help__content">
        <div className="help__head">
          <span className="stamp stamp--info"><LifeBuoy size={14} aria-hidden="true" />Soporte técnico</span>
          <h1 className="auth__title">¿En qué podemos ayudarte?</h1>
          <p className="auth__lead">Elige el canal que prefieras. El asistente IA atiende tus consultas sobre tickets y presupuestos en todo momento.</p>
          <div className="help-channels">
            <Link to="/portal/asistente" className="jobtag help-channel">
              <MessageSquareText size={20} aria-hidden="true" />
              <strong>Chat con el asistente IA</strong>
              <span>Diagnóstico y presupuestos</span>
            </Link>
            <a href="mailto:hola@techfix.ai" className="jobtag help-channel">
              <Mail size={20} aria-hidden="true" />
              <strong>hola@techfix.ai</strong>
              <span>Respuesta en menos de 1 día hábil</span>
            </a>
          </div>
        </div>

      <section id="faq">
          <h2 className="subtitle">Preguntas Frecuentes</h2>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
      </section>

      <section id="estado">
          <h2 className="subtitle"><Activity size={18} aria-hidden="true" /> Estado del sistema</h2>
          <p>Esta versión es un entorno de demostración: los datos se guardan solo en tu navegador mientras la pestaña está abierta.</p>
      </section>

      <section id="legal">
          <h2 className="subtitle"><Scale size={18} aria-hidden="true" /> Términos, privacidad y certificaciones</h2>
          <p>Los documentos legales definitivos están pendientes de publicación. Para consultas escribe a <a className="link" href="mailto:hola@techfix.ai">hola@techfix.ai</a>.</p>
      </section>
      </div>
    </div>
  );
}
