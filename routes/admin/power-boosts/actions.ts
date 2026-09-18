"use server";

import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { createPowerBoost, deletePowerBoost, updatePowerBoost, type PowerBoostInput } from "../../../runtime/power-boosts";

async function requireGate(): Promise<void> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    throw new Error("Você não tem permissão para editar o catálogo de power play.");
  }
}

function inputFromForm(formData: FormData): PowerBoostInput {
  return {
    label: String(formData.get("label") ?? "").trim(),
    emoji: String(formData.get("emoji") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  };
}

export async function addPowerBoostFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const input = inputFromForm(formData);
  if (!input.label) return;
  await createPowerBoost(input);
  revalidatePath("/admin/erasto-league/power-boosts");
}

export async function updatePowerBoostFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const id = String(formData.get("id"));
  const input = inputFromForm(formData);
  if (!input.label) return;
  await updatePowerBoost(id, input);
  revalidatePath("/admin/erasto-league/power-boosts");
}

export async function deletePowerBoostFormAction(formData: FormData): Promise<void> {
  await requireGate();
  const id = String(formData.get("id"));
  await deletePowerBoost(id);
  revalidatePath("/admin/erasto-league/power-boosts");
}
