import { eq, inArray } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { fixtures as fixturesTable, teams as teamsTable } from "../database/schema";
import { getMatch } from "./matches";
import { getTeam } from "./teams";
import { resolveErastoLeagueConfig } from "../shared/config";
import { describeFixtureStage, describeMatchDate } from "../shared/match-labels";
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

type FixtureRow = typeof fixturesTable.$inferSelect;

async function findLinkedFixture(matchId: string): Promise<FixtureRow | undefined> {
  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.matchId, matchId)).limit(1);
  return fixture;
}

// Versão leve (sem foto/brasões/config) pra metadata de compartilhamento das páginas do jogo
// (runtime/share-metadata.ts) — roda em toda visita à página, não só quando alguém gera a capa.
export type MatchShareInfo = {
  matchId: string;
  coverMediaId: string | null;
  homeName: string;
  awayName: string;
  stageLabel: string | null;
  dateLabel: string;
};

export async function loadMatchShareInfo(matchId: string): Promise<MatchShareInfo | null> {
  const match = await getMatch(matchId);
  if (!match) return null;
  const [teamRows, fixture] = await Promise.all([
    db
      .select({ id: teamsTable.id, name: teamsTable.name })
      .from(teamsTable)
      .where(inArray(teamsTable.id, [match.homeTeamId, match.awayTeamId])),
    findLinkedFixture(matchId),
  ]);
  const nameOf = (id: string) => teamRows.find((row) => row.id === id)?.name ?? "—";
  return {
    matchId,
    coverMediaId: match.coverMediaId,
    homeName: nameOf(match.homeTeamId),
    awayName: nameOf(match.awayTeamId),
    stageLabel: describeFixtureStage(fixture),
    dateLabel: describeMatchDate(match.startedAt, fixture),
  };
}

async function resolveMediaUrl(mediaId: string | null): Promise<string | null> {
  if (!mediaId) return null;
  const result = await getMediaAsset({ id: mediaId });
  return result.success && result.data ? result.data.url : null;
}

export async function loadMatchCoverData(matchId: string): Promise<MatchCoverData | null> {
  const match = await getMatch(matchId);
  if (!match) return null;

  const [homeTeam, awayTeam, fixture, config, photoUrl] = await Promise.all([
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    findLinkedFixture(matchId),
    resolveErastoLeagueConfig(),
    resolveMediaUrl(match.coverMediaId),
  ]);

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
    stageLabel: describeFixtureStage(fixture),
    dateLabel: describeMatchDate(match.startedAt, fixture),
    leagueLogoUrl: config.logoUrl || null,
    accentColor: config.accentColor,
  };
}
