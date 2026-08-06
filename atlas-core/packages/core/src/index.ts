import type {
  BusinessOperation,
  DashboardSummary,
  OperationResult,
} from "@atlas/contracts";

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "AMBIGUOUS"
      | "INSUFFICIENT_STOCK"
      | "UNIT_MISMATCH"
      | "INVALID_OPERATION",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function weightedAverageCost(
  currentQuantity: number,
  currentAverageCost: number,
  incomingQuantity: number,
  incomingTotalCost: number,
): number {
  const nextQuantity = currentQuantity + incomingQuantity;
  if (nextQuantity <= 0) return 0;
  return (
    (currentQuantity * currentAverageCost + incomingTotalCost) / nextQuantity
  );
}

export function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function replyForResult(
  operation: BusinessOperation,
  data: Record<string, unknown> = {},
): string {
  switch (operation.type) {
    case "register_sale":
      return `✅ Venda registrada: ${operation.items
        .map((item) => `${item.quantity}x ${item.productName}`)
        .join(
          ", ",
        )}. Total ${money(Number(data.total ?? 0))}; CMV ${money(Number(data.costOfGoods ?? 0))}.`;
    case "register_purchase":
      return `✅ Compra registrada: ${operation.items
        .map((item) => `${item.quantity}${item.unit} de ${item.ingredientName}`)
        .join(", ")}. Total ${money(Number(data.total ?? 0))}.`;
    case "get_summary": {
      const summary = data.summary as DashboardSummary | undefined;
      if (!summary) return "Não consegui montar o resumo agora.";
      return [
        `📊 Resumo ${periodLabel(operation.period)}`,
        `Vendas: ${summary.salesCount}`,
        `Faturamento: ${money(summary.grossRevenue)}`,
        `Lucro bruto: ${money(summary.grossProfit)}`,
        `Margem: ${summary.marginPercentage.toFixed(1)}%`,
        `Caixa: ${money(summary.cashBalance)}`,
        `Estoque baixo: ${summary.lowStockCount} item(ns)`,
      ].join("\n");
    }
    case "request_clarification":
      return `Preciso de mais um detalhe para fazer isso com segurança: ${operation.reason}`;
  }
}

export function periodLabel(period: "today" | "week" | "month"): string {
  if (period === "today") return "de hoje";
  if (period === "week") return "da semana";
  return "do mês";
}

export function asOperationResult(
  operation: BusinessOperation,
  data: Record<string, unknown> = {},
  replayed = false,
): OperationResult {
  return {
    replayed,
    operation,
    reply: replyForResult(operation, data),
    ...(Object.keys(data).length > 0 ? { data } : {}),
  };
}
