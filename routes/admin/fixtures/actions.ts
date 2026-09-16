"use server";

import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { deleteFixture, linkFixtureToMatch } from "../../../runtime/fixtures";

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
}
