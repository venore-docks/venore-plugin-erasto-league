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
  | { key: string; kind: "final-winner"; results: FanVoteResults }
  | { key: string; kind: "favorite-team"; results: FanVoteResults };

// O que o admin decide mostrar na rotação da TV (routes/admin/settings-form.tsx, seção "TV") — cada
// chave liga/desliga um TIPO de página inteiro, não uma página específica (ex.: "standings" cobre
// tanto os grupos quanto a classificação geral, que já são mutuamente exclusivos entre si). Default
// true em todo campo: instalação nova ou setting ainda não salva mostra tudo, como sempre foi.
export type TvPageVisibility = {
  nextGame: boolean;
  standings: boolean;
  scorers: boolean;
  bracket: boolean;
  finalWinner: boolean;
  favoriteTeam: boolean;
};

export const DEFAULT_TV_PAGE_VISIBILITY: TvPageVisibility = {
  nextGame: true,
  standings: true,
  scorers: true,
  bracket: true,
  finalWinner: true,
  favoriteTeam: true,
};

export type TvPagesOptions = {
  // Mesma regra da home (blocks/home-block.tsx, shared/settings.ts groupStageClosed): fase de grupos
  // encerrada tira os grupos/classificação geral da rotação, sobra só a chave — a TV não lia essa
  // setting até aqui, por isso a chave de grupos continuava aparecendo mesmo depois de marcada como
  // encerrada.
  groupStageClosed: boolean;
  visibility: TvPageVisibility;
};

// "Ad" do próximo jogo sempre primeiro (chama atenção antes das tabelas), depois uma página por
// grupo (chaveamento por grupo+eliminatórias) OU uma página só de classificação geral (campeonato
// sem fase de grupos) — nunca as duas, senão a classificação geral repetiria o que os grupos já
// mostram; nenhuma das duas quando a fase de grupos está encerrada (options.groupStageClosed).
// Artilheiros vem em seguida (só se já tem gol registrado). Eliminatórias (se existirem) entram como
// página extra; o favorito da final (só quando a final existe e já tem voto) e o time da torcida
// (temporada, só se já tem voto) sempre por último, nessa ordem — mesmo espírito de "bônus" da
// votação, não é informação de campeonato. Cada bloco só entra se também estiver ligado em
// options.visibility.
export function buildTvPages(
  bracket: BracketView,
  standings: TeamStanding[],
  nextGame: NextGameView | null,
  scorers: ScorerEntry[] = [],
  favoriteTeam: FanVoteResults | null = null,
  finalWinner: FanVoteResults | null = null,
  options: TvPagesOptions = { groupStageClosed: false, visibility: DEFAULT_TV_PAGE_VISIBILITY },
): TvPage[] {
  const { groupStageClosed, visibility } = options;
  const pages: TvPage[] = [];

  if (visibility.nextGame && nextGame) {
    pages.push({ key: "next-game", kind: "next-game", nextGame });
  }

  if (visibility.standings && !groupStageClosed) {
    if (bracket.groups.length > 0) {
      for (const group of bracket.groups) {
        pages.push({ key: `group-${group.name}`, kind: "group", groupName: group.name, standings: group.standings });
      }
    } else if (standings.length > 0) {
      pages.push({ key: "standings", kind: "standings", standings });
    }
  }

  if (visibility.scorers && scorers.length > 0) {
    pages.push({ key: "scorers", kind: "scorers", scorers });
  }

  if (visibility.bracket && bracket.knockout.length > 0) {
    pages.push({ key: "knockout", kind: "knockout", knockout: bracket.knockout });
  }

  if (visibility.finalWinner && finalWinner && finalWinner.totalVotes > 0) {
    pages.push({ key: "final-winner", kind: "final-winner", results: finalWinner });
  }

  if (visibility.favoriteTeam && favoriteTeam && favoriteTeam.totalVotes > 0) {
    pages.push({ key: "favorite-team", kind: "favorite-team", results: favoriteTeam });
  }

  return pages;
}
