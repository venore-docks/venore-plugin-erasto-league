"use server";

import { getBracketView, getNextFixture, type BracketView, type NextGameView } from "../../runtime/bracket";
import { getFavoriteTeamResults, getFinalMatchPoll, getMatchWinnerVoteResults, type FanVoteResults } from "../../runtime/fan-votes";
import { computeStandings } from "../../runtime/standings";
import { listTopScorers, type ScorerEntry } from "../../runtime/stats";
import { getTvDataVersion } from "../../runtime/tv-version";
import { resolveErastoLeagueConfig } from "../../shared/config";
import type { TvPagesOptions } from "../../shared/tv-pages";
import type { TeamStanding } from "../../contracts/types";

// Quantos artilheiros aparecem na página de TV — mesmo teto do bloco erasto-league.top-scorers
// (blocks/top-scorers-block.tsx), a lista completa mora em /erasto-league/artilharia.
const TV_SCORERS_LIMIT = 10;
// Idem pro time da torcida/favorito da final — menor que o teto do painel da home
// (blocks/fan-votes-block.tsx, 8): a linha dessa página é bem mais alta (crista 76px + placar), 8
// linhas estouravam a altura do palco. Favorito da final só tem 2 opções de qualquer jeito.
const TV_FAVORITE_TEAM_LIMIT = 5;

export type TvData = {
  bracket: BracketView;
  standings: TeamStanding[];
  nextGame: NextGameView | null;
  scorers: ScorerEntry[];
  favoriteTeam: FanVoteResults;
  finalWinner: FanVoteResults | null;
  options: TvPagesOptions;
};

const EMPTY_FAN_VOTE_RESULTS: FanVoteResults = { totalVotes: 0, entries: [], leaders: [] };

// null (sem final definida ainda) vira resultado vazio — shared/tv-pages.ts já só mostra a página
// com totalVotes > 0, então não precisa de um terceiro estado "indisponível".
async function getFinalWinnerResultsForTv(windowHours: number): Promise<FanVoteResults> {
  const poll = await getFinalMatchPoll(windowHours);
  if (!poll) return EMPTY_FAN_VOTE_RESULTS;
  return getMatchWinnerVoteResults(poll.match.id, TV_FAVORITE_TEAM_LIMIT);
}

// Poll simples (sem SSE) — a tabela só muda quando uma partida encerra, o campeonato importa
// fixtures novas, ou chega voto de time favorito/favorito da final (bem mais raro que o placar ao
// vivo). Sem PIN/sessão: mesma filosofia do overlay (tela pra TV/projetor, não escreve nada).
export async function getTvDataAction(): Promise<TvData> {
  const config = await resolveErastoLeagueConfig();
  const [bracket, standings, nextGame, scorers, favoriteTeam, finalWinner] = await Promise.all([
    getBracketView(),
    computeStandings(),
    getNextFixture(),
    listTopScorers(TV_SCORERS_LIMIT),
    getFavoriteTeamResults(TV_FAVORITE_TEAM_LIMIT),
    getFinalWinnerResultsForTv(config.fanVoteWindowHours),
  ]);
  return {
    bracket,
    standings,
    nextGame,
    scorers,
    favoriteTeam,
    finalWinner,
    options: { groupStageClosed: config.groupStageClosed, visibility: config.tvPageVisibility },
  };
}

// Poll leve pro client comparar e só chamar getTvDataAction (caro) quando algo de fato mudou —
// ver runtime/tv-version.ts.
export async function getTvDataVersionAction(): Promise<number> {
  return getTvDataVersion();
}
