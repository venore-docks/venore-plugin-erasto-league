"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import {
  autoLinkAllFixtures,
  createFixture,
  deleteFixture,
  getFixture,
  linkFixtureToMatch,
  updateFixture,
  type AutoLinkFixturesResult,
  type FixtureInput,
} from "../../../runtime/fixtures";
import type { FixturePhase } from "../../../contracts/types";

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

// "Vincular automaticamente" (routes/admin/fixtures/auto-link-fixtures-button.tsx) — cobre jogos
// que já aconteceram (ao vivo ou súmula manual) mas nunca ganharam o vínculo automático (partida
// de antes desse recurso existir, ou que na hora tinha mais de um candidato ambíguo pro mesmo par
// de times). Não é uma <form> comum porque o resultado ({linked, skipped}) vira mensagem inline no
// botão, não um redirect/void — chamado direto do client component via server action.
export async function autoLinkFixturesAction(): Promise<AutoLinkFixturesResult> {
  await requireGate();
  const result = await autoLinkAllFixtures();
  revalidatePath("/admin/erasto-league/fixtures");
  return result;
}

export async function deleteFixtureFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const fixtureId = String(formData.get("fixtureId"));
  await deleteFixture(fixtureId);
  revalidatePath("/admin/erasto-league/fixtures");
  redirect("/admin/erasto-league/fixtures");
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

  const id = str(formData, "id");
  // sortOrder só entra como desempate de confrontos no mesmo dia/horário (ver runtime/fixtures.ts)
  // — preserva o valor existente (normalmente vindo do CSV) em vez de zerar a cada edição.
  const existingSortOrder = id === "new" ? 0 : ((await getFixture(id))?.sortOrder ?? 0);

  const input: FixtureInput = {
    phase: str(formData, "phase") as FixturePhase,
    groupName: nullableStr(formData, "groupName"),
    roundLabel: nullableStr(formData, "roundLabel"),
    homeTeamId: nullableStr(formData, "homeTeamId"),
    awayTeamId: nullableStr(formData, "awayTeamId"),
    homeLabel: nullableStr(formData, "homeLabel"),
    awayLabel: nullableStr(formData, "awayLabel"),
    // Data e hora vêm de dois <input> independentes agora (type="date" + type="time"), não mais
    // um <input type="datetime-local"> só — editar a hora não fica mais "preso" esperando uma
    // data (o HTML5 datetime-local só aceita o valor com as duas partes preenchidas).
    scheduledDate: nullableStr(formData, "scheduledDate"),
    scheduledTime: nullableStr(formData, "scheduledTime"),
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
