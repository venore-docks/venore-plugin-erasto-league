import { getFavoriteTeamResults, getFeaturedMatchPoll, getMatchFanVoteResults, type FanVoteResults } from "./fan-votes";
import { getTeam } from "./teams";

// Dado da view de TV da votação (routes/vote-tv) — mesma fonte do bloco erasto-league.fan-votes:
// partida em destaque (aberta agora; senão a última que teve voto) + Time favorito.

export type VoteTvMatch = {
  matchId: string;
  homeName: string;
  awayName: string;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  homeColor: string | null;
  awayColor: string | null;
  // null = partida em andamento (fecha N horas depois do fim). O client compara com Date.now() pra
  // trocar "Parcial" por "Resultado final" na hora certa mesmo sem nenhum voto novo chegando.
  closesAt: number | null;
  isOpen: boolean;
  results: FanVoteResults;
};

export type VoteTvData = {
  match: VoteTvMatch | null;
  favorite: { isOpen: boolean; results: FanVoteResults };
};

const TV_MATCH_LIMIT = 5;
const TV_FAVORITE_LIMIT = 8;

export async function loadVoteTvData(windowHours: number, favoriteOpen: boolean): Promise<VoteTvData> {
  const [poll, favoriteResults] = await Promise.all([getFeaturedMatchPoll(windowHours), getFavoriteTeamResults(TV_FAVORITE_LIMIT)]);

  let match: VoteTvMatch | null = null;
  if (poll) {
    const [homeTeam, awayTeam, results] = await Promise.all([
      getTeam(poll.match.homeTeamId),
      getTeam(poll.match.awayTeamId),
      getMatchFanVoteResults(poll.match.id, TV_MATCH_LIMIT),
    ]);
    match = {
      matchId: poll.match.id,
      homeName: homeTeam?.name ?? "—",
      awayName: awayTeam?.name ?? "—",
      homeCrestUrl: homeTeam?.crestUrl ?? null,
      awayCrestUrl: awayTeam?.crestUrl ?? null,
      homeColor: homeTeam?.primaryColor ?? null,
      awayColor: awayTeam?.primaryColor ?? null,
      closesAt: poll.window?.closesAt ?? null,
      isOpen: poll.isOpen,
      results,
    };
  }

  return { match, favorite: { isOpen: favoriteOpen, results: favoriteResults } };
}
