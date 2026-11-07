import { describe, expect, it, vi } from "vitest";
import { CHAT_MESSAGES, ChatError, createChatApi } from "../../src/features/chat/chatApi.js";

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("audio chat API", () => {
  it("maps an unresolved commercial customer profile to a safe recoverable message", async () => {
    const api = createChatApi({ baseUrl: "https://api.test", fetchImpl: vi.fn().mockResolvedValue(response(403, { code: "customer_profile_missing" })) });
    await expect(api.listMyTickets()).rejects.toMatchObject({ code: "customer_profile_missing", message: CHAT_MESSAGES.profileMissing });
  });

  it("sends multipart with cookie and never sets Content-Type manually", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, {
      transcript: "No enciende", conversation_id: "c1", reply: "Revisemos", pattern: "orchestrator",
    }));
    const api = createChatApi({ baseUrl: "https://api.test", fetchImpl });
    const audio = new Blob(["audio bytes"], { type: "audio/webm" });

    const result = await api.sendAudioMessage({
      audio, durationMs: 4200, pattern: "orchestrator", conversationId: "c1",
      requestId: "00000000-0000-0000-0000-000000000001",
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.test/api/chat/audio");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.headers).not.toHaveProperty("Content-Type");
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get("audio")).toBeInstanceOf(File);
    expect(init.body.get("duration_ms")).toBe("4200");
    expect(init.body.get("pattern")).toBe("orchestrator");
    expect(init.body.get("conversation_id")).toBe("c1");
    expect(init.body.get("request_id")).toBe("00000000-0000-0000-0000-000000000001");
    expect(result.transcript).toBe("No enciende");
  });

  it("omits conversation_id for the first audio turn", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { transcript: "Hola" }));
    const api = createChatApi({ baseUrl: "https://api.test", fetchImpl });
    await api.sendAudioMessage({ audio: new Blob(["a"], { type: "audio/webm" }), durationMs: 10, requestId: "id" });
    expect(fetchImpl.mock.calls[0][1].body.get("conversation_id")).toBeNull();
  });

  it.each([
    [413, "audio_too_large", "audioTooLarge"],
    [415, "unsupported_audio_type", "audioUnsupported"],
    [422, "audio_invalid", "audioInvalid"],
    [429, "audio_rate_limited", "audioTooMany"],
    [503, "audio_unavailable", "audioUnavailable"],
    [504, "audio_timeout", "audioTimeout"],
  ])("maps audio HTTP %i to a safe Spanish message", async (status, code, messageKey) => {
    const api = createChatApi({
      baseUrl: "https://api.test",
      fetchImpl: vi.fn().mockResolvedValue(response(status, { detail: "private provider details", code })),
    });
    await expect(api.sendAudioMessage({ audio: new Blob(["a"]), durationMs: 5, requestId: "id" }))
      .rejects.toMatchObject({ status, code, message: CHAT_MESSAGES[messageKey] });
    await expect(api.sendAudioMessage({ audio: new Blob(["a"]), durationMs: 5, requestId: "id" }))
      .rejects.not.toMatchObject({ message: "private provider details" });
  });

  it("maps a network failure without exposing the browser exception", async () => {
    const api = createChatApi({ baseUrl: "https://api.test", fetchImpl: vi.fn().mockRejectedValue(new Error("token=secret")) });
    await expect(api.sendAudioMessage({ audio: new Blob(["a"]), durationMs: 5, requestId: "id" }))
      .rejects.toBeInstanceOf(ChatError);
    await expect(api.sendAudioMessage({ audio: new Blob(["a"]), durationMs: 5, requestId: "id" }))
      .rejects.toMatchObject({ code: "network", message: CHAT_MESSAGES.unavailable });
  });

  it("maps a reused idempotency key to a recoverable audio error", async () => {
    const api = createChatApi({
      baseUrl: "https://api.test",
      fetchImpl: vi.fn().mockResolvedValue(response(409, { detail: "private", code: "audio_request_conflict" })),
    });
    await expect(api.sendAudioMessage({ audio: new Blob(["a"]), durationMs: 5, requestId: "id" }))
      .rejects.toMatchObject({ code: "audio_request_conflict", message: CHAT_MESSAGES.audioConflict });
  });
});
