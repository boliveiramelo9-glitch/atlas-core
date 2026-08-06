import { describe, expect, it } from "vitest";
import { normalizeTerm, weightedAverageCost } from "../src/index.js";

describe("weightedAverageCost", () => {
  it("recalcula o custo médio ponderado", () => {
    expect(weightedAverageCost(10, 20, 20, 600)).toBeCloseTo(26.6667, 4);
  });

  it("usa o custo da primeira entrada", () => {
    expect(weightedAverageCost(0, 0, 20, 600)).toBe(30);
  });
});

describe("normalizeTerm", () => {
  it("normaliza acentos e pontuação", () => {
    expect(normalizeTerm("  Pão-Brioché! ")).toBe("pao brioche");
  });
});
