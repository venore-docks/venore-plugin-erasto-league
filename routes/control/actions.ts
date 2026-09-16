"use server";

import {
  applyClockCommand,
  bumpScore,
  cancelMatch,
  finishMatch,
  recordCardOrFoul,
  resetCurrentMatch,
  setLabel,
  setPreMatchMessage,
  startMatch,
} from "../../runtime/match-actions";
import { attributePlayer } from "../../runtime/match-events";
import { listPlayersByTeam } from "../../runtime/players";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { hasValidPin, writePinCookie } from "../../shared/pin";
import type { ClockCommand, EventKind, MatchSide, MatchState, PlayerProfile } from "../../contracts/types";

export type SubmitPinState = { error: string | null };

// Ligada a <form action={...}> na tela de PIN. Depois de gravar o cookie, o Next reexecuta os
// Server Components da rota (control/page.tsx) sozinho.
export async function submitPinAction(
  _prev: SubmitPinState,
  formData: FormData,
): Promise<SubmitPinState> {
  const pin = String(formData.get("pin") ?? "").trim();
  if (!pin) {
    return { error: "Informe o PIN." };
  }
  const config = await resolveErastoLeagueConfig();
  if (pin !== config.pin) {
    return { error: "PIN incorreto." };
  }
  await writePinCookie(pin);
  return { error: null };
}

export type ScoreActionResult = { ok: true; state: MatchState } | { ok: false; error: string };
export type EventActionResult = { ok: true; state: MatchState; eventId: string } | { ok: false; error: string };

// Toda ação de escrita reconfere o cookie de PIN no servidor — o console é uma tela pública por URL.
async function requirePin(): Promise<{ ok: false; error: string } | null> {
  if (await hasValidPin()) {
    return null;
  }
  return { ok: false, error: "Sessão expirada. Recarregue a página e informe o PIN de novo." };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Falha inesperada.";
}

export async function startMatchAction(homeTeamId: string, awayTeamId: string): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  try {
    return { ok: true, state: await startMatch(homeTeamId, awayTeamId) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function finishMatchAction(): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await finishMatch() };
}

export async function resetMatchAction(): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await resetCurrentMatch() };
}

// "Cancelar partida" — descarta a partida atual sem contar na súmula/classificação (ver
// runtime/match-actions.ts cancelMatch).
export async function cancelMatchAction(): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await cancelMatch() };
}

export async function setPreMatchMessageAction(message: string): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await setPreMatchMessage(message) };
}

export async function bumpScoreAction(side: MatchSide, delta: number): Promise<EventActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  try {
    const { state, eventId } = await bumpScore(side, delta);
    return { ok: true, state, eventId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function recordEventAction(kind: Exclude<EventKind, "goal">, side: MatchSide): Promise<EventActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  try {
    const { state, eventId } = await recordCardOrFoul(kind, side);
    return { ok: true, state, eventId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function attributePlayerAction(eventId: string, playerId: string): Promise<{ ok: boolean }> {
  const denied = await requirePin();
  if (denied) return { ok: false };
  await attributePlayer(eventId, playerId);
  return { ok: true };
}

export async function listRosterAction(teamId: string): Promise<PlayerProfile[]> {
  const denied = await requirePin();
  if (denied) return [];
  return listPlayersByTeam(teamId);
}

export async function setLabelAction(label: string): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await setLabel(label) };
}

export async function clockAction(command: ClockCommand): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await applyClockCommand(command) };
}
