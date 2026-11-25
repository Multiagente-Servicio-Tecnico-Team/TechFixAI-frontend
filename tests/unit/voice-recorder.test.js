import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAX_AUDIO_BYTES, useVoiceRecorder } from "../../src/features/chat/useVoiceRecorder.js";

const { getUserMedia, mediaRecorderInstances, mediaTracks } = globalThis.__voiceTestMocks;

describe("useVoiceRecorder", () => {
  it("starts on first call, stops on second, sends one blob, and releases tracks", async () => {
    const onAudio = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useVoiceRecorder({ onAudio }));

    await act(async () => { await result.current.toggle(); });
    expect(result.current.status).toBe("recording");
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mediaRecorderInstances).toHaveLength(1);

    await act(async () => { await result.current.toggle(); });
    expect(onAudio).toHaveBeenCalledTimes(1);
    expect(onAudio.mock.calls[0][0].audio).toBeInstanceOf(Blob);
    expect(onAudio.mock.calls[0][0].durationMs).toBeGreaterThan(0);
    expect(onAudio.mock.calls[0][0].requestId).toMatch(/[0-9a-f-]{36}/i);
    expect(mediaTracks[0].stop).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("idle");
  });

  it("stops automatically at 120 seconds", async () => {
    vi.useFakeTimers();
    const onAudio = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useVoiceRecorder({ onAudio }));
    await act(async () => { await result.current.toggle(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(onAudio).toHaveBeenCalledOnce();
    expect(onAudio.mock.calls[0][0].durationMs).toBeLessThanOrEqual(120_000);
    expect(mediaTracks[0].stop).toHaveBeenCalledOnce();
  });

  it("reports denied microphone permission and can start again", async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" }));
    const { result } = renderHook(() => useVoiceRecorder({ onAudio: vi.fn() }));
    await act(async () => { await result.current.toggle(); });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/permiso/i);
  });

  it("reports unsupported browser and unsupported audio type", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    const first = renderHook(() => useVoiceRecorder({ onAudio: vi.fn() }));
    await act(async () => { await first.result.current.toggle(); });
    expect(first.result.current.error).toMatch(/no admite/i);
    first.unmount();

    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    MediaRecorder.isTypeSupported.mockReturnValue(false);
    const second = renderHook(() => useVoiceRecorder({ onAudio: vi.fn() }));
    await act(async () => { await second.result.current.toggle(); });
    expect(second.result.current.error).toMatch(/formato/i);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("uses the first supported MIME candidate and rejects a recording over 25 MB", async () => {
    MediaRecorder.isTypeSupported.mockImplementation((type) => type === "audio/mp4;codecs=mp4a.40.2");
    const onAudio = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder({ onAudio }));
    await act(async () => { await result.current.toggle(); });
    expect(mediaRecorderInstances[0].mimeType).toBe("audio/mp4;codecs=mp4a.40.2");
    mediaRecorderInstances[0].stop = () => {
      const recorder = mediaRecorderInstances[0];
      recorder.state = "inactive";
      recorder.ondataavailable?.({ data: new Blob([new Uint8Array(MAX_AUDIO_BYTES + 1)], { type: recorder.mimeType }) });
      recorder.onstop?.();
    };
    await act(async () => { await result.current.toggle(); });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/25 MB/i);
    expect(onAudio).not.toHaveBeenCalled();
  });

  it("stops a recording and releases tracks when unmounted", async () => {
    const { result, unmount } = renderHook(() => useVoiceRecorder({ onAudio: vi.fn() }));
    await act(async () => { await result.current.toggle(); });
    unmount();
    expect(mediaRecorderInstances[0].state).toBe("inactive");
    expect(mediaTracks[0].stop).toHaveBeenCalledOnce();
  });
});
