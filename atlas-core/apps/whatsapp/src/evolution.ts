export interface EvolutionInboundMessage {
  instance: string;
  eventId: string;
  phone: string;
  text: string;
}

type UnknownRecord = Record<string, unknown>;

export function extractEvolutionMessage(
  payload: unknown,
): EvolutionInboundMessage | null {
  if (!isRecord(payload)) return null;
  const event = String(payload.event ?? "")
    .toLowerCase()
    .replaceAll("_", ".");
  if (event !== "messages.upsert") return null;

  const instance = String(
    payload.instance ??
      (isRecord(payload.instanceData) ? payload.instanceData.instanceName : ""),
  );
  if (!instance) return null;

  const rawData = payload.data;
  if (!isRecord(rawData)) return null;
  const candidate = Array.isArray(rawData.messages)
    ? rawData.messages[0]
    : rawData;
  if (!isRecord(candidate)) return null;

  const key = isRecord(candidate.key) ? candidate.key : {};
  if (key.fromMe === true) return null;

  const remoteJid = String(
    key.remoteJid ?? key.senderPn ?? candidate.sender ?? "",
  );
  if (
    !remoteJid ||
    remoteJid.endsWith("@g.us") ||
    remoteJid === "status@broadcast"
  ) {
    return null;
  }

  const message = isRecord(candidate.message) ? candidate.message : {};
  const extended = isRecord(message.extendedTextMessage)
    ? message.extendedTextMessage
    : {};
  const image = isRecord(message.imageMessage) ? message.imageMessage : {};
  const text = String(
    message.conversation ??
      extended.text ??
      image.caption ??
      candidate.messageBody ??
      "",
  ).trim();
  const eventId = String(key.id ?? candidate.id ?? "");
  const phone = remoteJid.replace(/\D/g, "");

  if (!text || !eventId || phone.length < 8) return null;
  return { instance, eventId, phone, text };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
