import { getSetting, type GetSettingResult } from "@venore/plugin-sdk/settings";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import {
  ERASTO_LEAGUE_SETTINGS,
  clampGoalFlashSeconds,
  clampPeriodCount,
  clampPeriodMinutes,
  sanitizeAccentColor,
  type ErastoLeagueConfig,
} from "./settings";

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

// Mesmo resolveMediaUrl duplicado em runtime/teams.ts/runtime/players.ts — 4 linhas, não vale a
// pena um módulo compartilhado só por isso.
async function resolveMediaUrl(mediaId: string): Promise<string> {
  if (!mediaId) return "";
  const result = await getMediaAsset({ id: mediaId });
  return result.success && result.data ? result.data.url : "";
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
  const [periodMin, periodCount, accent, logoMedia, youtubeChannelId, goalFlashSeconds] = await Promise.all([
    getSetting({ key: S.periodMinutes.key }),
    getSetting({ key: S.periodCount.key }),
    getSetting({ key: S.accentColor.key }),
    getSetting({ key: S.logoMediaId.key }),
    getSetting({ key: S.youtubeChannelId.key }),
    getSetting({ key: S.goalFlashSeconds.key }),
  ]);

  const read = (r: GetSettingResult): unknown => (r.success && r.data ? r.data.value : undefined);
  const logoMediaId = asString(read(logoMedia), S.logoMediaId.defaultValue).trim();

  return {
    periodMs: clampPeriodMinutes(asNumber(read(periodMin), S.periodMinutes.defaultValue)) * 60_000,
    periodCount: clampPeriodCount(asNumber(read(periodCount), S.periodCount.defaultValue)),
    accentColor: sanitizeAccentColor(asString(read(accent), S.accentColor.defaultValue)),
    logoMediaId,
    logoUrl: await resolveMediaUrl(logoMediaId),
    youtubeChannelId: asString(read(youtubeChannelId), S.youtubeChannelId.defaultValue).trim(),
    goalFlashMs: clampGoalFlashSeconds(asNumber(read(goalFlashSeconds), S.goalFlashSeconds.defaultValue)) * 1_000,
  };
}
