"use server";

import { resolveVoteCallout, type VoteCallout } from "../../runtime/fan-votes";
import { readFanVoteWindowHours, readFavoriteTeamVotingOpenFresh } from "../../shared/config";

// Poll do overlay do QR (OBS) — sem sessão, mesma filosofia do overlay do placar: só leitura.
export async function getVoteCalloutAction(): Promise<VoteCallout> {
  const [windowHours, favoriteOpen] = await Promise.all([readFanVoteWindowHours(), readFavoriteTeamVotingOpenFresh()]);
  return resolveVoteCallout(windowHours, favoriteOpen);
}
