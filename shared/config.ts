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
  const [pin, home, away, periodMin, periodCount, accent, logo] = await Promise.all([
    getSetting({ key: S.pin.key }),
    getSetting({ key: S.defaultHomeName.key }),
    getSetting({ key: S.defaultAwayName.key }),
    getSetting({ key: S.periodMinutes.key }),
    getSetting({ key: S.periodCount.key }),
    getSetting({ key: S.accentColor.key }),
    getSetting({ key: S.logoUrl.key }),
  ]);

  const read = (r: GetSettingResult): unknown => (r.success && r.data ? r.data.value : undefined);

  // PIN: setting > env ERASTO_LEAGUE_PIN > "1234".
  const settingPin = asString(read(pin), "").trim();
  const envPin = process.env.ERASTO_LEAGUE_PIN?.trim() ?? "";
  const resolvedPin = settingPin || envPin || "1234";

  return {
    pin: resolvedPin,
    defaultHomeName: asString(read(home), S.defaultHomeName.defaultValue),
    defaultAwayName: asString(read(away), S.defaultAwayName.defaultValue),
    periodMs: clampPeriodMinutes(asNumber(read(periodMin), S.periodMinutes.defaultValue)) * 60_000,
    periodCount: clampPeriodCount(asNumber(read(periodCount), S.periodCount.defaultValue)),
    accentColor: sanitizeAccentColor(asString(read(accent), S.accentColor.defaultValue)),
    logoUrl: asString(read(logo), S.logoUrl.defaultValue).trim(),
  };
}

// true quando o PIN NÃO veio de uma setting nem de env — o console mostra um aviso.
export function pinIsDefaultFor(config: ErastoLeagueConfig): boolean {
  return config.pin === "1234" && !process.env.ERASTO_LEAGUE_PIN?.trim();
}
