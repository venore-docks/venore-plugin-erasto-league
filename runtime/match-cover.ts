import { eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { fixtures as fixturesTable } from "../database/schema";
import { getMatch } from "./matches";
import { getTeam } from "./teams";
import { resolveErastoLeagueConfig } from "../shared/config";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { getMediaAsset } from "@venore/plugin-sdk/media";

// Tudo que a capa 1280×720 de um jogo precisa (runtime/match-cover-image.tsx) — SEM placar
// (pedido explícito: a capa vai pro YouTube, e placar na miniatura estraga o replay). Recalculado a
// cada geração a partir da foto da súmula + cadastro dos times + confronto da tabela de jogos.
export type MatchCoverData = {
  matchId: string;
  coverMediaId: string | null;
  photoUrl: string | null;
  homeName: string;
  awayName: string;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  homeColor: string | null;
  awayColor: string | null;
  // "Semifinal", "Grupo A · 2ª Rodada"... null = partida sem confronto vinculado.
  stageLabel: string | null;
  // "25/09" — data do confronto (tabela de jogos) ou, sem confronto, do apito inicial.
  dateLabel: string;
  leagueLogoUrl: string | null;
  accentColor: string;
};

function formatDayMonth(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

async function resolveMediaUrl(mediaId: string | null): Promise<string | null> {
  if (!mediaId) return null;
  const result = await getMediaAsset({ id: mediaId });
  return result.success && result.data ? result.data.url : null;
}

export async function loadMatchCoverData(matchId: string): Promise<MatchCoverData | null> {
  const match = await getMatch(matchId);
  if (!match) return null;

  const [homeTeam, awayTeam, [fixture], config, photoUrl] = await Promise.all([
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    db.select().from(fixturesTable).where(eq(fixturesTable.matchId, matchId)).limit(1),
    resolveErastoLeagueConfig(),
    resolveMediaUrl(match.coverMediaId),
  ]);

  let stageLabel: string | null = null;
  if (fixture) {
    if (fixture.phase === "group") {
      const group = fixture.groupName ? `Grupo ${fixture.groupName}` : null;
      stageLabel = [group, fixture.roundLabel].filter(Boolean).join(" · ") || FIXTURE_PHASE_LABEL.group;
    } else {
      stageLabel = FIXTURE_PHASE_LABEL[fixture.phase];
    }
  }

  let dateLabel = formatDayMonth(match.startedAt);
  if (fixture?.scheduledDate) {
    const [, month, day] = fixture.scheduledDate.split("-");
    if (month && day) dateLabel = `${day}/${month}`;
  }

  return {
    matchId,
    coverMediaId: match.coverMediaId,
    photoUrl,
    homeName: homeTeam?.name ?? "—",
    awayName: awayTeam?.name ?? "—",
    homeCrestUrl: homeTeam?.crestUrl ?? null,
    awayCrestUrl: awayTeam?.crestUrl ?? null,
    homeColor: homeTeam?.primaryColor ?? null,
    awayColor: awayTeam?.primaryColor ?? null,
    stageLabel,
    dateLabel,
    leagueLogoUrl: config.logoUrl || null,
    accentColor: config.accentColor,
  };
}
