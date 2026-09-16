import { getSetting, type GetSettingResult } from "@venore/plugin-sdk/settings";
import {
  ERASTO_LEAGUE_SETTINGS,
  clampPeriodCount,
  clampPeriodMinutes,
  sanitizeAccentColor,
  type ErastoLeagueConfig,
} from "./settings";

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

// Lê todas as settings do plugin de uma vez e devolve o snapshot já saneado que overlay/console/
// admin consomem. Uma ida ao contexts/settings por chave, em paralelo.
export async function resolveErastoLeagueConfig(): Promise<ErastoLeagueConfig> {
  const S = ERASTO_LEAGUE_SETTINGS;
  const [periodMin, periodCount, accent, logo] = await Promise.all([
    getSetting({ key: S.periodMinutes.key }),
    getSetting({ key: S.periodCount.key }),
    getSetting({ key: S.accentColor.key }),
    getSetting({ key: S.logoUrl.key }),
  ]);

  const read = (r: GetSettingResult): unknown => (r.success && r.data ? r.data.value : undefined);

  return {
    periodMs: clampPeriodMinutes(asNumber(read(periodMin), S.periodMinutes.defaultValue)) * 60_000,
    periodCount: clampPeriodCount(asNumber(read(periodCount), S.periodCount.defaultValue)),
    accentColor: sanitizeAccentColor(asString(read(accent), S.accentColor.defaultValue)),
    logoUrl: asString(read(logo), S.logoUrl.defaultValue).trim(),
  };
}
