import type { FixtureView } from "../runtime/bracket";

export type MatchSide = "home" | "away";
export type SideResult = "won" | "lost" | "pending";

// Empate não deveria existir num confronto eliminatório, mas o placar aceita meio ponto
// (shared/score.ts) e uma súmula mal cadastrada pode zerar os dois lados — "pending" nesse caso em
// vez de chutar um vencedor errado.
export function sideResult(fixture: FixtureView, side: MatchSide): SideResult {
  if (!fixture.played || fixture.homeScore == null || fixture.awayScore == null || fixture.homeScore === fixture.awayScore) {
    return "pending";
  }
  const homeWon = fixture.homeScore > fixture.awayScore;
  return (side === "home") === homeWon ? "won" : "lost";
}

// Lado que avançou nesse confronto (pro traço até a rodada seguinte, e pro disco/placar em
// destaque) — color vem null quando o time venceu mas não tem cor cadastrada; cada tela decide o
// próprio fallback (Tailwind usa var(--primary), a TV usa var(--accent) das settings do plugin).
export type MatchWinner = { side: MatchSide; color: string | null } | null;

export function matchWinner(fixture: FixtureView): MatchWinner {
  if (sideResult(fixture, "home") === "won") return { side: "home", color: fixture.homeColor };
  if (sideResult(fixture, "away") === "won") return { side: "away", color: fixture.awayColor };
  return null;
}

// Sigla de quem ainda não é time ("P1", "T2"); rótulo longo ("Vencedor Grupo A") vira iniciais.
export function shortLabel(name: string): string {
  const trimmed = name.trim();
  return trimmed.length <= 3 ? trimmed : trimmed.slice(0, 2);
}
