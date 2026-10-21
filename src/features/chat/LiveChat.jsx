import { useEffect, useRef, useState } from "react";
import { Brain, CircleCheck, CircleX, Info, ReceiptText, RotateCcw, SendHorizontal, Ticket, TriangleAlert } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../state/store.jsx";
import { formatPEN, parseMoney } from "../../domain/money.js";
import { authApi } from "../auth/authApi.js";
import { chatApi as defaultChatApi } from "./chatApi.js";
import { TICKET_STATUS_LABEL } from "../../domain/tickets.js";
import RichText from "../../shared/ui/RichText.jsx";
import { ChatTitle, chatTime, CopilotHeader, TypingIndicator, UserMessage } from "./ChatParts.jsx";

function welcomeMessage(firstName) {
  return `Hola${firstName ? `, ${firstName}` : ""}. Soy TechFix Copilot. Puedo orientarte con soporte y reparaciones, consultar componentes y cotizaciones, ayudarte a armar una PC según tu presupuesto y resolver consultas de garantía o logística. ¿Qué necesitas hoy?`;
}

/** Importe del servidor ("180.00") mostrado sin cálculos en el navegador. */
const money = (amount) => formatPEN(parseMoney(amount));
const PATTERNS = [
  { id: "hierarchical", name: "Jerárquico" },
  { id: "orchestrator", name: "Orquestador" },
  { id: "decentralized", name: "Descentralizado" },
];
const PATTERN_DESCRIPTIONS = {
  hierarchical: "Jerarquía de atención y ventas; guarda tickets y presupuestos en PostgreSQL.",
  orchestrator: "Supervisor de agentes; guarda tickets y presupuestos en PostgreSQL.",
  decentralized: "Modo experimental: usa herramientas simuladas y no guarda tickets ni presupuestos.",
};

function QuoteCard({ quote, busy, onAction }) {
  const pending = quote.status === "proposed";
  return (
    <div className="quote">
      <div className="quote__head">
        <span className="icon-tile icon-tile--solid icon-tile--sm"><ReceiptText size={18} aria-hidden="true" /></span>
        <div>
          <strong>Cotización</strong>
          <p className="mono-small">Calculado por el agente de ventas</p>
        </div>
      </div>
      <div className="quote__body">
        {quote.lines.map((line) => (
          <div key={line.label} className="quote__line">
            <ReceiptText size={18} aria-hidden="true" />
            <span>{line.label}</span>
            <span className="mono">{money(line.amount)}</span>
          </div>
        ))}
        <div className="quote__total">
          <div className="quote__sum"><strong>Total:</strong><span>{money(quote.total)}<small> {quote.currency}</small></span></div>
        </div>
        {pending ? (
          <div className="btn-row btn-row--start">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => onAction("accept_quote")}>
            <CircleCheck size={18} aria-hidden="true" /> Confirmar y guardar
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => onAction("reject_quote")}>
            <CircleX size={18} aria-hidden="true" /> No guardar
            </button>
          </div>
        ) : (
          <p className={`ok-text${quote.status === "rejected" ? " muted" : ""}`}>
            {{ saved: "Ticket y presupuesto guardados · pendiente de aceptación", confirmed: "Cotización aceptada y registrada", rejected: "Propuesta no guardada" }[quote.status]
              || "Reemplazado por un presupuesto más reciente"}
          </p>
        )}
      </div>
    </div>
  );
}

/** Chat conectado al patrón LangGraph: el cliente se identifica con la sesión del inicio de sesión. */
export default function LiveChat({ api = defaultChatApi }) {
  const { session, logout } = useStore();
  const navigate = useNavigate();
  const firstName = (session?.name || "").split(" ")[0];
  const [messages, setMessages] = useState([{
    id: 0, from: "bot", time: chatTime(),
    text: welcomeMessage(firstName),
  }]);
  const [conversationId, setConversationId] = useState(null);
  const [pattern, setPattern] = useState("hierarchical");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);

  const call = async (payload) => {
    setBusy(true);
    setError(null);
    try {
      const data = await api.sendMessage({ conversationId, pattern, ...payload });
      setConversationId(data.conversation_id);
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", time: chatTime(), text: data.reply, quote: data.quote, ticket: data.ticket }]);
    } catch (err) {
      if (err?.code === "session_required") {
        // La sesión del servidor terminó: se cierra la local y se vuelve al chat después de ingresar.
        await authApi.logout?.();
        logout({ voluntary: false });
        navigate("/portal/acceso", { replace: true, state: { from: "/portal/asistente" } });
        return;
      }
      if (err?.code === "not_found") setConversationId(null);
      setError({ message: err?.message, payload });
    } finally {
      setBusy(false);
    }
  };

  const send = (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { id: Date.now(), from: "user", time: chatTime(), text }]);
    setDraft("");
    call({ message: text });
  };

  const startNewConversation = () => {
    if (busy) return;
    setConversationId(null);
    setMessages([{
      id: Date.now(),
      from: "bot",
      time: chatTime(),
      text: welcomeMessage(firstName),
    }]);
    setError(null);
  };

  // Solo la última tarjeta de presupuesto reacciona a los botones.
  const lastQuoteId = [...messages].reverse().find((m) => m.quote)?.id;

  return (
    <div className="container-chat">
      <ChatTitle title="Diagnóstico Asistido y Cotización Inteligente" />

      <section className="copilot" aria-label="Conversación con TechFix Copilot">
        <CopilotHeader subtitle="Agentes de atención, soporte técnico y ventas" />

        <div className="pattern-picker">
          <label htmlFor="chat-pattern">Patrón de agentes</label>
          <select
            id="chat-pattern"
            value={pattern}
            disabled={busy || Boolean(conversationId)}
            onChange={(event) => setPattern(event.target.value)}
          >
            {PATTERNS.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          {conversationId && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busy}
              onClick={startNewConversation}
            >
              <RotateCcw size={14} aria-hidden="true" /> Nueva conversación
            </button>
          )}
          <span className="mono-small" role="status">{PATTERN_DESCRIPTIONS[pattern]}</span>
        </div>

        <div className="copilot__log" aria-live="polite">
          {messages.map((m) =>
            m.from === "user" ? (
              <UserMessage key={m.id} label="Tú" time={m.time}>{m.text}</UserMessage>
            ) : (
              <div key={m.id} className="msg msg--bot">
                <span className="msg__avatar"><Brain size={16} aria-hidden="true" /></span>
                <div className="msg__content">
                  <p className="msg__meta"><strong>Agente TechFix</strong> <time>{m.time}</time></p>
                  <div className="msg__bubble"><p><RichText text={m.text} /></p></div>
                  {m.quote && (
                    <QuoteCard
                      quote={m.id === lastQuoteId ? m.quote : { ...m.quote, status: m.quote.status === "proposed" ? "superseded" : m.quote.status }}
                      busy={busy || m.id !== lastQuoteId}
                      onAction={(action) => call({ action })}
                    />
                  )}
                  {m.ticket && (
                    <div className="created">
                      <span className="icon-tile icon-tile--sm"><Ticket size={18} aria-hidden="true" /></span>
                      <div>
                        <strong>Ticket {m.ticket.code}</strong>
                        <p>Estado: {TICKET_STATUS_LABEL[m.ticket.status] || m.ticket.status}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {busy && (
            <TypingIndicator />
          )}
          <div ref={endRef} />
        </div>

        <footer className="copilot__composer">
          {error && (
            <div className="form-alert" role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              <span>{error.message}</span>
              {error.payload && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => call(error.payload)}>
                  <RotateCcw size={14} aria-hidden="true" /> Reintentar
                </button>
              )}
            </div>
          )}
          <form className="composer" onSubmit={send}>
            <textarea
              rows={1}
              className="composer__input"
              placeholder="Ej.: Mi laptop HP no detecta el disco desde ayer"
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
              aria-label="Mensaje"
            />
            <button type="submit" className="btn btn--primary" disabled={!draft.trim() || busy}>
              Enviar <SendHorizontal size={16} aria-hidden="true" />
            </button>
          </form>
          <p className="mono-small composer__hint">
            Presiona Shift + Enter para salto de línea · <Info size={12} aria-hidden="true" /> No compartas contraseñas en el chat.{" "}
            <Link to="/portal/tickets" className="link">Ver mis tickets</Link>
          </p>
        </footer>
      </section>
    </div>
  );
}
