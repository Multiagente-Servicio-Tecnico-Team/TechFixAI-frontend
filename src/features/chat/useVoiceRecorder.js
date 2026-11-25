import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_RECORDING_MS = 120_000;
export const MAX_AUDIO_BYTES = 25_000_000;
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/ogg;codecs=opus",
];

function safeError(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "No se concedió permiso para usar el micrófono. Puedes continuar por escrito.";
  }
  if (error?.name === "NotFoundError") {
    return "No encontramos un micrófono disponible. Puedes continuar por escrito.";
  }
  if (error?.name === "ChatError" && error.message) return error.message;
  return "No se pudo procesar la grabación. Inténtalo de nuevo o continúa por escrito.";
}

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (!bytes.some(Boolean)) throw new Error("Este navegador no permite generar un identificador seguro.");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function useVoiceRecorder({ onAudio, maxDurationMs = MAX_RECORDING_MS }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [hasPending, setHasPending] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const pushToTalkHeldRef = useRef(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const pendingRef = useRef(null);
  const mountedRef = useRef(true);
  const onAudioRef = useRef(onAudio);
  onAudioRef.current = onAudio;

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const submit = useCallback(async (payload) => {
    setError("");
    setStatus("submitting");
    try {
      await onAudioRef.current(payload);
      pendingRef.current = null;
      if (mountedRef.current) {
        setHasPending(false);
        setStatus("idle");
      }
    } catch (submissionError) {
      if (mountedRef.current) {
        setHasPending(true);
        setError(safeError(submissionError));
        setStatus("error");
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    pushToTalkHeldRef.current = false;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  const startRecording = useCallback(async ({ pushToTalk = false } = {}) => {
    setError("");
    const mediaDevices = navigator.mediaDevices;
    const Recorder = globalThis.MediaRecorder;
    if (!mediaDevices?.getUserMedia || !Recorder) {
      setError("Este navegador no admite grabación de voz. Puedes continuar por escrito.");
      setStatus("error");
      return;
    }
    const mimeType = MIME_CANDIDATES.find((candidate) => Recorder.isTypeSupported?.(candidate));
    if (!mimeType) {
      setError("Este navegador no ofrece un formato de audio compatible. Puedes continuar por escrito.");
      setStatus("error");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (pushToTalk && !pushToTalkHeldRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setStatus("idle");
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new Recorder(stream, { mimeType });
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearTimeout(timerRef.current);
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state === "recording") {
          try { recorder.stop(); } catch { /* Se liberan las pistas aunque el grabador haya fallado. */ }
        }
        chunksRef.current = [];
        releaseStream();
        recorderRef.current = null;
        setError("La grabación tuvo un problema. Inténtalo de nuevo o continúa por escrito.");
        setStatus("error");
      };
      recorder.onstop = () => {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        recorderRef.current = null;
        releaseStream();
        const durationMs = Math.max(1, Math.min(maxDurationMs, Date.now() - startedAtRef.current));
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType.split(";", 1)[0] });
        chunksRef.current = [];
        if (!audio.size) {
          setError("La grabación quedó vacía. Inténtalo de nuevo o continúa por escrito.");
          setStatus("error");
          return;
        }
        if (audio.size > MAX_AUDIO_BYTES) {
          setError("La grabación supera el límite de 25 MB. Graba un mensaje más corto o continúa por escrito.");
          setStatus("error");
          return;
        }
        try {
          const payload = { audio, durationMs, requestId: requestId() };
          pendingRef.current = payload;
          setHasPending(true);
          void submit(payload);
        } catch {
          setError("No se pudo preparar el envío de voz. Inténtalo de nuevo o continúa por escrito.");
          setStatus("error");
        }
      };
      recorder.start();
      setStatus("recording");
      timerRef.current = setTimeout(stopRecording, maxDurationMs);
    } catch (captureError) {
      clearTimeout(timerRef.current);
      recorderRef.current = null;
      chunksRef.current = [];
      releaseStream();
      setError(safeError(captureError));
      setStatus("error");
    }
  }, [maxDurationMs, releaseStream, stopRecording, submit]);

  const startPushToTalk = useCallback(() => {
    if (["requesting", "recording", "submitting"].includes(status)) return;
    pushToTalkHeldRef.current = true;
    pendingRef.current = null;
    setHasPending(false);
    void startRecording({ pushToTalk: true });
  }, [status, startRecording]);

  const stopPushToTalk = useCallback(() => {
    if (!pushToTalkHeldRef.current) return;
    pushToTalkHeldRef.current = false;
    stopRecording();
  }, [stopRecording]);

  const toggle = useCallback(async () => {
    if (status === "requesting") return;
    if (status === "submitting") return;
    if (status === "recording") {
      stopRecording();
      return;
    }
    pendingRef.current = null;
    setHasPending(false);
    await startRecording();
  }, [status, startRecording, stopRecording]);

  const retry = useCallback(async () => {
    if (!pendingRef.current || status === "submitting") return;
    await submit(pendingRef.current);
  }, [status, submit]);

  const dismissError = useCallback(() => {
    pendingRef.current = null;
    setHasPending(false);
    setError("");
    setStatus("idle");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try { recorder.stop(); } catch { /* La limpieza continúa aunque el grabador ya haya terminado. */ }
      }
      recorderRef.current = null;
      releaseStream();
      chunksRef.current = [];
      pendingRef.current = null;
    };
  }, [releaseStream]);

  return { status, error, hasPending, toggle, startPushToTalk, stopPushToTalk, retry, dismissError };
}
