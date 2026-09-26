import { describe, expect, it } from "vitest";
import { readableTextOn, storyNameFontSize, withAlpha } from "./story-layout";

describe("story-layout", () => {
  it("nome curto usa o máximo; comprido encolhe até o piso", () => {
    expect(storyNameFontSize("Leões", 440, 76, 44)).toBe(76);
    const medium = storyNameFontSize("Bananáticos FC", 440, 76, 44);
    expect(medium).toBeLessThan(76);
    expect(medium).toBeGreaterThanOrEqual(44);
    expect(storyNameFontSize("Associação Atlética Muito Comprida da Silva", 440, 76, 44)).toBe(44);
  });

  it("withAlpha converte hex e cai pro branco com cor inválida", () => {
    expect(withAlpha("#22c55e", 0.4)).toBe("rgba(34,197,94,0.4)");
    expect(withAlpha("verde", 0.5)).toBe("rgba(255,255,255,0.5)");
  });

  it("texto escuro em cor clara, branco em cor escura", () => {
    expect(readableTextOn("#22c55e")).toBe("#0b0f14");
    expect(readableTextOn("#facc15")).toBe("#0b0f14");
    expect(readableTextOn("#1e3a8a")).toBe("#ffffff");
    expect(readableTextOn("#dc2626")).toBe("#ffffff");
  });
});
