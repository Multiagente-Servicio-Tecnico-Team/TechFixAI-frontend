// Piezas comunes del chat de demostración y del chat conectado a los agentes.
import { Bot, Brain, UserRound } from "lucide-react";

/** Hora local corta para el pie de cada mensaje (por ejemplo, 14:05). */
export function chatTime() {
  return new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export function ChatTitle({ title }) {
  return (
    <div className="chat-title">
      <h1>{title}</h1>
      <span className="pill pill--green"><span className="pill__dot" />En línea</span>
    </div>
  );
}

export function CopilotHeader({ subtitle }) {
  return (
    <header className="copilot__head">
      <span className="copilot__avatar"><Bot size={22} aria-hidden="true" /></span>
      <div>
        <h2>TechFix Copilot</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

export function UserMessage({ label, time, children }) {
  return (
    <div className="msg msg--user">
      <div className="msg__content">
        <p className="msg__meta">{label} <time>{time}</time></p>
        <p className="msg__bubble">{children}</p>
      </div>
      <span className="msg__avatar msg__avatar--user"><UserRound size={16} aria-hidden="true" /></span>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="msg msg--bot">
      <span className="msg__avatar"><Brain size={16} aria-hidden="true" /></span>
      <div className="typing" aria-label="El agente está escribiendo"><span /><span /><span /></div>
    </div>
  );
}
