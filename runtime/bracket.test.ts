import { describe, expect, it } from "vitest";
import { determineKnockoutLoserId, isMatchSideSwapped } from "./bracket";
import type { Fixture, MatchSummary } from "../contracts/types";

const TEAM_A = "11111111-1111-1111-1111-111111111111";
const TEAM_B = "22222222-2222-2222-2222-222222222222";

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: "fixture-1",
    phase: "quarterfinal",
    groupName: null,
    roundLabel: null,
    homeTeamId: TEAM_A,
    awayTeamId: TEAM_B,
    homeLabel: null,
    awayLabel: null,
    scheduledDate: null,
    scheduledTime: null,
    matchId: "match-1",
    sortOrder: 1,
    ...overrides,
  };
}

function match(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: "match-1",
    homeTeamId: TEAM_A,
    awayTeamId: TEAM_B,
    homeScore: 3,
    awayScore: 1,
    label: "",
    status: "finished",
    startedAt: 0,
    finishedAt: 1,
    mvpPlayerId: null,
    mvpNote: null,
    youtubeUrl: null,
    coverMediaId: null,
    ...overrides,
  };
}

// findUnlinkedFixtureForTeams (runtime/fixtures.ts) liga a partida ao confronto em QUALQUER ordem de
// mando de campo — bug real: um confronto com fixture.homeTeamId=Varzea/awayTeamId=Baile de Munique
// ligado a uma partida jogada com os lados invertidos (match.homeTeamId=Baile/awayTeamId=Varzea)
// mostrava o placar do Baile de Munique (vencedor) como se fosse do Varzea no chaveamento, mesmo a
// súmula (que usa o par da própria partida) estando correta.
describe("isMatchSideSwapped", () => {
  it("false sem partida linkada", () => {
    expect(isMatchSideSwapped(fixture({ matchId: null }), null)).toBe(false);
  });

  it("false quando o mando da fixture bate com o da partida", () => {
    expect(isMatchSideSwapped(fixture(), match())).toBe(false);
  });

  it("true quando a partida foi jogada com os lados invertidos", () => {
    const swapped = match({ homeTeamId: TEAM_B, awayTeamId: TEAM_A });
    expect(isMatchSideSwapped(fixture(), swapped)).toBe(true);
  });

  it("false quando a fixture ainda não tem os dois times definidos (rótulo livre)", () => {
    const labelFixture = fixture({ homeTeamId: null, awayTeamId: TEAM_B });
    expect(isMatchSideSwapped(labelFixture, match({ homeTeamId: TEAM_B, awayTeamId: TEAM_A }))).toBe(false);
  });
});

// "Time favorito" (temporada) só considera quem ainda está na disputa — runtime/bracket.ts
// getEliminatedTeamIds usa isso pra cada confronto eliminatório. Casos cobrem exatamente os motivos
// pra um time aparecer eliminado quando não devia (ou o contrário).
describe("determineKnockoutLoserId", () => {
  it("null sem partida linkada", () => {
    expect(determineKnockoutLoserId(fixture({ matchId: null }), null)).toBeNull();
  });

  it("null com partida ainda em andamento (não encerrada)", () => {
    expect(determineKnockoutLoserId(fixture(), match({ status: "in_progress" }))).toBeNull();
  });

  it("null em empate (não devia existir numa eliminatória, mas não inventa perdedor)", () => {
    expect(determineKnockoutLoserId(fixture(), match({ homeScore: 2, awayScore: 2 }))).toBeNull();
  });

  it("casa perde quando o placar da casa é menor", () => {
    expect(determineKnockoutLoserId(fixture(), match({ homeScore: 1, awayScore: 3 }))).toBe(TEAM_A);
  });

  it("visitante perde quando o placar do visitante é menor", () => {
    expect(determineKnockoutLoserId(fixture(), match({ homeScore: 3, awayScore: 1 }))).toBe(TEAM_B);
  });

  // Mesmo bug de isMatchSideSwapped: a partida pode ter sido jogada com os lados invertidos em
  // relação ao mando cadastrado na fixture — sem a correção, o vencedor de verdade (TEAM_B, 3x1)
  // seria marcado como eliminado em vez do perdedor (TEAM_A).
  it("perdedor certo mesmo com os lados da partida invertidos", () => {
    const swapped = match({ homeTeamId: TEAM_B, awayTeamId: TEAM_A, homeScore: 3, awayScore: 1 });
    expect(determineKnockoutLoserId(fixture(), swapped)).toBe(TEAM_A);
  });

  it("null quando a fixture ainda não tem os dois times definidos (rótulo livre)", () => {
    const labelFixture = fixture({ homeTeamId: null });
    expect(determineKnockoutLoserId(labelFixture, match())).toBeNull();
  });
});
