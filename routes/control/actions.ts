"use server";

import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import {
  applyClockCommand,
  bumpScore,
  cancelMatch,
  finishMatch,
  recordBoostForCurrentMatch,
  recordCardOrFoul,
  resetCurrentMatch,
  setLabel,
  setPreMatchMessage,
  startMatch,
} from "../../runtime/match-actions";
import { attributePlayer } from "../../runtime/match-events";
import { deleteBoostUse, listBoostsByMatch } from "../../runtime/match-boosts";
import { listPlayersByTeam } from "../../runtime/players";
import type { ClockCommand, EventKind, MatchSide, MatchState, PlayerProfile, PowerBoostKey, PowerBoostUse } from "../../contracts/types";

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

export async function attributePlayerAction(eventId: string, playerId: string): Promise<{ ok: boolean }> {
  const denied = await requireGate();
  if (denied) return { ok: false };
  await attributePlayer(eventId, playerId);
  return { ok: true };
}

export async function listRosterAction(teamId: string): Promise<PlayerProfile[]> {
  const denied = await requireGate();
  if (denied) return [];
  return listPlayersByTeam(teamId);
}

export type BoostActionResult = { ok: true; boost: PowerBoostUse } | { ok: false; error: string };

export async function recordBoostAction(side: MatchSide, boostKey: PowerBoostKey): Promise<BoostActionResult> {
  const denied = await requireGate();
  if (denied) return denied;
  try {
    return { ok: true, boost: await recordBoostForCurrentMatch(side, boostKey) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function listBoostsAction(matchId: string): Promise<PowerBoostUse[]> {
  const denied = await requireGate();
  if (denied) return [];
  return listBoostsByMatch(matchId);
}

// "Coloquei por engano" — tira um boost já usado, sem precisar abrir a súmula depois.
export async function deleteBoostAction(boostId: string): Promise<{ ok: boolean; error?: string }> {
  const denied = await requireGate();
  if (denied) return { ok: false, error: denied.error };
  await deleteBoostUse(boostId);
  return { ok: true };
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
