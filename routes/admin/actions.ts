"use server";

import { revalidatePath } from "next/cache";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { setSetting } from "@venore/plugin-sdk/settings";
import {
  ERASTO_LEAGUE_SETTINGS,
  clampPeriodCount,
  clampPeriodMinutes,
  sanitizeAccentColor,
} from "../../shared/settings";

export type ErastoLeagueSettingsState = { error: string | null; savedAt: number | null };

const S = ERASTO_LEAGUE_SETTINGS;

function str(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

// Salva TODAS as settings do plugin de uma vez. Gate duplo: a seção admin
// (erasto-league.manage, via getPluginAdminPageData) e o setSetting do core (settings.manage).
export async function saveErastoLeagueSettingsAction(
  _prev: ErastoLeagueSettingsState,
  formData: FormData,
): Promise<ErastoLeagueSettingsState> {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return { error: "Você não tem permissão para configurar o Erasto League.", savedAt: null };
  }

  const periodMinutes = clampPeriodMinutes(Number(str(formData, "periodMinutes")));
  const periodCount = clampPeriodCount(Number(str(formData, "periodCount")));
  const accentColor = sanitizeAccentColor(str(formData, "accentColor"));

  const writes = [
    setSetting({ key: S.pin.key, value: str(formData, "pin") }),
    setSetting({ key: S.defaultHomeName.key, value: str(formData, "defaultHomeName") || S.defaultHomeName.defaultValue }),
    setSetting({ key: S.defaultAwayName.key, value: str(formData, "defaultAwayName") || S.defaultAwayName.defaultValue }),
    setSetting({ key: S.periodMinutes.key, value: periodMinutes }),
    setSetting({ key: S.periodCount.key, value: periodCount }),
    setSetting({ key: S.accentColor.key, value: accentColor }),
    setSetting({ key: S.logoUrl.key, value: str(formData, "logoUrl") || S.logoUrl.defaultValue }),
  ];

  const results = await Promise.all(writes);
  const failed = results.find((r) => !r.success);
  if (failed && !failed.success) {
    return { error: failed.error.message, savedAt: null };
  }

  revalidatePath("/admin/erasto-league");
  return { error: null, savedAt: Date.now() };
}
