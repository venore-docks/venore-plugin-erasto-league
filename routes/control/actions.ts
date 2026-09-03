"use server";

import { bumpScore, resetMatch, setLabel, setTeamName } from "../../runtime/match-bus";
import { configuredPin, hasValidPin, writePinCookie } from "../../shared/pin";
import type { MatchSide, MatchState } from "../../contracts/types";

export type SubmitPinState = { error: string | null };

// Ligada a <form action={...}> na tela de PIN. Depois de gravar o cookie, o Next reexecuta os
// Server Components da rota (control/page.tsx) sozinho — o próximo render já passa no gate e
// mostra o console. Sem revalidatePath.
export async function submitPinAction(
  _prev: SubmitPinState,
  formData: FormData,
): Promise<SubmitPinState> {
  const pin = String(formData.get("pin") ?? "").trim();
  if (!pin) {
    return { error: "Informe o PIN." };
  }
  if (pin !== configuredPin()) {
    return { error: "PIN incorreto." };
  }
  await writePinCookie(pin);
  return { error: null };
}

export type ScoreActionResult =
  | { ok: true; state: MatchState }
  | { ok: false; error: string };

// Toda ação de escrita reconfere o cookie de PIN aqui no servidor — o console é uma tela pública
// por URL, não dá pra confiar que só o browser autorizado chama.
async function requirePin(): Promise<ScoreActionResult | null> {
  if (await hasValidPin()) {
    return null;
  }
  return { ok: false, error: "Sessão expirada. Recarregue a página e informe o PIN de novo." };
}

export async function bumpScoreAction(side: MatchSide, delta: number): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: bumpScore(side, delta) };
}

export async function setTeamNameAction(side: MatchSide, name: string): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: setTeamName(side, name) };
}

export async function setLabelAction(label: string): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: setLabel(label) };
}

export async function resetMatchAction(): Promise<ScoreActionResult> {
  const denied = await requirePin();
  if (denied) return denied;
  return { ok: true, state: resetMatch() };
}
