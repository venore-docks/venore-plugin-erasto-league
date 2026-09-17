"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import {
  createFixture,
  deleteFixture,
  getFixture,
  linkFixtureToMatch,
  shiftAllScheduledAtBy3Hours,
  updateFixture,
  type FixtureInput,
} from "../../../runtime/fixtures";
import { saoPauloPartsToEpoch } from "../../../shared/timezone";
import type { FixturePhase } from "../../../contracts/types";

// <input type="datetime-local"> devolve "YYYY-MM-DDTHH:mm" sem fuso — sempre horário de Brasília
// (ver shared/timezone.ts pro motivo de não usar new Date(string) direto, que pega o fuso do
// servidor/Vercel em vez de America/Sao_Paulo).
function parseDatetimeLocal(value: string): number | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match;
  return saoPauloPartsToEpoch(Number(year), Number(month), Number(day), Number(hours), Number(minutes));
}

async function requireGate(): Promise<void> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    throw new Error("Você não tem permissão para editar a tabela de jogos.");
  }
}

export async function linkFixtureFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const fixtureId = String(formData.get("fixtureId"));
  const matchIdRaw = String(formData.get("matchId") ?? "");
  await linkFixtureToMatch(fixtureId, matchIdRaw || null);
  revalidatePath("/admin/erasto-league/fixtures");
}

export async function deleteFixtureFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const fixtureId = String(formData.get("fixtureId"));
  await deleteFixture(fixtureId);
  revalidatePath("/admin/erasto-league/fixtures");
  redirect("/admin/erasto-league/fixtures");
}

// Correção pontual (só-uso-único) do bug de fuso descrito em runtime/fixtures.ts
// shiftAllScheduledAtBy3Hours — soma 3h em todo horário já importado/editado antes do fix.
export async function fixScheduledAtTimezoneAction(): Promise<{ ok: boolean; count: number }> {
  await requireGate();
  const count = await shiftAllScheduledAtBy3Hours();
  revalidatePath("/admin/erasto-league/fixtures");
  return { ok: true, count };
}

export type FixtureActionState = { error: string | null; fixtureId: string | null };

function str(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function nullableStr(formData: FormData, field: string): string | null {
  const value = str(formData, field);
  return value || null;
}

export async function saveFixtureFormAction(_prev: FixtureActionState, formData: FormData): Promise<FixtureActionState> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { error: "Você não tem permissão para editar a tabela de jogos.", fixtureId: null };
  }

  const scheduledAtRaw = str(formData, "scheduledAt");
  const scheduledAt = scheduledAtRaw ? parseDatetimeLocal(scheduledAtRaw) : null;
  if (scheduledAtRaw && scheduledAt === null) {
    return { error: "Data inválida.", fixtureId: null };
  }

  const id = str(formData, "id");
  // sortOrder só entra como desempate de confrontos no mesmo dia (ver runtime/fixtures.ts) —
  // preserva o valor existente (normalmente vindo do CSV) em vez de zerar a cada edição.
  const existingSortOrder = id === "new" ? 0 : ((await getFixture(id))?.sortOrder ?? 0);

  const input: FixtureInput = {
    phase: str(formData, "phase") as FixturePhase,
    groupName: nullableStr(formData, "groupName"),
    roundLabel: nullableStr(formData, "roundLabel"),
    homeTeamId: nullableStr(formData, "homeTeamId"),
    awayTeamId: nullableStr(formData, "awayTeamId"),
    homeLabel: nullableStr(formData, "homeLabel"),
    awayLabel: nullableStr(formData, "awayLabel"),
    scheduledAt,
    sortOrder: existingSortOrder,
  };

  const fixture = id === "new" ? await createFixture(input) : await updateFixture(id, input);

  revalidatePath("/admin/erasto-league/fixtures");
  revalidatePath(`/admin/erasto-league/fixtures/${fixture.id}`);

  if (id === "new") {
    redirect(`/admin/erasto-league/fixtures/${fixture.id}`);
  }

  return { error: null, fixtureId: fixture.id };
}
