import type { OperationInterpreter } from "@atlas/ai";
import {
  incomingMessageSchema,
  type DashboardSummary,
  type IncomingMessage,
  type OperationResult,
} from "@atlas/contracts";
import { DomainError } from "@atlas/core";
import type { AtlasDatabase } from "@atlas/database";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";

export interface ApiDependencies {
  database: Pick<
    AtlasDatabase,
    "executeOperation" | "getSummary" | "healthcheck" | "close"
  >;
  interpreter: Pick<OperationInterpreter, "interpret" | "mode">;
}

const dashboardQuerySchema = z.object({
  businessId: z.string().uuid(),
  period: z.enum(["today", "week", "month"]).default("today"),
});

export function buildApp(dependencies: ApiDependencies) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: ["req.headers.authorization", "req.headers.apikey"],
    },
  });

  void app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
  });

  app.get("/health", async (_request, reply) => {
    try {
      await dependencies.database.healthcheck();
      return {
        status: "ok",
        service: "atlas-api",
        interpreter: dependencies.interpreter.mode,
      };
    } catch {
      return reply.code(503).send({
        status: "degraded",
        service: "atlas-api",
        database: "unavailable",
      });
    }
  });

  app.post("/v1/messages", async (request, reply) => {
    const parsed = incomingMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "INVALID_MESSAGE",
        message: "A mensagem recebida não possui o formato esperado.",
        details: z.treeifyError(parsed.error),
      });
    }

    try {
      const operation = await dependencies.interpreter.interpret(
        parsed.data.text,
      );
      const result = await dependencies.database.executeOperation(
        parsed.data,
        operation,
      );
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  });

  app.get("/v1/dashboard", async (request, reply) => {
    const parsed = dashboardQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "INVALID_QUERY",
        message: "Informe uma empresa e um período válidos.",
      });
    }
    try {
      const summary = await dependencies.database.getSummary(
        parsed.data.businessId,
        parsed.data.period,
      );
      return reply.code(200).send(summary);
    } catch (error) {
      return handleError(reply, error);
    }
  });

  app.addHook("onClose", async () => {
    await dependencies.database.close();
  });

  return app;
}

function handleError(
  reply: {
    code(statusCode: number): {
      send(payload: Record<string, unknown>): unknown;
    };
  },
  error: unknown,
) {
  if (error instanceof DomainError) {
    return reply.code(422).send({
      error: error.code,
      message: error.message,
    });
  }
  if (error instanceof z.ZodError) {
    return reply.code(422).send({
      error: "INVALID_OPERATION",
      message: "A interpretação da mensagem não passou pela validação.",
      details: z.treeifyError(error),
    });
  }
  throw error;
}

export type DatabasePort = {
  executeOperation(
    message: IncomingMessage,
    operation: Parameters<AtlasDatabase["executeOperation"]>[1],
  ): Promise<OperationResult>;
  getSummary(
    businessId: string,
    period: "today" | "week" | "month",
  ): Promise<DashboardSummary>;
  healthcheck(): Promise<void>;
  close(): Promise<void>;
};
