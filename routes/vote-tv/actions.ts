"use server";

import { getFanVotesVersion } from "../../runtime/fan-votes";
import { loadVoteTvData, type VoteTvData } from "../../runtime/vote-tv";
import { readFanVoteWindowHours, readFavoriteTeamVotingOpenFresh } from "../../shared/config";

// Poll da view de TV da votação — sem sessão (só leitura), mesma filosofia de routes/tv/actions.ts:
// o fingerprint barato decide quando vale refazer a leitura cara.
export async function getVoteTvDataAction(): Promise<VoteTvData> {
  const [windowHours, favoriteOpen] = await Promise.all([readFanVoteWindowHours(), readFavoriteTeamVotingOpenFresh()]);
  return loadVoteTvData(windowHours, favoriteOpen);
}

export async function getVoteTvVersionAction(): Promise<string> {
  const [version, favoriteOpen] = await Promise.all([getFanVotesVersion(), readFavoriteTeamVotingOpenFresh()]);
  // Abrir/fechar o Time favorito não mexe em voto nenhum — entra no fingerprint à parte.
  return `${version}|${favoriteOpen ? 1 : 0}`;
}
