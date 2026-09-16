"use server";

import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { importFixturesCsv, importTeamsCsv, type ImportResult } from "../../../runtime/csv-import";

export type CsvImportState = { result: ImportResult | null; error: string | null };

const initialState: CsvImportState = { result: null, error: null };
export { initialState as initialImportState };

async function readCsvFile(formData: FormData): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Escolha um arquivo .csv." };
  }
  return { ok: true, text: await file.text() };
}

export async function importTeamsCsvAction(_prev: CsvImportState, formData: FormData): Promise<CsvImportState> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { result: null, error: "Você não tem permissão para configurar o Erasto League." };
  }

  const file = await readCsvFile(formData);
  if (!file.ok) {
    return { result: null, error: file.error };
  }

  const result = await importTeamsCsv(file.text);
  revalidatePath("/admin/erasto-league/teams");
  return { result, error: null };
}

export async function importFixturesCsvAction(_prev: CsvImportState, formData: FormData): Promise<CsvImportState> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { result: null, error: "Você não tem permissão para configurar o Erasto League." };
  }

  const file = await readCsvFile(formData);
  if (!file.ok) {
    return { result: null, error: file.error };
  }

  const replaceAll = formData.get("replaceAll") === "on";
  const result = await importFixturesCsv(file.text, { replaceAll });
  revalidatePath("/admin/erasto-league/fixtures");
  return { result, error: null };
}
