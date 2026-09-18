"use server";

import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import {
  applyClockCommand,
  bumpScore,
  cancelMatch,
  finishMatch,
  getMatchState,
  recordBoostForCurrentMatch,
  recordCardOrFoul,
  resetCurrentMatch,
  setLabel,
  setPreMatchMessage,
  startMatch,
} from "../../runtime/match-actions";
import { attributePlayer, deleteEvent } from "../../runtime/match-events";
import { deleteBoostUse } from "../../runtime/match-boosts";
import { listPlayersByTeam } from "../../runtime/players";
import { setMatchMvp } from "../../runtime/matches";
import type { ClockCommand, EventKind, MatchSide, MatchState, PlayerProfile, PowerBoostKey } from "../../contracts/types";

export type ScoreActionResult = { ok: true; state: MatchState } | { ok: false; error: string };
export type EventActionResult = { ok: true; state: MatchState; eventId: string } | { ok: false; error: string };

// Toda ação de escrita reconfere a sessão/permissão no servidor — mesmo gate de qualquer tela
// admin do plugin (getPluginAdminPageData), não mais um PIN de cookie.
async function requireGate(): Promise<{ ok: false; error: string } | null> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (gate.granted) {
    return null;
  }
  return { ok: false, error: "Sessão expirada ou sem permissão. Faça login de novo em /login." };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Falha inesperada.";
}

export async function startMatchAction(homeTeamId: string, awayTeamId: string): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  try {
    return { ok: true, state: await startMatch(homeTeamId, awayTeamId) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function finishMatchAction(): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  return { ok: true, state: await finishMatch() };
}

export async function resetMatchAction(): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  return { ok: true, state: await resetCurrentMatch() };
}

// "Cancelar partida" — descarta a partida atual sem contar na súmula/classificação (ver
// runtime/match-actions.ts cancelMatch).
export async function cancelMatchAction(): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  return { ok: true, state: await cancelMatch() };
}

export async function setPreMatchMessageAction(message: string): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  return { ok: true, state: await setPreMatchMessage(message) };
}

export async function bumpScoreAction(side: MatchSide, delta: number): Promise<EventActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  try {
    const { state, eventId } = await bumpScore(side, delta);
    return { ok: true, state, eventId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function recordEventAction(kind: Exclude<EventKind, "goal">, side: MatchSide): Promise<EventActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  try {
    const { state, eventId } = await recordCardOrFoul(kind, side);
    return { ok: true, state, eventId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// Devolve o MatchState fresco (não só {ok:true}) igual a todo o resto das ações de partida — o
// nome do jogador só aparece em state.goals/state.cards depois de recalculado (ver
// runtime/match-store.ts loadLiveMarkers), então sem isso a pílula na parte de baixo do painel
// (console.tsx) ficaria em "sem jogador" até a próxima escrita qualquer da partida.
export async function attributePlayerAction(eventId: string, playerId: string): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  await attributePlayer(eventId, playerId);
  return { ok: true, state: await getMatchState() };
}

// "Tirei o gol/cartão por engano" (mesma UX do power play) — deleteEvent já recalcula o placar
// (runtime/match-events.ts recalcAndSync), então o MatchState devolvido já vem com score/goals/
// cards atualizados.
export async function deleteEventAction(eventId: string): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  await deleteEvent(eventId);
  return { ok: true, state: await getMatchState() };
}

export async function listRosterAction(teamId: string): Promise<PlayerProfile[]> {
  const denied = await requireGate();
  if (denied) return [];
  return listPlayersByTeam(teamId);
}

export async function recordBoostAction(side: MatchSide, boostKey: PowerBoostKey): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  try {
    await recordBoostForCurrentMatch(side, boostKey);
    return { ok: true, state: await getMatchState() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// "Coloquei por engano" — tira um boost já usado, sem precisar abrir a súmula depois.
export async function deleteBoostAction(boostId: string): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  await deleteBoostUse(boostId);
  return { ok: true, state: await getMatchState() };
}

export async function setLabelAction(label: string): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  return { ok: true, state: await setLabel(label) };
}

export async function clockAction(command: ClockCommand): Promise<ScoreActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  return { ok: true, state: await applyClockCommand(command) };
}

// MVP da partida — perguntado logo depois de "Encerrar partida" (routes/control/console.tsx), com
// opção de pular. Chamado com o id da partida que acabou de ser encerrada (currentMatchId já virou
// null no estado ao vivo nesse ponto, por isso não vem daqui).
export async function setMatchMvpAction(matchId: string, playerId: string | null, note: string | null): Promise<{ ok: boolean; error?: string }> {
  const denied = await requireGate();
  if (denied) return { ok: false, error: denied.error };
  await setMatchMvp(matchId, playerId, note);
  return { ok: true };
}
