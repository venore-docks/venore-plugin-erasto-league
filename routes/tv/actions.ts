"use server";

import { getBracketView, getNextFixture, type BracketView, type NextGameView } from "../../runtime/bracket";
import { getFavoriteTeamResults, type FanVoteResults } from "../../runtime/fan-votes";
import { computeStandings } from "../../runtime/standings";
import { listTopScorers, type ScorerEntry } from "../../runtime/stats";
import { getTvDataVersion } from "../../runtime/tv-version";
import type { TeamStanding } from "../../contracts/types";

// Quantos artilheiros aparecem na página de TV — mesmo teto do bloco erasto-league.top-scorers
// (blocks/top-scorers-block.tsx), a lista completa mora em /erasto-league/artilharia.
const TV_SCORERS_LIMIT = 10;
// Idem pro time da torcida — mesmo teto do painel da home (blocks/fan-votes-block.tsx).
const TV_FAVORITE_TEAM_LIMIT = 8;

export type TvData = {
  bracket: BracketView;
  standings: TeamStanding[];
  nextGame: NextGameView | null;
  scorers: ScorerEntry[];
  favoriteTeam: FanVoteResults;
};

// Poll simples (sem SSE) — a tabela só muda quando uma partida encerra, o campeonato importa
// fixtures novas, ou chega voto de time favorito (bem mais raro que o placar ao vivo). Sem
// PIN/sessão: mesma filosofia do overlay (tela pra TV/projetor, não escreve nada).
export async function getTvDataAction(): Promise<TvData> {
  const [bracket, standings, nextGame, scorers, favoriteTeam] = await Promise.all([
    getBracketView(),
    computeStandings(),
    getNextFixture(),
    listTopScorers(TV_SCORERS_LIMIT),
    getFavoriteTeamResults(TV_FAVORITE_TEAM_LIMIT),
  ]);
  return { bracket, standings, nextGame, scorers, favoriteTeam };
}

// Poll leve pro client comparar e só chamar getTvDataAction (caro) quando algo de fato mudou —
// ver runtime/tv-version.ts.
export async function getTvDataVersionAction(): Promise<number> {
  return getTvDataVersion();
}
