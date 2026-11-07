import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "../../src/state/store.jsx";
import LiveChat from "../../src/features/chat/LiveChat.jsx";
import { CHAT_MESSAGES, ChatError } from "../../src/features/chat/chatApi.js";

const { mediaTracks } = globalThis.__voiceTestMocks;

function renderChat(api) {
  sessionStorage.setItem("techfix.session", JSON.stringify({ role: "client", name: "Ana Torres", email: "ana@demo.pe" }));
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><StoreProvider><LiveChat api={api} /></StoreProvider></MemoryRouter>);
}

async function sendVoice(user) {
  await user.click(screen.getByRole("button", { name: "Grabar mensaje de voz" }));
  await screen.findByText(/Grabando/i);
  await user.click(screen.getByRole("button", { name: "Detener grabación" }));
}

describe("recoverable voice failures", () => {
  it.each([
    [413, "audio_too_large", CHAT_MESSAGES.audioTooLarge],
    [415, "unsupported_audio_type", CHAT_MESSAGES.audioUnsupported],
    [422, "audio_invalid", CHAT_MESSAGES.audioInvalid],
    [429, "audio_rate_limited", CHAT_MESSAGES.audioTooMany],
    [503, "audio_unavailable", CHAT_MESSAGES.audioUnavailable],
    [504, "audio_timeout", CHAT_MESSAGES.audioTimeout],
  ])("keeps text chat usable after HTTP %i", async (status, code, message) => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      sendAudioMessage: vi.fn().mockRejectedValue(new ChatError(message, { status, code })),
      sendMessage: vi.fn().mockResolvedValue({ conversation_id: "c1", reply: "Consulta escrita recibida." }),
    };
    renderChat(api);
    await sendVoice(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(mediaTracks[0].stop).toHaveBeenCalledOnce();
    await user.type(screen.getByLabelText("Mensaje"), "continuo escribiendo");
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    expect(await screen.findByText("Consulta escrita recibida.")).toBeInTheDocument();
    expect(api.sendMessage).toHaveBeenCalledWith({ conversationId: null, pattern: "hierarchical", message: "continuo escribiendo" });
  });

  it("explains denied microphone permission and still accepts a written message", async () => {
    const user = userEvent.setup();
    globalThis.__voiceTestMocks.getUserMedia.mockRejectedValueOnce(Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" }));
    const api = {
      mode: "api", sendAudioMessage: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({ conversation_id: "c1", reply: "Texto recibido." }),
    };
    renderChat(api);
    await user.click(screen.getByRole("button", { name: "Grabar mensaje de voz" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se concedió permiso/i);
    await user.type(screen.getByLabelText("Mensaje"), "uso el teclado");
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    expect(await screen.findByText("Texto recibido.")).toBeInTheDocument();
    expect(api.sendAudioMessage).not.toHaveBeenCalled();
  });
});
