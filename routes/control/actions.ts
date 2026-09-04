"use server";

import {
  applyClockCommand,
  bumpScore,
  newMatch,
  resetScoreAndClock,
  setLabel,
  setTeamName,
} from "../../runtime/match-actions";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { hasValidPin, writePinCookie } from "../../shared/pin";
import type { ClockCommand, MatchSide, MatchState } from "../../contracts/types";

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

// Toda ação de escrita reconfere o cookie de PIN no servidor — o console é uma tela pública por URL.
async function requirePin(): Promise<ScoreActionResult | null> {
  if (await hasValidPin()) {
    return null;
  }
  return { ok: false, error: "Sessão expirada. Recarregue a página e informe o PIN de novo." };
}

export async function bumpScoreAction(side: MatchSide, delta: number): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await bumpScore(side, delta) };
}

export async function setTeamNameAction(side: MatchSide, name: string): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await setTeamName(side, name) };
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

// Zera placar + etiqueta + relógio, mantém os nomes dos times.
export async function resetMatchAction(): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: await resetScoreAndClock() };
}

// "Nova partida" — volta tudo ao zero, inclusive os nomes (pros padrões das settings).
export async function newMatchAction(): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  const config = await resolveErastoLeagueConfig();
  return {
    ok: true,
    state: await newMatch({ homeName: config.defaultHomeName, awayName: config.defaultAwayName }),
  };
}
