import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "../../src/state/store.jsx";
import LiveChat from "../../src/features/chat/LiveChat.jsx";

const { mediaRecorderInstances, mediaTracks } = globalThis.__voiceTestMocks;

function renderChat(api) {
  sessionStorage.setItem("techfix.session", JSON.stringify({ role: "client", name: "Ana Torres", email: "ana@demo.pe" }));
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StoreProvider><LiveChat api={api} /></StoreProvider>
    </MemoryRouter>,
  );
}

async function recordVoice(user) {
  await user.click(screen.getByRole("button", { name: "Grabar mensaje de voz" }));
  expect(await screen.findByText(/grabando/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Detener grabación" }));
}

describe("live chat voice flow", () => {
  it("sends one audio turn using the selected pattern and renders transcript with reply", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api",
      sendMessage: vi.fn().mockResolvedValue({ conversation_id: "c1", reply: "Seguimos por texto." }),
      sendAudioMessage: vi.fn().mockResolvedValue({
        transcript: "Mi laptop no enciende", conversation_id: "c1", reply: "Revisemos la fuente.", pattern: "decentralized",
      }),
    };
    renderChat(api);
    await user.selectOptions(screen.getByLabelText("Patrón de agentes"), "decentralized");
    await recordVoice(user);

    expect(await screen.findByText("Mi laptop no enciende")).toBeInTheDocument();
    expect(screen.getByText("Revisemos la fuente.")).toBeInTheDocument();
    expect(api.sendAudioMessage).toHaveBeenCalledTimes(1);
    expect(api.sendAudioMessage).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: null, pattern: "decentralized", durationMs: expect.any(Number), requestId: expect.any(String),
    }));
    expect(mediaTracks[0].stop).toHaveBeenCalledOnce();

    await user.type(screen.getByLabelText("Mensaje"), "sigo por escrito");
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await screen.findByText("Seguimos por texto.");
    expect(api.sendMessage).toHaveBeenCalledWith({ conversationId: "c1", pattern: "decentralized", message: "sigo por escrito" });
    const log = screen.getByRole("log", { name: "Conversación" });
    expect(within(log).getAllByText("Mi laptop no enciende")).toHaveLength(1);
  });

  it("retries the same audio with the same idempotency key and renders one transcript", async () => {
    const user = userEvent.setup();
    const api = {
      mode: "api", sendMessage: vi.fn(),
      sendAudioMessage: vi.fn()
        .mockRejectedValueOnce(new Error("red caída"))
        .mockResolvedValueOnce({ transcript: "Consulta repetida", conversation_id: "c2", reply: "Respuesta única." }),
    };
    renderChat(api);
    await recordVoice(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo procesar/i);
    const firstRequest = api.sendAudioMessage.mock.calls[0][0];
    await user.click(screen.getByRole("button", { name: /reintentar envío de voz/i }));
    expect(await screen.findByText("Respuesta única.")).toBeInTheDocument();
    const secondRequest = api.sendAudioMessage.mock.calls[1][0];
    expect(secondRequest.audio).toBe(firstRequest.audio);
    expect(secondRequest.requestId).toBe(firstRequest.requestId);
    expect(within(screen.getByRole("log", { name: "Conversación" })).getAllByText("Consulta repetida")).toHaveLength(1);
  });

  it("blocks another audio or text submission while the request is pending", async () => {
    const user = userEvent.setup();
    let completeRequest;
    const api = {
      mode: "api", sendMessage: vi.fn(),
      sendAudioMessage: vi.fn(() => new Promise((resolve) => { completeRequest = resolve; })),
    };
    renderChat(api);
    await recordVoice(user);
    await waitFor(() => expect(api.sendAudioMessage).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Grabar mensaje de voz" })).toBeDisabled();
    await user.type(screen.getByLabelText("Mensaje"), "otro envío");
    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
    await act(async () => completeRequest({ transcript: "Una consulta", conversation_id: "c3", reply: "Listo" }));
    expect(await screen.findByText("Listo")).toBeInTheDocument();
    expect(api.sendAudioMessage).toHaveBeenCalledOnce();
    expect(api.sendMessage).not.toHaveBeenCalled();
  });
});
