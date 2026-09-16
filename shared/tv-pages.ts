import type { BracketView, FixtureView } from "../runtime/bracket";
import type { FixturePhase, TeamStanding } from "../contracts/types";

export type TvPage =
  | { key: string; kind: "group"; groupName: string; standings: TeamStanding[] }
  | { key: string; kind: "standings"; standings: TeamStanding[] }
  | { key: string; kind: "knockout"; knockout: { phase: FixturePhase; fixtures: FixtureView[] }[] };

// Uma página por grupo (chaveamento por grupo+eliminatórias) OU uma página só de classificação
// geral (campeonato sem fase de grupos) — nunca as duas, senão a classificação geral repetiria o
// que os grupos já mostram. Eliminatórias (se existirem) sempre entram como página extra no fim.
export function buildTvPages(bracket: BracketView, standings: TeamStanding[]): TvPage[] {
  const pages: TvPage[] = [];

  if (bracket.groups.length > 0) {
    for (const group of bracket.groups) {
      pages.push({ key: `group-${group.name}`, kind: "group", groupName: group.name, standings: group.standings });
    }
  } else if (standings.length > 0) {
    pages.push({ key: "standings", kind: "standings", standings });
  }

  if (bracket.knockout.length > 0) {
    pages.push({ key: "knockout", kind: "knockout", knockout: bracket.knockout });
  }

  return pages;
}
