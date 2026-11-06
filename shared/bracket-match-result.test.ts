import { describe, expect, it } from "vitest";
import { matchWinner, shortLabel, sideResult } from "./bracket-match-result";
import type { FixtureView } from "../runtime/bracket";

function fixture(overrides: Partial<FixtureView> = {}): FixtureView {
  return {
    id: "fixture-1",
    homeName: "Flamingos FC",
    homeCrestUrl: null,
    homeSlug: "flamingos-fc",
    homeColor: "#ff00ff",
    awayName: "Bananáticos",
    awayCrestUrl: null,
    awaySlug: "bananaticos",
    awayColor: null,
    homeScore: null,
    awayScore: null,
    scheduledDate: null,
    scheduledTime: null,
    roundLabel: null,
    played: false,
    matchId: null,
    sortOrder: 1,
    ...overrides,
  };
}

describe("sideResult", () => {
  it("pending enquanto não jogado", () => {
    expect(sideResult(fixture(), "home")).toBe("pending");
  });

  it("casa vence quando o placar da casa é maior", () => {
    const f = fixture({ played: true, homeScore: 3, awayScore: 1 });
    expect(sideResult(f, "home")).toBe("won");
    expect(sideResult(f, "away")).toBe("lost");
  });

  it("visitante vence quando o placar do visitante é maior", () => {
    const f = fixture({ played: true, homeScore: 1, awayScore: 2 });
    expect(sideResult(f, "home")).toBe("lost");
    expect(sideResult(f, "away")).toBe("won");
  });

  it("pending num empate (súmula malcadastrada não devia existir numa eliminatória)", () => {
    const f = fixture({ played: true, homeScore: 2, awayScore: 2 });
    expect(sideResult(f, "home")).toBe("pending");
    expect(sideResult(f, "away")).toBe("pending");
  });
});

describe("matchWinner", () => {
  it("null enquanto não decidido", () => {
    expect(matchWinner(fixture())).toBeNull();
  });

  it("lado + cor de quem venceu", () => {
    const f = fixture({ played: true, homeScore: 3, awayScore: 1 });
    expect(matchWinner(f)).toEqual({ side: "home", color: "#ff00ff" });
  });

  it("cor null quando o time vencedor não tem cor cadastrada", () => {
    const f = fixture({ played: true, homeScore: 1, awayScore: 3 });
    expect(matchWinner(f)).toEqual({ side: "away", color: null });
  });
});

describe("shortLabel", () => {
  it("mantém rótulo curto ('P1', 'T2') como está", () => {
    expect(shortLabel("P1")).toBe("P1");
  });

  it("vira iniciais quando o rótulo é longo", () => {
    expect(shortLabel("Vencedor Grupo A")).toBe("Ve");
  });
});
