import "dotenv/config";
import { OperationInterpreter } from "@atlas/ai";
import { AtlasDatabase } from "@atlas/database";
import { z } from "zod";
import { buildApp } from "./app.js";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  PORT: z.coerce.number().int().positive().optional(),
  BUSINESS_TIMEZONE: z.string().default("America/Fortaleza"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.6-terra"),
});

const env = envSchema.parse(process.env);
const database = new AtlasDatabase({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL === "true",
  timezone: env.BUSINESS_TIMEZONE,
});
const interpreter = new OperationInterpreter({
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_MODEL,
});
const app = buildApp({ database, interpreter });

const stop = async () => {
  await app.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await app.listen({ host: env.API_HOST, port: env.PORT ?? env.API_PORT });
