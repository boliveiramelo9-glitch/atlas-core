import { z } from "zod";

export const paymentMethods = [
  "pix",
  "cash",
  "credit_card",
  "debit_card",
  "other",
] as const;

export const saleOperationSchema = z.object({
  type: z.literal("register_sale"),
  items: z
    .array(
      z.object({
        productName: z.string().min(1),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
  paymentMethod: z.enum(paymentMethods).default("other"),
});

export const purchaseOperationSchema = z.object({
  type: z.literal("register_purchase"),
  supplierName: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        ingredientName: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
        totalCost: z.number().nonnegative(),
      }),
    )
    .min(1),
  paymentMethod: z.enum(paymentMethods).default("other"),
});

export const summaryOperationSchema = z.object({
  type: z.literal("get_summary"),
  period: z.enum(["today", "week", "month"]).default("today"),
});

export const clarificationOperationSchema = z.object({
  type: z.literal("request_clarification"),
  reason: z.string().min(1),
});

export const businessOperationSchema = z.discriminatedUnion("type", [
  saleOperationSchema,
  purchaseOperationSchema,
  summaryOperationSchema,
  clarificationOperationSchema,
]);

export const incomingMessageSchema = z.object({
  businessId: z.string().uuid(),
  eventId: z.string().min(1).max(250),
  phone: z.string().min(5).max(30),
  text: z.string().min(1).max(2_000),
  provider: z.string().min(1).max(30).default("evolution"),
});

export type SaleOperation = z.infer<typeof saleOperationSchema>;
export type PurchaseOperation = z.infer<typeof purchaseOperationSchema>;
export type SummaryOperation = z.infer<typeof summaryOperationSchema>;
export type ClarificationOperation = z.infer<
  typeof clarificationOperationSchema
>;
export type BusinessOperation = z.infer<typeof businessOperationSchema>;
export type IncomingMessage = z.infer<typeof incomingMessageSchema>;

export interface OperationResult {
  replayed: boolean;
  operation: BusinessOperation;
  reply: string;
  data?: Record<string, unknown>;
}

export interface DashboardSummary {
  businessName: string;
  period: "today" | "week" | "month";
  grossRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  marginPercentage: number;
  salesCount: number;
  cashBalance: number;
  lowStockCount: number;
  recentSales: Array<{
    id: string;
    createdAt: string;
    total: number;
    source: string;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    unit: string;
  }>;
}

export const operationToolDefinitions = [
  {
    type: "function" as const,
    name: "register_sale",
    description:
      "Registra uma venda quando o usuário informa produtos e quantidades vendidos.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              productName: { type: "string" },
              quantity: { type: "number", exclusiveMinimum: 0 },
            },
            required: ["productName", "quantity"],
          },
        },
        paymentMethod: {
          type: "string",
          enum: paymentMethods,
        },
      },
      required: ["items", "paymentMethod"],
    },
  },
  {
    type: "function" as const,
    name: "register_purchase",
    description:
      "Registra uma compra de insumos, incluindo quantidade, unidade e custo total de cada item.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        supplierName: { type: ["string", "null"] },
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              ingredientName: { type: "string" },
              quantity: { type: "number", exclusiveMinimum: 0 },
              unit: { type: "string" },
              totalCost: { type: "number", minimum: 0 },
            },
            required: ["ingredientName", "quantity", "unit", "totalCost"],
          },
        },
        paymentMethod: {
          type: "string",
          enum: paymentMethods,
        },
      },
      required: ["supplierName", "items", "paymentMethod"],
    },
  },
  {
    type: "function" as const,
    name: "get_summary",
    description:
      "Consulta um resumo do negócio quando o usuário pergunta por vendas, caixa, lucro ou indicadores.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month"],
        },
      },
      required: ["period"],
    },
  },
  {
    type: "function" as const,
    name: "request_clarification",
    description:
      "Pede mais informações quando não há dados suficientes para registrar ou consultar com segurança.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        reason: { type: "string" },
      },
      required: ["reason"],
    },
  },
] as const;
