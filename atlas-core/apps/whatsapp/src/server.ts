import "dotenv/config";
import { extractEvolutionMessage } from "./evolution.js";
import Fastify from "fastify";
import { z } from "zod";

const envSchema = z.object({
  WHATSAPP_HOST: z.string().default("0.0.0.0"),
  WHATSAPP_PORT: z.coerce.number().int().positive().default(3334),
  PORT: z.coerce.number().int().positive().optional(),
  ATLAS_API_URL: z.string().url().default("http://localhost:3333"),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1).optional(),
  EVOLUTION_INSTANCE_BUSINESS_MAP: z.string().default("{}"),
});

const env = envSchema.parse(process.env);
const instanceBusinessMap = z
  .record(z.string(), z.string().uuid())
  .parse(JSON.parse(env.EVOLUTION_INSTANCE_BUSINESS_MAP));

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    redact: ["req.headers.authorization", "req.headers.apikey"],
  },
});

app.get("/health", async () => ({
  status: "ok",
  service: "atlas-whatsapp",
}));

app.post("/webhooks/evolution", async (request, reply) => {
  if (env.EVOLUTION_WEBHOOK_SECRET) {
    const received =
      request.headers["x-atlas-secret"] ??
      request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (received !== env.EVOLUTION_WEBHOOK_SECRET) {
      return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
  }

  const inbound = extractEvolutionMessage(request.body);
  if (!inbound) return reply.code(200).send({ ignored: true });

  const businessId = instanceBusinessMap[inbound.instance];
  if (!businessId) {
    request.log.error(
      { instance: inbound.instance },
      "Instância sem empresa associada",
    );
    return reply.code(422).send({
      error: "INSTANCE_NOT_MAPPED",
      message:
        "Esta instância do WhatsApp ainda não está associada a uma empresa.",
    });
  }

  const atlasResponse = await fetch(`${env.ATLAS_API_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      businessId,
      eventId: inbound.eventId,
      phone: inbound.phone,
      text: inbound.text,
      provider: "evolution",
    }),
  });
  const atlasPayload = (await atlasResponse.json()) as {
    reply?: string;
    message?: string;
  };
  const text = atlasResponse.ok
    ? atlasPayload.reply
    : `Não registrei essa operação: ${atlasPayload.message ?? "ocorreu um erro inesperado"}`;

  if (text) {
    await sendEvolutionText(inbound.instance, inbound.phone, text);
  }

  return reply.code(200).send({
    processed: atlasResponse.ok,
    replied: Boolean(text),
  });
});

async function sendEvolutionText(
  instance: string,
  phone: string,
  text: string,
): Promise<void> {
  const response = await fetch(
    `${env.EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instance)}`,
    {
      method: "POST",
      headers: {
        apikey: env.EVOLUTION_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        number: phone,
        text,
        linkPreview: false,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Evolution API respondeu com status ${response.status}.`);
  }
}

const stop = async () => {
  await app.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await app.listen({
  host: env.WHATSAPP_HOST,
  port: env.PORT ?? env.WHATSAPP_PORT,
});
