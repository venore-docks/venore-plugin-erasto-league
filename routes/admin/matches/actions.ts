"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { deleteEvent, recordEvent, updateEvent } from "../../../runtime/match-events";
import { deleteBoostUse, recordBoostUse } from "../../../runtime/match-boosts";
import { createManualMatch, deleteMatch, getMatchDeleteImpact, setMatchMvp, type MatchDeleteImpact } from "../../../runtime/matches";
import type { EventKind, MatchSide, PowerBoostKey } from "../../../contracts/types";

// Súmula (Fase 3): corrige/completa ao vivo o que o controle deixou passar — mesmos mutators de
// runtime/match-events.ts que o controle usa, com o mesmo gate de permissão de admin.

async function requireGate(): Promise<void> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    throw new Error("Você não tem permissão para editar a súmula.");
  }
}

function eventInputFromForm(formData: FormData) {
  const kind = String(formData.get("kind")) as EventKind;
  const side = String(formData.get("side")) as MatchSide;
  const playerId = String(formData.get("playerId") ?? "") || null;
  const amountRaw = String(formData.get("amount") ?? "1");
  const amount = kind === "goal" ? Number(amountRaw) || 1 : 1;
  return { kind, side, playerId, amount };
}

export type CreateMatchActionState = { error: string | null };

// "Criar súmula" sem controle ao vivo (jogo atrasado / histórico anterior ao plugin) — ver
// runtime/matches.ts createManualMatch. Redireciona pra súmula normal do jogo criado, onde dá pra
// atribuir os gols a jogadores e adicionar cartão/falta como em qualquer outra partida.
export async function createMatchFormAction(_prev: CreateMatchActionState, formData: FormData): Promise<CreateMatchActionState> {
  await requireGate();

  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  if (!homeTeamId || !awayTeamId) {
    return { error: "Escolha os dois times." };
  }
  if (homeTeamId === awayTeamId) {
    return { error: "Escolha times diferentes." };
  }

  const homeScore = Math.max(0, Number(formData.get("homeScore") ?? 0) || 0);
  const awayScore = Math.max(0, Number(formData.get("awayScore") ?? 0) || 0);
  const playedOn = String(formData.get("playedOn") ?? "") || null;

  const match = await createManualMatch({ homeTeamId, awayTeamId, homeScore, awayScore, playedOn });

  revalidatePath("/admin/erasto-league/matches");
  redirect(`/admin/erasto-league/matches/${match.id}`);
}

export async function addEventFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const matchId = String(formData.get("matchId"));
  await recordEvent({ matchId, ...eventInputFromForm(formData) });
  revalidatePath(`/admin/erasto-league/matches/${matchId}`);
}

export async function updateEventFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const eventId = String(formData.get("eventId"));
  const matchId = String(formData.get("matchId"));
  await updateEvent(eventId, eventInputFromForm(formData));
  revalidatePath(`/admin/erasto-league/matches/${matchId}`);
}

export async function deleteEventFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const eventId = String(formData.get("eventId"));
  const matchId = String(formData.get("matchId"));
  await deleteEvent(eventId);
  revalidatePath(`/admin/erasto-league/matches/${matchId}`);
}

export async function addBoostFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const matchId = String(formData.get("matchId"));
  const side = String(formData.get("side")) as MatchSide;
  const boostKey = String(formData.get("boostKey")) as PowerBoostKey;
  await recordBoostUse({ matchId, side, boostKey });
  revalidatePath(`/admin/erasto-league/matches/${matchId}`);
}

export async function deleteBoostFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const boostId = String(formData.get("boostId"));
  const matchId = String(formData.get("matchId"));
  await deleteBoostUse(boostId);
  revalidatePath(`/admin/erasto-league/matches/${matchId}`);
}

// MVP da partida — mesmo gate de admin dos demais mutators desta súmula. playerId vazio limpa a
// escolha (ex.: admin marcou por engano).
export async function setMatchMvpFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const matchId = String(formData.get("matchId"));
  const playerId = String(formData.get("mvpPlayerId") ?? "") || null;
  const note = String(formData.get("mvpNote") ?? "").trim() || null;
  await setMatchMvp(matchId, playerId, note);
  revalidatePath(`/admin/erasto-league/matches/${matchId}`);
}

// Excluir súmula (Fase 3) — mesma UX de confirmação com impacto de routes/admin/teams/actions.ts
// (DeleteTeamControl): getMatchDeleteImpactAction alimenta o diálogo, deleteMatchAction só executa
// depois de confirmado. Ver runtime/matches.ts deleteMatch pro porquê da ordem de desvínculo.
export async function getMatchDeleteImpactAction(id: string): Promise<{ ok: true; data: MatchDeleteImpact } | { ok: false; error: string }> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { ok: false, error: "Você não tem permissão para configurar o Erasto League." };
  }
  return { ok: true, data: await getMatchDeleteImpact(id) };
}

export async function deleteMatchAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { ok: false, error: "Você não tem permissão para configurar o Erasto League." };
  }

  const result = await deleteMatch(id);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/erasto-league/matches");
  redirect("/admin/erasto-league/matches");
}
