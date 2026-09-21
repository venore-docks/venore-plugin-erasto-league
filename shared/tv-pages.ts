import type { BracketView, FixtureView, NextGameView } from "../runtime/bracket";
import type { ScorerEntry } from "../runtime/stats";
import type { FixturePhase, TeamStanding } from "../contracts/types";

export type TvPage =
  | { key: string; kind: "next-game"; nextGame: NextGameView }
  | { key: string; kind: "group"; groupName: string; standings: TeamStanding[] }
  | { key: string; kind: "standings"; standings: TeamStanding[] }
  | { key: string; kind: "scorers"; scorers: ScorerEntry[] }
  | { key: string; kind: "knockout"; knockout: { phase: FixturePhase; fixtures: FixtureView[] }[] };

// "Ad" do próximo jogo sempre primeiro (chama atenção antes das tabelas), depois uma página por
// grupo (chaveamento por grupo+eliminatórias) OU uma página só de classificação geral (campeonato
// sem fase de grupos) — nunca as duas, senão a classificação geral repetiria o que os grupos já
// mostram. Artilheiros vem em seguida (só se já tem gol registrado). Eliminatórias (se existirem)
// sempre entram como página extra no fim.
export function buildTvPages(
  bracket: BracketView,
  standings: TeamStanding[],
  nextGame: NextGameView | null,
  scorers: ScorerEntry[] = [],
): TvPage[] {
  const pages: TvPage[] = [];

  if (nextGame) {
    pages.push({ key: "next-game", kind: "next-game", nextGame });
  }

  if (bracket.groups.length > 0) {
    for (const group of bracket.groups) {
      pages.push({ key: `group-${group.name}`, kind: "group", groupName: group.name, standings: group.standings });
    }
  } else if (standings.length > 0) {
    pages.push({ key: "standings", kind: "standings", standings });
  }

  if (scorers.length > 0) {
    pages.push({ key: "scorers", kind: "scorers", scorers });
  }

  if (bracket.knockout.length > 0) {
    pages.push({ key: "knockout", kind: "knockout", knockout: bracket.knockout });
  }

  return pages;
}
