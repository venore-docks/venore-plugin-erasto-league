"use server";

import { refresh } from "next/cache";
import { isPluginActive } from "@venore/plugin-sdk";
import {
  NETWORK_CAP_MESSAGE,
  WAIT_MORE_MESSAGE,
  castFavoriteTeamVote,
  castMatchFanVote,
  countPollVotesFromNetwork,
  toMatchVotePoll,
  type CastVoteResult,
  type NetworkVoteGate,
} from "../../runtime/fan-votes";
import { getMatch } from "../../runtime/matches";
import { ensureVoterIdentity, readNetworkHash } from "../../runtime/voter";
import { verifyTurnstileToken } from "../../runtime/turnstile";
import { issueVoteTicket, verifyVoteTicket, type VoteTicketScope } from "../../runtime/vote-ticket";
import { readFanVoteWindowHours, readFavoriteTeamVotingOpenFresh, readVoteCostPolicyFresh } from "../../shared/config";
import { evaluateVoteCost, isNetworkVoteCapReached, resolveVoteWaitSeconds } from "../../shared/fan-votes";

// Voto público da torcida — SEM login nem permissão (pedido explícito). As barreiras: o cookie de
// aparelho (runtime/voter.ts), o Turnstile (runtime/turnstile.ts), a auditoria do admin e o CUSTO
// de cada voto — uma espera contada no servidor desde o ticket (runtime/vote-ticket.ts), que cresce
// com os votos que já saíram da mesma rede e tem teto por rede (shared/fan-votes.ts). Votar de novo
// por aba anônima continua possível (faz parte do engajamento), só vai ficando mais demorado.

export type VoteActionState = {
  // "wait": chegou antes da espera exigida (outra aba da mesma rede votou no meio e a espera
  // cresceu) — o formulário espera retryAfterSeconds e reenvia sozinho, com o mesmo ticket.
  status: "idle" | "success" | "error" | "wait";
  message: string | null;
  // Escolha registrada deste aparelho (inclusive quando o erro é "já votou": mostra em quem foi).
  choiceId: string | null;
  // Incrementa a cada resposta.
  attempt: number;
  // Incrementa só quando o token do Turnstile foi gasto (verificado) — o formulário reseta o widget
  // nessa hora. Resposta "wait" ou ticket inválido não gasta o token.
  turnstileResets: number;
  retryAfterSeconds: number | null;
};

export type VoteTicketResult = { ok: true; ticket: string; waitSeconds: number } | { ok: false; message: string };

const UNAVAILABLE = "Votação indisponível.";

function state(prev: VoteActionState, patch: Partial<VoteActionState> & Pick<VoteActionState, "status" | "message">): VoteActionState {
  return {
    choiceId: null,
    retryAfterSeconds: null,
    turnstileResets: prev.turnstileResets,
    ...patch,
    attempt: prev.attempt + 1,
  };
}

// Depois do Turnstile: o token foi gasto, qualquer que seja o resultado.
function toState(prev: VoteActionState, result: CastVoteResult, successMessage: string): VoteActionState {
  const turnstileResets = prev.turnstileResets + 1;
  if (result.ok) {
    return state(prev, { status: "success", message: successMessage, choiceId: result.choiceId, turnstileResets });
  }
  if (result.code === "wait") {
    return state(prev, { status: "wait", message: result.message, retryAfterSeconds: result.retryAfterSeconds ?? 1, turnstileResets });
  }
  return state(prev, { status: "error", message: result.message, choiceId: result.choiceId ?? null, turnstileResets });
}

// Pedido do ticket, no toque em "Votar". Recusa cedo o que o voto recusaria de qualquer jeito
// (votação fechada, teto da rede) pra ninguém esperar à toa; a espera devolvida é só a estimativa
// pra barra de progresso — quem manda é a checagem na hora do voto (checkTicket).
export async function requestVoteTicketAction(input: { kind: "match" | "favorite"; matchId?: string }): Promise<VoteTicketResult> {
  if (!(await isPluginActive("erasto-league"))) return { ok: false, message: UNAVAILABLE };

  let scope: VoteTicketScope;
  if (input?.kind === "match") {
    const matchId = typeof input.matchId === "string" ? input.matchId : "";
    const [match, windowHours] = await Promise.all([matchId ? getMatch(matchId) : null, readFanVoteWindowHours()]);
    if (!match || !toMatchVotePoll(match, windowHours).isOpen) {
      return { ok: false, message: "A votação deste jogo já foi encerrada." };
    }
    scope = { kind: "match", matchId };
  } else {
    if (!(await readFavoriteTeamVotingOpenFresh())) return { ok: false, message: "A votação do time favorito está fechada." };
    scope = { kind: "favorite" };
  }

  const networkHash = await readNetworkHash();
  const [prior, policy] = await Promise.all([countPollVotesFromNetwork(scope, networkHash), readVoteCostPolicyFresh()]);
  if (isNetworkVoteCapReached(prior, policy)) return { ok: false, message: NETWORK_CAP_MESSAGE };

  return { ok: true, ticket: issueVoteTicket(scope), waitSeconds: resolveVoteWaitSeconds(prior, policy) };
}

// Ticket válido pra esta votação + pré-checagem da espera/teto com a contagem de AGORA. Antes do
// Turnstile de propósito: recusar aqui não gasta o token de uso único dele. A checagem que vale é
// a repetida no insert, travada por rede (runtime/fan-votes.ts NetworkVoteGate) — esta só poupa o
// token no caso comum.
async function checkTicket(
  prev: VoteActionState,
  formData: FormData,
  scope: VoteTicketScope,
): Promise<{ ok: true; nonce: string; gate: NetworkVoteGate } | { ok: false; state: VoteActionState }> {
  const ticket = verifyVoteTicket(String(formData.get("voteTicket") ?? "") || null, scope);
  if (!ticket.ok) {
    return { ok: false, state: state(prev, { status: "error", message: "A confirmação do voto expirou — toque em votar de novo." }) };
  }

  const ipHash = await readNetworkHash();
  const [prior, policy] = await Promise.all([countPollVotesFromNetwork(scope, ipHash), readVoteCostPolicyFresh()]);
  const check = evaluateVoteCost(prior, policy, ticket.issuedAt, Date.now());
  if (!check.ok && check.reason === "cap") {
    return { ok: false, state: state(prev, { status: "error", message: NETWORK_CAP_MESSAGE }) };
  }
  if (!check.ok) {
    return { ok: false, state: state(prev, { status: "wait", message: WAIT_MORE_MESSAGE, retryAfterSeconds: check.retryAfterSeconds }) };
  }
  return { ok: true, nonce: ticket.nonce, gate: { ipHash, ticketIssuedAt: ticket.issuedAt, policy } };
}

async function checkTurnstile(prev: VoteActionState, formData: FormData): Promise<VoteActionState | null> {
  const token = String(formData.get("cf-turnstile-response") ?? "") || null;
  if (await verifyTurnstileToken(token)) return null;
  return state(prev, {
    status: "error",
    message: "Não deu pra confirmar que você não é um robô — espere a verificação terminar e tente de novo.",
    turnstileResets: prev.turnstileResets + 1,
  });
}

export async function castMatchVoteAction(prev: VoteActionState, formData: FormData): Promise<VoteActionState> {
  if (!(await isPluginActive("erasto-league"))) return state(prev, { status: "error", message: UNAVAILABLE });

  const matchId = String(formData.get("matchId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  if (!matchId || !playerId) {
    return state(prev, { status: "error", message: "Escolha um jogador antes de votar." });
  }

  const ticket = await checkTicket(prev, formData, { kind: "match", matchId });
  if (!ticket.ok) return ticket.state;
  const blocked = await checkTurnstile(prev, formData);
  if (blocked) return blocked;

  const [voter, windowHours] = await Promise.all([ensureVoterIdentity(), readFanVoteWindowHours()]);
  const result = await castMatchFanVote({
    matchId,
    playerId,
    voter,
    windowHours,
    ticketNonce: ticket.nonce,
    gate: { ...ticket.gate, ipHash: voter.ipHash },
  });

  // Re-renderiza a página (parcial atualizado + "seu voto") com o cookie que acabou de ser gravado.
  refresh();
  return toState(prev, result, "Voto registrado! Obrigado por participar.");
}

export async function castFavoriteTeamVoteAction(prev: VoteActionState, formData: FormData): Promise<VoteActionState> {
  if (!(await isPluginActive("erasto-league"))) return state(prev, { status: "error", message: UNAVAILABLE });

  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) {
    return state(prev, { status: "error", message: "Escolha um time antes de votar." });
  }

  const ticket = await checkTicket(prev, formData, { kind: "favorite" });
  if (!ticket.ok) return ticket.state;
  const blocked = await checkTurnstile(prev, formData);
  if (blocked) return blocked;

  const [voter, isOpen] = await Promise.all([ensureVoterIdentity(), readFavoriteTeamVotingOpenFresh()]);
  const result = await castFavoriteTeamVote({ teamId, voter, isOpen, ticketNonce: ticket.nonce, gate: { ...ticket.gate, ipHash: voter.ipHash } });

  refresh();
  return toState(prev, result, result.ok && result.changed ? "Voto trocado!" : "Voto registrado! Obrigado por participar.");
}
