// Piezas comunes del chat de demostración y del chat conectado a los agentes.

/** Hora local corta para el pie de cada mensaje (por ejemplo, 14:05). */
export function chatTime() {
  return new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export function ChatTitle({ title }) {
  return (
    <div className="desk__head">
      <h1 className="title">{title}</h1>
      <span className="stamp stamp--ok">En línea</span>
    </div>
  );
}

export function CopilotHeader({ subtitle }) {
  return (
    <p className="desk__sub"><strong>TechFix Copilot</strong> · {subtitle}</p>
  );
}

export function UserMessage({ label, time, children }) {
  return (
    <div className="msg msg--user">
      <p className="msg__meta">{label} <time>{time}</time></p>
      <p className="msg__bubble">{children}</p>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="msg msg--bot">
      <div className="typing" role="status"><span /><span /><span /><span className="vh">El agente está escribiendo</span></div>
    </div>
  );
}
