import { getSetting, type GetSettingResult } from "@venore/plugin-sdk/settings";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import {
  ERASTO_LEAGUE_SETTINGS,
  clampFanVoteWindowHours,
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

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

// Leitura SEM cache de "Time favorito aberto?" — o cache de settings é por instância (memória), e o
// voto (runtime/fan-votes.ts castFavoriteTeamVote) não pode continuar aceitando voto numa instância
// que ainda não viu o admin fechar a votação. Uma query curta por voto.
export async function readFavoriteTeamVotingOpenFresh(): Promise<boolean> {
  const S = ERASTO_LEAGUE_SETTINGS;
  const result = await getSetting({ key: S.favoriteTeamVotingOpen.key, skipCache: true });
  const value = result.success && result.data ? result.data.value : undefined;
  return asBoolean(value, S.favoriteTeamVotingOpen.defaultValue);
}

// Só a janela do Jogador da Torcida (horas depois do jogo) — o voto e a página de voto não precisam
// do snapshot inteiro (que ainda resolve a logo no sistema de mídia).
export async function readFanVoteWindowHours(): Promise<number> {
  const S = ERASTO_LEAGUE_SETTINGS;
  const result = await getSetting({ key: S.fanVoteWindowHours.key });
  const value = result.success && result.data ? result.data.value : undefined;
  return clampFanVoteWindowHours(asNumber(value, S.fanVoteWindowHours.defaultValue));
}

// Lê todas as settings do plugin de uma vez e devolve o snapshot já saneado que overlay/console/
// admin consomem. Uma ida ao contexts/settings por chave, em paralelo.
export async function resolveErastoLeagueConfig(): Promise<ErastoLeagueConfig> {
  const S = ERASTO_LEAGUE_SETTINGS;
  const [periodMin, periodCount, accent, logoMedia, youtubeChannelId, goalFlashSeconds, fanVoteWindowHours, favoriteTeamVotingOpen] =
    await Promise.all([
      getSetting({ key: S.periodMinutes.key }),
      getSetting({ key: S.periodCount.key }),
      getSetting({ key: S.accentColor.key }),
      getSetting({ key: S.logoMediaId.key }),
      getSetting({ key: S.youtubeChannelId.key }),
      getSetting({ key: S.goalFlashSeconds.key }),
      getSetting({ key: S.fanVoteWindowHours.key }),
      getSetting({ key: S.favoriteTeamVotingOpen.key }),
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
    fanVoteWindowHours: clampFanVoteWindowHours(asNumber(read(fanVoteWindowHours), S.fanVoteWindowHours.defaultValue)),
    favoriteTeamVotingOpen: asBoolean(read(favoriteTeamVotingOpen), S.favoriteTeamVotingOpen.defaultValue),
  };
}
