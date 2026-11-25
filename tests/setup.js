import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

// jsdom no implementa scrollTo / scrollIntoView.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

// Dobles reutilizables de captura de voz: las pruebas no necesitan un micrófono real.
const mediaRecorderInstances = [];
const mediaTracks = [];
const getUserMedia = vi.fn();

class MockMediaRecorder {
  static isTypeSupported = vi.fn((type) => [
    "audio/webm;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/ogg;codecs=opus",
  ].includes(type));

  constructor(stream, options = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || "audio/webm";
    this.state = "inactive";
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
    mediaRecorderInstances.push(this);
  }

  start() {
    this.state = "recording";
    this.onstart?.();
  }

  stop() {
    if (this.state === "inactive") return;
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["fake-audio"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

function mockStream() {
  const track = { stop: vi.fn(), kind: "audio" };
  mediaTracks.push(track);
  return { getTracks: () => [track] };
}

getUserMedia.mockImplementation(async () => mockStream());
Object.defineProperty(navigator, "mediaDevices", {
  configurable: true,
  value: { getUserMedia },
});
Object.defineProperty(globalThis, "MediaRecorder", {
  configurable: true,
  value: MockMediaRecorder,
});
globalThis.__voiceTestMocks = { mediaRecorderInstances, mediaTracks, getUserMedia };

afterEach(() => {
  mediaRecorderInstances.length = 0;
  mediaTracks.length = 0;
  getUserMedia.mockReset().mockImplementation(async () => mockStream());
  MockMediaRecorder.isTypeSupported.mockReset().mockImplementation((type) => [
    "audio/webm;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/ogg;codecs=opus",
  ].includes(type));
  vi.useRealTimers();
});
