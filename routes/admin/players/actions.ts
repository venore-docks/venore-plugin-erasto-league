"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { createPlayer, updatePlayer, type PlayerInput } from "../../../runtime/players";

export type PlayerActionState = { error: string | null; playerId: string | null };

function str(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function nullableStr(formData: FormData, field: string): string | null {
  const value = str(formData, field);
  return value || null;
}

export async function savePlayerAction(_prev: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { error: "Você não tem permissão para configurar o Erasto League.", playerId: null };
  }

  const name = str(formData, "name");
  const teamId = str(formData, "teamId");
  if (!name) {
    return { error: "Informe o nome do jogador.", playerId: null };
  }
  if (!teamId) {
    return { error: "Selecione o time do jogador.", playerId: null };
  }

  const numberRaw = str(formData, "number");
  const number = numberRaw ? Math.max(0, Math.min(999, Math.round(Number(numberRaw)))) : null;

  const input: PlayerInput = {
    teamId,
    name,
    number: number != null && Number.isFinite(number) ? number : null,
    photoMediaId: nullableStr(formData, "photoMediaId"),
    bio: nullableStr(formData, "bio"),
  };

  const id = str(formData, "id");
  const player = id === "new" ? await createPlayer(input) : await updatePlayer(id, input);

  revalidatePath("/admin/erasto-league/players");
  revalidatePath(`/admin/erasto-league/players/${player.id}`);
  revalidatePath(`/admin/erasto-league/teams/${player.teamId}`);

  if (id === "new") {
    redirect(`/admin/erasto-league/players/${player.id}`);
  }

  return { error: null, playerId: player.id };
}
