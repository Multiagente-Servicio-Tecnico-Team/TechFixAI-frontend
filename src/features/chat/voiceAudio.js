const AUDIO_EXTENSIONS = {
  "audio/flac": "flac",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/mpga": "mpga",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "video/mp4": "mp4",
};

export function audioFilename(audio) {
  const mimeType = String(audio?.type || "").split(";", 1)[0].trim().toLowerCase();
  const extension = AUDIO_EXTENSIONS[mimeType] || "webm";
  return `grabacion.${extension}`;
}
