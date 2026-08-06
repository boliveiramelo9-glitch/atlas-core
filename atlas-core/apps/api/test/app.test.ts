import type {
  BusinessOperation,
  DashboardSummary,
  IncomingMessage,
  OperationResult,
} from "@atlas/contracts";
import { describe, expect, it, vi } from "vitest";
import { buildApp, type ApiDependencies } from "../src/app.js";

function dependencies(): ApiDependencies {
  const summary: DashboardSummary = {
    businessName: "Bruno Burger",
    period: "today",
    grossRevenue: 0,
    costOfGoods: 0,
    grossProfit: 0,
    marginPercentage: 0,
    salesCount: 0,
    cashBalance: 0,
    lowStockCount: 0,
    recentSales: [],
    lowStockItems: [],
  };
  return {
    interpreter: {
      mode: "local-fallback",
      interpret: vi.fn(async (): Promise<BusinessOperation> => ({
        type: "get_summary",
        period: "today",
      })),
    },
    database: {
      healthcheck: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
      getSummary: vi.fn(async () => summary),
      executeOperation: vi.fn(
        async (
          _message: IncomingMessage,
          operation: BusinessOperation,
        ): Promise<OperationResult> => ({
          replayed: false,
          operation,
          reply: "Tudo certo.",
        }),
      ),
    },
  };
}

describe("Atlas API", () => {
  it("informa a saúde do serviço", async () => {
    const app = buildApp(dependencies());
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "atlas-api",
    });
    await app.close();
  });

  it("rejeita mensagens sem identidade idempotente", async () => {
    const app = buildApp(dependencies());
    const response = await app.inject({
      method: "POST",
      url: "/v1/messages",
      payload: { text: "Vendi 2 Smash" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
