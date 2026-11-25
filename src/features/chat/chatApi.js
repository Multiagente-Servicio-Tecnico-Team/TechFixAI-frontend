/*
 * Cliente del chat del portal: POST /api/chat del patrón LangGraph.
 *
 * - Con VITE_API_URL definido llama al patrón; la identidad la da la cookie del inicio de sesión
 *   (credentials: "include"). El cuerpo nunca lleva correo ni identificador del cliente.
 * - Sin VITE_API_URL el asistente sigue en modo demostración.
 */
import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";
import { audioFilename } from "./voiceAudio.js";

export class ChatError extends Error {
  constructor(message, { status = 0, code = "error" } = {}) {
    super(message);
    this.name = "ChatError";
    this.status = status;
    this.code = code;
  }
}

export const CHAT_MESSAGES = {
  session: "Tu sesión terminó. Inicia sesión otra vez para seguir conversando.",
  customerOnly: "El chat es para clientes. Ingresa con una cuenta de cliente.",
  profileMissing: "Tu cuenta todavía no tiene un perfil comercial disponible. Contacta al taller para revisar la vinculación.",
  notFound: "Esta conversación ya no está disponible. Empieza una nueva.",
  noQuote: "Este presupuesto ya fue respondido.",
  patternLocked: "Para cambiar de patrón, inicia una conversación nueva.",
  tooMany: "Enviaste muchos mensajes seguidos. Espera un minuto y vuelve a intentar.",
  invalid: "Revisa el mensaje: no puede estar vacío ni superar 2000 caracteres.",
  unavailable: "El asistente no está disponible en este momento. Inténtalo de nuevo.",
  audioTooLarge: "La grabación supera el límite de 25 MB. Graba un mensaje más corto.",
  audioUnsupported: "Este formato de audio no es compatible. Inténtalo con otra grabación.",
  audioInvalid: "No se pudo entender la grabación. Habla con claridad o continúa por escrito.",
  audioTooMany: "Alcanzaste el límite de envíos de voz. Espera un minuto o continúa por escrito.",
  audioUnavailable: "La transcripción de voz no está disponible. Puedes continuar por escrito.",
  audioTimeout: "La grabación tardó demasiado en procesarse. Inténtalo de nuevo.",
  audioConflict: "No se pudo recuperar este envío de voz. Graba el mensaje de nuevo.",
};

function toChatError(status, data) {
  if (data?.code === "customer_profile_missing") return new ChatError(CHAT_MESSAGES.profileMissing, { status, code: "customer_profile_missing" });
  if (status === 401) return new ChatError(CHAT_MESSAGES.session, { status, code: "session_required" });
  if (status === 403) return new ChatError(CHAT_MESSAGES.customerOnly, { status, code: "customer_only" });
  if (status === 404) return new ChatError(CHAT_MESSAGES.notFound, { status, code: "not_found" });
  if (status === 409) {
    if (data?.code === "audio_request_conflict") {
      return new ChatError(CHAT_MESSAGES.audioConflict, { status, code: data.code });
    }
    const code = data?.code === "pattern_locked" ? "pattern_locked" : "no_quote";
    return new ChatError(CHAT_MESSAGES[code === "pattern_locked" ? "patternLocked" : "noQuote"], { status, code });
  }
  if (status === 413) return new ChatError(CHAT_MESSAGES.audioTooLarge, { status, code: data?.code || "audio_too_large" });
  if (status === 415) return new ChatError(CHAT_MESSAGES.audioUnsupported, { status, code: data?.code || "unsupported_audio_type" });
  if (status === 422 && String(data?.code || "").startsWith("audio_")) {
    return new ChatError(CHAT_MESSAGES.audioInvalid, { status, code: data.code });
  }
  if (status === 422) return new ChatError(CHAT_MESSAGES.invalid, { status, code: "invalid" });
  if (status === 429) {
    return new ChatError(data?.code === "audio_rate_limited" ? CHAT_MESSAGES.audioTooMany : CHAT_MESSAGES.tooMany, {
      status, code: data?.code || "rate_limited",
    });
  }
  if (status === 504) return new ChatError(CHAT_MESSAGES.audioTimeout, { status, code: data?.code || "audio_timeout" });
  if (status === 503 && String(data?.code || "").startsWith("audio_")) {
    return new ChatError(CHAT_MESSAGES.audioUnavailable, { status, code: data.code });
  }
  return new ChatError(CHAT_MESSAGES.unavailable, { status, code: data?.code || "unavailable" });
}

export function createChatApi({ baseUrl = "", fetchImpl } = {}) {
  const base = baseUrl.replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  return {
    mode: base ? "api" : "mock",
    async listMyTickets() {
      if (!base) return [];
      let res;
      try {
        res = await doFetch(`${base}/api/customer/tickets`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
      } catch {
        throw new ChatError(CHAT_MESSAGES.unavailable, { code: "network" });
      }
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) throw toChatError(res.status, data);
      return Array.isArray(data?.tickets) ? data.tickets : [];
    },
    async sendMessage({
      conversationId = null,
      message = null,
      action = null,
      pattern = "hierarchical",
    }) {
      let res;
      try {
        res = await doFetch(`${base}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({ conversation_id: conversationId, message, action, pattern }),
        });
      } catch {
        throw new ChatError(CHAT_MESSAGES.unavailable, { code: "network" });
      }
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) throw toChatError(res.status, data);
      return data;
    },
    async sendAudioMessage({
      audio,
      durationMs,
      conversationId = null,
      pattern = "hierarchical",
      requestId = globalThis.crypto?.randomUUID?.(),
    }) {
      const form = new FormData();
      form.append("audio", audio, audioFilename(audio));
      form.append("duration_ms", String(durationMs));
      form.append("pattern", pattern);
      form.append("request_id", requestId || "");
      if (conversationId) form.append("conversation_id", conversationId);

      let res;
      try {
        res = await doFetch(`${base}/api/chat/audio`, {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "include",
          body: form,
        });
      } catch {
        throw new ChatError(CHAT_MESSAGES.unavailable, { code: "network" });
      }
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) throw toChatError(res.status, data);
      return data;
    },
  };
}

export const chatApi = createChatApi({
  baseUrl: resolveApiBaseUrl(
    import.meta.env?.VITE_API_URL ?? "",
    "/backend",
    import.meta.env?.PROD === true,
  ),
});
