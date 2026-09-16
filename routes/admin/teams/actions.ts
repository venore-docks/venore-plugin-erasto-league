"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import {
  createTeam,
  deleteTeam,
  getTeamDeleteImpact,
  updateTeam,
  type TeamDeleteImpact,
  type TeamInput,
} from "../../../runtime/teams";

export type TeamActionState = { error: string | null; teamId: string | null };

function str(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function nullableStr(formData: FormData, field: string): string | null {
  const value = str(formData, field);
  return value || null;
}

export async function saveTeamAction(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { error: "Você não tem permissão para configurar o Erasto League.", teamId: null };
  }

  const name = str(formData, "name");
  if (!name) {
    return { error: "Informe o nome do time.", teamId: null };
  }

  const input: TeamInput = {
    name,
    crestMediaId: nullableStr(formData, "crestMediaId"),
    primaryColor: nullableStr(formData, "primaryColor"),
    secondaryColor: nullableStr(formData, "secondaryColor"),
    description: nullableStr(formData, "description"),
    foundedDate: nullableStr(formData, "foundedDate"),
  };

  const id = str(formData, "id");
  const team = id === "new" ? await createTeam(input) : await updateTeam(id, input);

  revalidatePath("/admin/erasto-league/teams");
  revalidatePath(`/admin/erasto-league/teams/${team.id}`);

  if (id === "new") {
    redirect(`/admin/erasto-league/teams/${team.id}`);
  }

  return { error: null, teamId: team.id };
}

export async function getTeamDeleteImpactAction(id: string): Promise<{ ok: true; data: TeamDeleteImpact } | { ok: false; error: string }> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { ok: false, error: "Você não tem permissão para configurar o Erasto League." };
  }
  return { ok: true, data: await getTeamDeleteImpact(id) };
}

export async function deleteTeamAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { ok: false, error: "Você não tem permissão para configurar o Erasto League." };
  }

  const result = await deleteTeam(id);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/erasto-league/teams");
  revalidatePath("/admin/erasto-league/players");
  redirect("/admin/erasto-league/teams");
}
