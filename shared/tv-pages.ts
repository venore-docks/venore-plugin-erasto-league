import type { BracketView, FixtureView, NextGameView } from "../runtime/bracket";
import type { FanVoteResults } from "../runtime/fan-votes";
import type { ScorerEntry } from "../runtime/stats";
import type { FixturePhase, TeamStanding } from "../contracts/types";

export type TvPage =
  | { key: string; kind: "next-game"; nextGame: NextGameView }
  | { key: string; kind: "group"; groupName: string; standings: TeamStanding[] }
  | { key: string; kind: "standings"; standings: TeamStanding[] }
  | { key: string; kind: "scorers"; scorers: ScorerEntry[] }
  | { key: string; kind: "knockout"; knockout: { phase: FixturePhase; fixtures: FixtureView[] }[] }
  | { key: string; kind: "favorite-team"; results: FanVoteResults };

// "Ad" do próximo jogo sempre primeiro (chama atenção antes das tabelas), depois uma página por
// grupo (chaveamento por grupo+eliminatórias) OU uma página só de classificação geral (campeonato
// sem fase de grupos) — nunca as duas, senão a classificação geral repetiria o que os grupos já
// mostram. Artilheiros vem em seguida (só se já tem gol registrado). Eliminatórias (se existirem)
// entram como página extra, e o time da torcida (temporada, só se já tem voto) sempre por último —
// mesmo espírito de "bônus" da votação, não é informação de campeonato.
export function buildTvPages(
  bracket: BracketView,
  standings: TeamStanding[],
  nextGame: NextGameView | null,
  scorers: ScorerEntry[] = [],
  favoriteTeam: FanVoteResults | null = null,
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

  if (favoriteTeam && favoriteTeam.totalVotes > 0) {
    pages.push({ key: "favorite-team", kind: "favorite-team", results: favoriteTeam });
  }

  return pages;
}
