import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, Info, Mic, MicOff, RotateCcw, SendHorizontal, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../auth/authApi.js";
import { useStore } from "../../state/store.jsx";
import RichText from "../../shared/ui/RichText.jsx";
import { ChatTitle, chatTime, CopilotHeader, TypingIndicator, UserMessage } from "./ChatParts.jsx";
import { ChatError } from "./chatApi.js";
import { adminChatApi as defaultApi } from "./adminChatApi.js";
import { useVoiceRecorder } from "./useVoiceRecorder.js";

const FALLBACK_PATTERNS = [
  { id: "hierarchical", name: "Jerárquico" },
  { id: "orchestrator", name: "Orquestador" },
  { id: "decentralized", name: "Descentralizado" },
];

const PATTERN_DESCRIPTIONS = {
  hierarchical: "Patrón jerárquico para comparar la ejecución administrativa.",
  orchestrator: "Patrón con supervisor para comparar la ejecución administrativa.",
  decentralized: "Patrón descentralizado para comparar la ejecución administrativa.",
};

const PROPOSAL_STATUS = {
  PENDING_CONFIRMATION: "Pendiente de confirmación",
  EXECUTED: "Ejecutada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
  CONFLICT: "No ejecutada: requiere revisión",
};

const FIELD_LABELS = {
  customer_id: "Cliente",
  ticket_id: "Ticket",
  supplier_id: "Proveedor",
  spare_part_id: "Repuesto",
  quote_id: "Cotización",
  purchase_id: "Compra",
  order_id: "Orden",
  accounting_entry_id: "Asiento contable",
  title: "Título",
  name: "Nombre",
  description: "Descripción",
  status: "Estado",
  amount: "Importe",
  total_amount: "Importe total",
  quantity: "Cantidad",
  date: "Fecha",
};

function welcomeMessage(name) {
  return `Hola${name ? `, ${name}` : ""}. Este es el asistente administrativo de TechFix.AI. Puedes consultar clientes, tickets, inventario, proveedores, compras, órdenes, ventas y contabilidad. Cada cambio se presenta primero como propuesta y requiere tu confirmación.`;
}

function proposalRows(summary) {
  try {
    const parsed = JSON.parse(summary);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [["Resumen", String(summary || "")]];
    return Object.entries(parsed).map(([key, value]) => [
      FIELD_LABELS[key] || key.replaceAll("_", " "),
      typeof value === "string" ? value : JSON.stringify(value),
    ]);
  } catch {
    return [["Resumen", String(summary || "")]];
  }
}

function ProposalCard({ proposal, actionable, busy, onAction }) {
  const rows = proposalRows(proposal.summary);
  const expiry = proposal.expires_at ? new Date(proposal.expires_at) : null;
  const expiryLabel = expiry && !Number.isNaN(expiry.valueOf())
    ? new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(expiry)
    : null;

  return (
    <section className="admin-chat-proposal" aria-label="Propuesta administrativa">
      <div className="commerce-card__head">
        <strong>Propuesta · {proposal.resource_type?.replaceAll(".", " / ") || "Cambio administrativo"}</strong>
        <span className={`stamp${actionable ? " stamp--warn" : ""}`}>
          {PROPOSAL_STATUS[proposal.status] || proposal.status}
        </span>
      </div>
      <dl className="admin-chat-proposal__values">
        {rows.map(([label, value], index) => (
          <div key={`${label}-${index}`}>
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>
      {expiryLabel && actionable && <p className="small muted">Vence: {expiryLabel}</p>}
      {actionable && (
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => onAction("confirm", proposal)}>
            <CircleCheck size={17} aria-hidden="true" /> Confirmar cambio
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => onAction("cancel", proposal)}>
            <CircleX size={17} aria-hidden="true" /> Cancelar
          </button>
        </div>
      )}
    </section>
  );
}

export default function AdminChat({ api = defaultApi }) {
  const { session, logout } = useStore();
  const navigate = useNavigate();
  const firstName = (session?.name || "").split(" ")[0];
  const [messages, setMessages] = useState(() => [{ id: 0, from: "bot", time: chatTime(), text: welcomeMessage(firstName) }]);
  const [patterns, setPatterns] = useState(FALLBACK_PATTERNS);
  const [pattern, setPattern] = useState("hierarchical");
  const [conversationId, setConversationId] = useState(null);
  const [pendingProposal, setPendingProposal] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [patternWarning, setPatternWarning] = useState("");
  const endRef = useRef(null);
  const audioRequestRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (api.mode !== "api") return () => { active = false; };
    api.listPatterns().then((available) => {
      if (active && available.length) {
        setPatterns(available);
        if (!available.some((item) => item.id === pattern)) setPattern(available[0].id);
      }
    }).catch((cause) => {
      if (active) setPatternWarning(cause?.message || "Se usarán los patrones configurados en la interfaz.");
    });
    return () => { active = false; };
  }, [api]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, busy]);

  const handleSessionError = async (cause) => {
    if (cause?.code !== "session_required") return false;
    await authApi.logout?.();
    logout({ voluntary: false });
    navigate("/taller/acceso", { replace: true, state: { from: "/taller/asistente" } });
    return true;
  };

  const appendTurn = (data, transcript = null) => {
    if (!data?.conversation_id || !data?.reply) throw new ChatError("El asistente devolvió una respuesta incompleta.", { code: "invalid_response" });
    setConversationId(data.conversation_id);
    const proposal = data.proposal || null;
    setPendingProposal(proposal?.status === "PENDING_CONFIRMATION" ? proposal : null);
    setMessages((current) => {
      const updated = pendingProposal
        ? current.map((message) => message.proposal?.proposal_id === pendingProposal.proposal_id
          ? { ...message, proposal: proposal?.proposal_id === pendingProposal.proposal_id
            ? proposal
            : { ...message.proposal, status: "CANCELLED" } }
          : message)
        : current;
      return [
        ...updated,
        ...(transcript ? [{ id: Date.now(), from: "user", time: chatTime(), text: transcript }] : []),
        {
          id: Date.now() + 1,
          from: "bot",
          time: chatTime(),
          text: data.reply,
          proposal,
        },
      ];
    });
  };

  const submitTurn = async (payload, { showError = true } = {}) => {
    setBusy(true);
    if (showError) setError("");
    try {
      const data = await api.sendMessage(payload);
      appendTurn(data);
      return data;
    } catch (cause) {
      if (await handleSessionError(cause)) throw cause;
      if (["not_found", "proposal_not_found", "proposal_expired", "proposal_mismatch"].includes(cause?.code)) {
        setConversationId(null);
        setPendingProposal(null);
      }
      if (showError) setError(cause?.message || "No se pudo procesar el mensaje.");
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const sendAudio = async ({ audio, durationMs, requestId }) => {
    if (audioRequestRef.current?.requestId !== requestId) {
      audioRequestRef.current = { audio, durationMs, requestId, conversationId, pattern };
    }
    const request = audioRequestRef.current;
    setBusy(true);
    setError("");
    try {
      const data = await api.sendAudioMessage({
        audio: request.audio,
        durationMs: request.durationMs,
        conversationId: request.conversationId,
        pattern: request.pattern,
        requestId: request.requestId,
      });
      if (!data?.transcript?.trim()) throw new ChatError("No se recibió una transcripción válida. Inténtalo de nuevo o continúa por escrito.", { code: "invalid_transcript" });
      audioRequestRef.current = null;
      appendTurn(data, data.transcript.trim());
    } catch (cause) {
      if (await handleSessionError(cause)) throw cause;
      if (["not_found", "proposal_not_found", "proposal_expired", "proposal_mismatch"].includes(cause?.code)) {
        setConversationId(null);
        setPendingProposal(null);
      }
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const voice = useVoiceRecorder({ onAudio: sendAudio });

  const send = async (event) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || busy || voice.status !== "idle" && voice.status !== "error") return;
    voice.dismissError();
    audioRequestRef.current = null;
    setMessages((current) => [...current, { id: Date.now(), from: "user", time: chatTime(), text: message }]);
    setDraft("");
    try {
      await submitTurn({ conversationId, message, pattern });
    } catch { /* El aviso de error ya aparece debajo del compositor. */ }
  };

  const actOnProposal = async (action, proposal) => {
    setMessages((current) => [...current, {
      id: Date.now(),
      from: "user",
      time: chatTime(),
      text: action === "confirm" ? "Confirmo la propuesta." : "Cancelo la propuesta.",
    }]);
    try {
      await submitTurn({
        conversationId,
        message: null,
        action,
        proposalId: proposal.proposal_id,
        pattern,
      });
    } catch { /* El aviso explica si la propuesta venció o no pudo resolverse. */ }
  };

  const startNewConversation = () => {
    if (busy || pendingProposal) return;
    setConversationId(null);
    setMessages([{ id: Date.now(), from: "bot", time: chatTime(), text: welcomeMessage(firstName) }]);
    setError("");
    audioRequestRef.current = null;
  };

  const voiceActive = ["requesting", "recording", "submitting"].includes(voice.status);
  const canUseApi = api.mode === "api";

  return (
    <div className="desk admin-chat">
      <section className="desk__chat" aria-label="Asistente administrativo de TechFix">
        <div>
          <ChatTitle title="Asistente administrativo" />
          <CopilotHeader subtitle="Consultas y operaciones del taller" />
        </div>

        <div className="log" role="log" aria-label="Conversación administrativa" aria-live="polite" tabIndex={0}>
          {messages.map((message) => message.from === "user" ? (
            <UserMessage key={message.id} label="Tú" time={message.time}>{message.text}</UserMessage>
          ) : (
            <div key={message.id} className="msg">
              <p className="msg__meta"><strong>Asistente ADMIN</strong> <time>{message.time}</time></p>
              <div className="msg__bubble"><p><RichText text={message.text} /></p></div>
              {message.proposal && (
                <ProposalCard
                  proposal={message.proposal}
                  actionable={message.proposal.status === "PENDING_CONFIRMATION"
                    && pendingProposal?.proposal_id === message.proposal.proposal_id}
                  busy={busy}
                  onAction={actOnProposal}
                />
              )}
            </div>
          ))}
          {busy && <TypingIndicator />}
          <div ref={endRef} />
        </div>

        <footer className="desk__foot">
          {!canUseApi && <div className="form-alert" role="alert">El chat ADMIN requiere configurar la URL del backend. No se ejecutan operaciones en modo demostración.</div>}
          {error && <div className="form-alert" role="alert"><TriangleAlert size={16} aria-hidden="true" /><span>{error}</span></div>}
          {voice.error && <div className="form-alert" role="alert"><TriangleAlert size={16} aria-hidden="true" /><span>{voice.error}</span>{voice.hasPending && <button type="button" className="btn btn--sm" onClick={voice.retry} disabled={busy}><RotateCcw size={14} aria-hidden="true" /> Reintentar audio</button>}</div>}
          {voice.status === "recording" && <p className="composer__voice-status" role="status">Grabando… vuelve a pulsar para enviar. Máximo 120 segundos.</p>}
          {voice.status === "requesting" && <p className="composer__voice-status" role="status">Solicitando permiso del micrófono…</p>}
          {voice.status === "submitting" && <p className="composer__voice-status" role="status">Transcribiendo y enviando tu mensaje…</p>}
          <form className="composer" onSubmit={send}>
            <textarea
              rows={1}
              className="composer__input"
              placeholder="Ej.: consulta las órdenes de compra pendientes"
              value={draft}
              maxLength={4000}
              disabled={!canUseApi || busy || voiceActive}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) send(event); }}
              aria-label="Mensaje para el asistente administrativo"
            />
            <button
              type="button"
              className={`btn btn--lg composer__mic${voice.status === "recording" ? " is-recording" : ""}`}
              onClick={() => { if (voice.status === "error") voice.dismissError(); voice.toggle(); }}
              disabled={!canUseApi || busy || voice.status === "submitting" || voice.status === "requesting"}
              aria-label={voice.status === "recording" ? "Detener grabación" : "Grabar mensaje de voz"}
              aria-pressed={voice.status === "recording"}
              title={voice.status === "recording" ? "Detener grabación" : "Grabar mensaje de voz"}
            >
              {voice.status === "recording" ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
            </button>
            <button type="submit" className="btn btn--primary btn--lg" disabled={!canUseApi || !draft.trim() || busy || voiceActive}>
              Enviar <SendHorizontal size={16} aria-hidden="true" />
            </button>
          </form>
          <p className="composer__hint"><Info size={12} aria-hidden="true" /> Las escrituras se ejecutan solo después de revisar y confirmar la propuesta.</p>
        </footer>
      </section>

      <aside className="desk__side" aria-label="Opciones del chat administrativo">
        <div className="jobtag jobtag--lg">
          <p className="kicker">Herramientas administrativas</p>
          <div className="pattern">
            <label htmlFor="admin-chat-pattern">Patrón de agentes</label>
            <select
              id="admin-chat-pattern"
              className="input"
              value={pattern}
              disabled={busy || voiceActive || Boolean(conversationId)}
              onChange={(event) => setPattern(event.target.value)}
            >
              {patterns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <span className="small muted" role="status">{PATTERN_DESCRIPTIONS[pattern] || "La identidad ADMIN y sus permisos se validan en el backend."}</span>
            {patternWarning && <span className="small muted" role="status">{patternWarning}</span>}
          </div>
          {conversationId && !pendingProposal && <button type="button" className="btn btn--sm" disabled={busy || voiceActive} onClick={startNewConversation}><RotateCcw size={14} aria-hidden="true" /> Nueva conversación</button>}
          {pendingProposal && <p className="admin-chat-notice" role="status">Confirma o cancela la propuesta para continuar con otra operación.</p>}
          <p className="small muted">Las propuestas pendientes viven en la conversación actual. Si la página se recarga o la sesión del servidor se reinicia, vuelve a formular la operación y revisa su propuesta antes de confirmarla.</p>
          <div className="admin-chat-capabilities">
            <strong>Acciones disponibles</strong>
            <p>Clientes, tickets, inventario, proveedores, compras, órdenes, ventas y contabilidad.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
