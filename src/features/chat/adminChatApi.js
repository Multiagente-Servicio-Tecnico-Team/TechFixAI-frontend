import { resolveApiBaseUrl } from "../../shared/api/baseUrl.js";
import { ChatError } from "./chatApi.js";
import { audioFilename } from "./voiceAudio.js";

const MESSAGES = {
  unconfigured: "El servicio del chat ADMIN no está configurado en este entorno.",
  unavailable: "El asistente administrativo no está disponible en este momento. Inténtalo de nuevo.",
  session: "Tu sesión terminó. Inicia sesión otra vez para continuar.",
  forbidden: "Solo una cuenta ADMIN puede usar el asistente administrativo.",
  notFound: "La conversación o propuesta ya no está disponible. Formula de nuevo la operación.",
  conflict: "La propuesta venció o cambió. Revisa el estado y formula de nuevo la operación.",
  invalid: "Revisa el mensaje o la confirmación e inténtalo de nuevo.",
  rateLimited: "Enviaste muchas solicitudes seguidas. Espera un minuto y vuelve a intentar.",
  audioTooLarge: "La grabación supera el límite permitido. Graba un mensaje más corto.",
  audioUnsupported: "Este formato de audio no es compatible. Inténtalo con otra grabación.",
  audioUnavailable: "La transcripción de voz no está disponible. Puedes continuar por escrito.",
  audioTimeout: "La grabación tardó demasiado en procesarse. Inténtalo de nuevo.",
};

function errorFor(status, data) {
  const detail = typeof data?.detail === "string" ? data.detail : null;
  if (status === 401) return new ChatError(MESSAGES.session, { status, code: "session_required" });
  if (status === 403) return new ChatError(MESSAGES.forbidden, { status, code: "forbidden" });
  if (status === 404) return new ChatError(detail || MESSAGES.notFound, { status, code: data?.code || "not_found" });
  if (status === 409) return new ChatError(detail || MESSAGES.conflict, { status, code: data?.code || "conflict" });
  if (status === 413) return new ChatError(MESSAGES.audioTooLarge, { status, code: data?.code || "audio_too_large" });
  if (status === 415) return new ChatError(MESSAGES.audioUnsupported, { status, code: data?.code || "unsupported_audio_type" });
  if (status === 422) return new ChatError(detail || MESSAGES.invalid, { status, code: data?.code || "invalid" });
  if (status === 429) return new ChatError(MESSAGES.rateLimited, { status, code: data?.code || "rate_limited" });
  if (status === 503 && String(data?.code || "").startsWith("audio_")) {
    return new ChatError(MESSAGES.audioUnavailable, { status, code: data.code });
  }
  if (status === 504) return new ChatError(MESSAGES.audioTimeout, { status, code: data?.code || "audio_timeout" });
  return new ChatError(MESSAGES.unavailable, { status, code: data?.code || "unavailable" });
}

export function createAdminChatApi({ baseUrl = "", fetchImpl } = {}) {
  const base = String(baseUrl).trim().replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function request(path, options = {}) {
    if (!base) throw new ChatError(MESSAGES.unconfigured, { code: "unconfigured" });
    let response;
    try {
      response = await doFetch(`${base}${path}`, {
        ...options,
        headers: { Accept: "application/json", ...options.headers },
        credentials: "include",
      });
    } catch {
      throw new ChatError(MESSAGES.unavailable, { code: "network" });
    }
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) throw errorFor(response.status, data);
    return data;
  }

  return {
    mode: base ? "api" : "unconfigured",
    async listPatterns() {
      const data = await request("/api/admin/chat/patterns");
      return Array.isArray(data?.patterns) ? data.patterns : [];
    },
    async sendMessage({ conversationId = null, message = null, action = null, proposalId = null, pattern = "hierarchical" }) {
      return request("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message,
          action,
          proposal_id: proposalId,
          pattern,
        }),
      });
    },
    async sendAudioMessage({ audio, durationMs, conversationId = null, pattern = "hierarchical", requestId = globalThis.crypto?.randomUUID?.() }) {
      const form = new FormData();
      form.append("audio", audio, audioFilename(audio));
      form.append("duration_ms", String(durationMs));
      form.append("pattern", pattern);
      form.append("request_id", requestId || "");
      if (conversationId) form.append("conversation_id", conversationId);
      return request("/api/admin/chat/audio", { method: "POST", body: form });
    },
  };
}

export const adminChatApi = createAdminChatApi({
  baseUrl: resolveApiBaseUrl(
    import.meta.env?.VITE_API_URL ?? "",
    "/backend",
    import.meta.env?.PROD === true,
  ),
});
