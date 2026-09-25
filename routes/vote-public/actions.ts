"use server";

import { refresh } from "next/cache";
import { isPluginActive } from "@venore/plugin-sdk";
import { castFavoriteTeamVote, castMatchFanVote, type CastVoteResult } from "../../runtime/fan-votes";
import { ensureVoterIdentity } from "../../runtime/voter";
import { verifyTurnstileToken } from "../../runtime/turnstile";
import { readFanVoteWindowHours, readFavoriteTeamVotingOpenFresh } from "../../shared/config";

// Voto público da torcida — SEM login nem permissão (pedido explícito). A "barreira" é o cookie de
// aparelho (runtime/voter.ts), o Turnstile opcional (runtime/turnstile.ts) e a auditoria do admin.

export type VoteActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  // Escolha registrada deste aparelho (inclusive quando o erro é "já votou": mostra em quem foi).
  choiceId: string | null;
  // Incrementa a cada resposta — o formulário usa pra resetar o Turnstile (token é de uso único).
  attempt: number;
};

function toState(result: CastVoteResult, attempt: number, successMessage: string): VoteActionState {
  if (result.ok) {
    return { status: "success", message: successMessage, choiceId: result.choiceId, attempt };
  }
  return { status: "error", message: result.message, choiceId: result.choiceId ?? null, attempt };
}

async function guard(formData: FormData, attempt: number): Promise<VoteActionState | null> {
  if (!(await isPluginActive("erasto-league"))) {
    return { status: "error", message: "Votação indisponível.", choiceId: null, attempt };
  }
  const token = String(formData.get("cf-turnstile-response") ?? "") || null;
  if (!(await verifyTurnstileToken(token))) {
    return {
      status: "error",
      message: "Não deu pra confirmar que você não é um robô — espere a verificação terminar e tente de novo.",
      choiceId: null,
      attempt,
    };
  }
  return null;
}

export async function castMatchVoteAction(prev: VoteActionState, formData: FormData): Promise<VoteActionState> {
  const attempt = prev.attempt + 1;
  const blocked = await guard(formData, attempt);
  if (blocked) return blocked;

  const matchId = String(formData.get("matchId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  if (!matchId || !playerId) {
    return { status: "error", message: "Escolha um jogador antes de votar.", choiceId: null, attempt };
  }

  const [voter, windowHours] = await Promise.all([ensureVoterIdentity(), readFanVoteWindowHours()]);
  const result = await castMatchFanVote({ matchId, playerId, voter, windowHours });

  // Re-renderiza a página (parcial atualizado + "seu voto") com o cookie que acabou de ser gravado.
  refresh();
  return toState(result, attempt, "Voto registrado! Obrigado por participar.");
}

export async function castFavoriteTeamVoteAction(prev: VoteActionState, formData: FormData): Promise<VoteActionState> {
  const attempt = prev.attempt + 1;
  const blocked = await guard(formData, attempt);
  if (blocked) return blocked;

  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) {
    return { status: "error", message: "Escolha um time antes de votar.", choiceId: null, attempt };
  }

  const [voter, isOpen] = await Promise.all([ensureVoterIdentity(), readFavoriteTeamVotingOpenFresh()]);
  const result = await castFavoriteTeamVote({ teamId, voter, isOpen });

  refresh();
  return toState(result, attempt, result.ok && result.changed ? "Voto trocado!" : "Voto registrado! Obrigado por participar.");
}
