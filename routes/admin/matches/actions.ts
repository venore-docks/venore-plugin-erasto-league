"use server";

import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { deleteEvent, recordEvent, updateEvent } from "../../../runtime/match-events";
import type { EventKind, MatchSide } from "../../../contracts/types";

// Súmula (Fase 3): corrige/completa ao vivo o que o controle deixou passar — mesmos mutators de
// runtime/match-events.ts que o controle usa, só que gateados por permissão de admin em vez de PIN.

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
