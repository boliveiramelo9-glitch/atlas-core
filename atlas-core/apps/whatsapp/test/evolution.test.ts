import { describe, expect, it } from "vitest";
import { extractEvolutionMessage } from "../src/evolution.js";

describe("extractEvolutionMessage", () => {
  it("extrai mensagem recebida", () => {
    expect(
      extractEvolutionMessage({
        event: "messages.upsert",
        instance: "bruno-burger",
        data: {
          key: {
            id: "MSG-123",
            fromMe: false,
            remoteJid: "558899999999@s.whatsapp.net",
          },
          message: { conversation: "Vendi 2 Smash" },
        },
      }),
    ).toEqual({
      instance: "bruno-burger",
      eventId: "MSG-123",
      phone: "558899999999",
      text: "Vendi 2 Smash",
    });
  });

  it("ignora mensagens enviadas pelo próprio número", () => {
    expect(
      extractEvolutionMessage({
        event: "MESSAGES_UPSERT",
        instance: "bruno-burger",
        data: {
          key: {
            id: "MSG-124",
            fromMe: true,
            remoteJid: "558899999999@s.whatsapp.net",
          },
          message: { conversation: "Teste" },
        },
      }),
    ).toBeNull();
  });
});
