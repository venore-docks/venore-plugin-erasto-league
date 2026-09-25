import { describe, expect, it } from "vitest";
import { coverTeamNameFontSize } from "./match-cover-layout";

describe("coverTeamNameFontSize", () => {
  it("nome curto usa o tamanho máximo", () => {
    expect(coverTeamNameFontSize("Leões")).toBe(84);
  });

  it("nome comprido encolhe pra caber numa linha, com piso", () => {
    const medium = coverTeamNameFontSize("Bananáticos FC");
    expect(medium).toBeLessThan(84);
    expect(medium * 0.5 * "Bananáticos FC".length).toBeLessThanOrEqual(460);
    expect(coverTeamNameFontSize("Associação Atlética Muito Comprida da Silva")).toBe(36);
  });
});
