import { describe, expect, it } from "vitest";
import { fallbackInterpret } from "../src/index.js";

describe("fallbackInterpret", () => {
  it("interpreta uma venda com vários produtos", () => {
    expect(fallbackInterpret("Vendi 2 Smash e 1 Combo no pix.")).toEqual({
      type: "register_sale",
      items: [
        { productName: "Smash", quantity: 2 },
        { productName: "Combo", quantity: 1 },
      ],
      paymentMethod: "pix",
    });
  });

  it("interpreta compra com decimal brasileiro", () => {
    expect(
      fallbackInterpret("Comprei 20kg de carne por R$600,00 em dinheiro"),
    ).toEqual({
      type: "register_purchase",
      items: [
        {
          ingredientName: "carne",
          quantity: 20,
          unit: "kg",
          totalCost: 600,
        },
      ],
      paymentMethod: "cash",
    });
  });

  it("consulta o resumo da semana", () => {
    expect(fallbackInterpret("Como estão as vendas da semana?")).toEqual({
      type: "get_summary",
      period: "week",
    });
  });

  it("pede esclarecimento quando não entende", () => {
    expect(fallbackInterpret("Oi, tudo bem?").type).toBe(
      "request_clarification",
    );
  });
});
