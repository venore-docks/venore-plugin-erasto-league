"use server";

import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { setSetting } from "@venore/plugin-sdk/settings";
import {
  resetFavoriteTeamVotes,
  restoreFavoriteVotesByIp,
  restoreMatchVotesByIp,
  voidFavoriteVotesByIp,
  voidMatchVotesByIp,
  type VoidMode,
} from "../../../runtime/fan-votes";
import { ERASTO_LEAGUE_SETTINGS, clampFanVoteWindowHours } from "../../../shared/settings";

// Admin da votação da torcida — mesmo gate de todo o resto do plugin (erasto-league.manage, via
// getPluginAdminPageData); gravar setting ainda passa pelo gate do core (settings.manage) dentro
// de setSetting. Anular/restaurar nunca apaga voto: só marca/desmarca voided_at (dá pra desfazer).

const S = ERASTO_LEAGUE_SETTINGS;
const DENIED = "Você não tem permissão para configurar o Erasto League.";

async function isGranted(): Promise<boolean> {
  const gate = await getPluginAdminPageData("erasto-league");
  return gate.granted;
}

function revalidateVoteScreens(matchId?: string | null): void {
  revalidatePath("/admin/erasto-league/votes");
  if (matchId) revalidatePath(`/admin/erasto-league/matches/${matchId}`);
}

export type VoteSettingsState = { error: string | null; savedAt: number | null };

export async function saveVoteWindowAction(_prev: VoteSettingsState, formData: FormData): Promise<VoteSettingsState> {
  if (!(await isGranted())) return { error: DENIED, savedAt: null };
  const hours = clampFanVoteWindowHours(Number(String(formData.get("fanVoteWindowHours") ?? "")));
  const result = await setSetting({ key: S.fanVoteWindowHours.key, value: hours });
  if (!result.success) return { error: result.error.message, savedAt: null };
  revalidateVoteScreens();
  return { error: null, savedAt: Date.now() };
}

export async function setFavoriteVotingOpenAction(formData: FormData): Promise<void> {
  if (!(await isGranted())) throw new Error(DENIED);
  const open = String(formData.get("open")) === "true";
  const result = await setSetting({ key: S.favoriteTeamVotingOpen.key, value: open });
  if (!result.success) throw new Error(result.error.message);
  revalidateVoteScreens();
}

function readScope(formData: FormData): { scope: "match" | "favorite"; matchId: string | null; ipHash: string } {
  const scope = String(formData.get("scope")) === "match" ? "match" : "favorite";
  const matchId = String(formData.get("matchId") ?? "") || null;
  const ipHash = String(formData.get("ipHash") ?? "");
  if (!ipHash || (scope === "match" && !matchId)) {
    throw new Error("Grupo de votos inválido.");
  }
  return { scope, matchId, ipHash };
}

export async function voidVoteGroupAction(formData: FormData): Promise<void> {
  if (!(await isGranted())) throw new Error(DENIED);
  const { scope, matchId, ipHash } = readScope(formData);
  const mode: VoidMode = String(formData.get("mode")) === "keep-one-per-browser" ? "keep-one-per-browser" : "all";
  if (scope === "match") await voidMatchVotesByIp(matchId!, ipHash, mode);
  else await voidFavoriteVotesByIp(ipHash, mode);
  revalidateVoteScreens(matchId);
}

export async function restoreVoteGroupAction(formData: FormData): Promise<void> {
  if (!(await isGranted())) throw new Error(DENIED);
  const { scope, matchId, ipHash } = readScope(formData);
  if (scope === "match") await restoreMatchVotesByIp(matchId!, ipHash);
  else await restoreFavoriteVotesByIp(ipHash);
  revalidateVoteScreens(matchId);
}

// Nova temporada — apaga TODOS os votos de Time favorito (confirmação no client,
// reset-favorite-votes-control.tsx).
export async function resetFavoriteVotesAction(): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  if (!(await isGranted())) return { ok: false, error: DENIED };
  const deleted = await resetFavoriteTeamVotes();
  revalidateVoteScreens();
  return { ok: true, deleted };
}
