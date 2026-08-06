import {
  businessOperationSchema,
  operationToolDefinitions,
  type BusinessOperation,
} from "@atlas/contracts";
import { normalizeTerm } from "@atlas/core";
import OpenAI from "openai";

export interface OperationInterpreterOptions {
  apiKey?: string | undefined;
  model?: string | undefined;
}

export class OperationInterpreter {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(options: OperationInterpreterOptions = {}) {
    this.client = options.apiKey
      ? new OpenAI({ apiKey: options.apiKey })
      : null;
    this.model = options.model ?? "gpt-5.6-terra";
  }

  get mode(): "openai" | "local-fallback" {
    return this.client ? "openai" : "local-fallback";
  }

  async interpret(message: string): Promise<BusinessOperation> {
    if (!this.client) return fallbackInterpret(message);

    const response = await this.client.responses.create({
      model: this.model,
      instructions: [
        "Você é a camada de interpretação operacional da Atlas Core.",
        "Converta mensagens em português do Brasil em exatamente uma ferramenta.",
        "Nunca invente produto, quantidade, preço, custo, unidade ou forma de pagamento.",
        "Use request_clarification quando faltar um dado obrigatório.",
        "Valores monetários são números em reais, sem símbolo.",
        "Para vendas, se a forma de pagamento não aparecer, use other.",
        "Para compras, totalCost é o custo total do item, não o custo unitário.",
        "Pedidos de números do negócio devem usar get_summary.",
      ].join("\n"),
      input: message,
      tools: operationToolDefinitions as never,
      tool_choice: "required",
      parallel_tool_calls: false,
      store: false,
    });

    const call = response.output.find(
      (item: { type: string }) => item.type === "function_call",
    );
    if (!call || call.type !== "function_call") {
      return {
        type: "request_clarification",
        reason: "não consegui identificar a operação desejada",
      };
    }

    const argumentsValue = JSON.parse(call.arguments) as Record<
      string,
      unknown
    >;
    if (
      call.name === "register_purchase" &&
      argumentsValue.supplierName === null
    ) {
      delete argumentsValue.supplierName;
    }
    return businessOperationSchema.parse({
      type: call.name,
      ...argumentsValue,
    });
  }
}

export function fallbackInterpret(message: string): BusinessOperation {
  const normalized = normalizeTerm(message);

  if (/\b(vendi|venda|foram vendidos)\b/.test(normalized)) {
    const content = message
      .replace(/^.*?\b(vendi|venda|foram vendidos)\b/i, "")
      .trim();
    const paymentMethod = detectPaymentMethod(normalized);
    const itemParts = content
      .split(/\s*(?:,|;|\be\b)\s*/i)
      .map((part) =>
        part.replace(/\b(no|na|por)\s+(pix|dinheiro|cart[aã]o).*$/i, "").trim(),
      )
      .filter(Boolean);
    const items = itemParts
      .map((part) => {
        const match = part.match(
          /^(\d+(?:[.,]\d+)?)\s*(?:x\s*)?(.+?)(?:\s+(?:no|na|por)\s+.+)?$/i,
        );
        if (!match?.[1] || !match[2]) return null;
        return {
          productName: match[2].replace(/[.!]$/, "").trim(),
          quantity: parseBrazilianNumber(match[1]),
        };
      })
      .filter(
        (item): item is { productName: string; quantity: number } =>
          item !== null && item.quantity > 0,
      );
    if (items.length > 0) {
      return { type: "register_sale", items, paymentMethod };
    }
  }

  if (/\b(comprei|compra)\b/.test(normalized)) {
    const match = message.match(
      /\b(?:comprei|compra(?:mos)?)\s+(\d+(?:[.,]\d+)?)\s*(kg|quilos?|quilogramas?|un(?:idades?)?|pacotes?|pct)?\s*(?:de\s+)?(.+?)\s+por\s+(?:r\$\s*)?([\d.]+(?:,\d{1,2})?)/i,
    );
    if (match?.[1] && match[3] && match[4]) {
      return {
        type: "register_purchase",
        items: [
          {
            ingredientName: match[3].trim(),
            quantity: parseBrazilianNumber(match[1]),
            unit: normalizeSpokenUnit(match[2] ?? "un"),
            totalCost: parseBrazilianNumber(match[4]),
          },
        ],
        paymentMethod: detectPaymentMethod(normalized),
      };
    }
  }

  if (
    /\b(resumo|faturamento|faturei|vendas|caixa|lucro|margem|indicadores)\b/.test(
      normalized,
    )
  ) {
    const period = /\b(mes|mensal)\b/.test(normalized)
      ? "month"
      : /\b(semana|semanal)\b/.test(normalized)
        ? "week"
        : "today";
    return { type: "get_summary", period };
  }

  return {
    type: "request_clarification",
    reason:
      'diga, por exemplo, "Vendi 2 Smash e 1 Combo" ou "Comprei 20kg de carne por R$600"',
  };
}

function detectPaymentMethod(
  normalizedMessage: string,
): "pix" | "cash" | "credit_card" | "debit_card" | "other" {
  if (/\bpix\b/.test(normalizedMessage)) return "pix";
  if (/\b(dinheiro|especie)\b/.test(normalizedMessage)) return "cash";
  if (/\b(debito)\b/.test(normalizedMessage)) return "debit_card";
  if (/\b(credito|cartao)\b/.test(normalizedMessage)) return "credit_card";
  return "other";
}

function normalizeSpokenUnit(unit: string): string {
  const normalized = normalizeTerm(unit);
  if (
    ["kg", "quilo", "quilos", "quilograma", "quilogramas"].includes(normalized)
  ) {
    return "kg";
  }
  if (["pacote", "pacotes", "pct"].includes(normalized)) return "pct";
  return "un";
}

function parseBrazilianNumber(value: string): number {
  const withoutThousands =
    value.includes(",") && value.includes(".")
      ? value.replace(/\./g, "")
      : value;
  return Number(withoutThousands.replace(",", "."));
}
