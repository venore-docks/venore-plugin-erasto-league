import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { matchEvents as matchEventsTable, matches as matchesTable, players as playersTable, teams as teamsTable } from "../database/schema";
import { rowToSummary } from "./matches";
import { clampScore } from "../shared/score";
import type { MatchSummary } from "../contracts/types";

// Stats de um jogador (perfil público, Fase 4) — só eventos de partidas encerradas contam (mesmo
// filtro de runtime/standings.ts). "Jogos" = partidas distintas em que o jogador teve pelo menos
// um evento — não existe conceito de escalação/titular no modelo (só evento), então isso é o mais
// perto de "jogos disputados" que dá pra saber.
export type PlayerStats = {
  matchesPlayed: number;
  goals: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
};

export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  const rows = await db
    .select({ kind: matchEventsTable.kind, matchId: matchEventsTable.matchId, amount: matchEventsTable.amount })
    .from(matchEventsTable)
    .innerJoin(matchesTable, eq(matchEventsTable.matchId, matchesTable.id))
    .where(and(eq(matchEventsTable.playerId, playerId), eq(matchesTable.status, "finished")));

  const stats: PlayerStats = { matchesPlayed: 0, goals: 0, yellowCards: 0, redCards: 0, fouls: 0 };
  const matchIds = new Set<string>();
  for (const row of rows) {
    matchIds.add(row.matchId);
    if (row.kind === "goal") stats.goals = clampScore(stats.goals + row.amount);
    else if (row.kind === "yellow_card") stats.yellowCards += 1;
    else if (row.kind === "red_card") stats.redCards += 1;
    else if (row.kind === "foul") stats.fouls += 1;
  }
  stats.matchesPlayed = matchIds.size;
  return stats;
}

// Últimos jogos de um jogador — matches distintas onde ele teve pelo menos um evento, mais
// recente primeiro.
export async function listRecentMatchesForPlayer(playerId: string, limit = 5): Promise<MatchSummary[]> {
  const eventRows = await db
    .select({ matchId: matchEventsTable.matchId })
    .from(matchEventsTable)
    .where(eq(matchEventsTable.playerId, playerId));
  const matchIds = [...new Set(eventRows.map((row) => row.matchId))];
  if (matchIds.length === 0) return [];

  const rows = await db
    .select()
    .from(matchesTable)
    .where(and(eq(matchesTable.status, "finished"), inArray(matchesTable.id, matchIds)))
    .orderBy(desc(matchesTable.finishedAt))
    .limit(limit);

  return rows.map(rowToSummary);
}

export type ScorerEntry = {
  playerId: string;
  slug: string;
  name: string;
  number: number | null;
  photoUrl: string | null;
  teamId: string;
  teamName: string;
  teamSlug: string;
  goals: number;
};

// Artilharia (bloco erasto-league.top-scorers) — soma de gols (kind "goal") por jogador, só
// partidas encerradas. group by leva todas as colunas não-agregadas junto (mesmo padrão SQL de
// sempre) — o SUM vem via sql<string> porque o driver devolve numeric como string.
export async function listTopScorers(limit = 10): Promise<ScorerEntry[]> {
  const rows = await db
    .select({
      playerId: playersTable.id,
      slug: playersTable.slug,
      name: playersTable.name,
      number: playersTable.number,
      photoMediaId: playersTable.photoMediaId,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      teamSlug: teamsTable.slug,
      goals: sql<string>`coalesce(sum(${matchEventsTable.amount}), 0)`,
    })
    .from(matchEventsTable)
    .innerJoin(matchesTable, eq(matchEventsTable.matchId, matchesTable.id))
    .innerJoin(playersTable, eq(matchEventsTable.playerId, playersTable.id))
    .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(and(eq(matchEventsTable.kind, "goal"), eq(matchesTable.status, "finished")))
    .groupBy(
      playersTable.id,
      playersTable.slug,
      playersTable.name,
      playersTable.number,
      playersTable.photoMediaId,
      teamsTable.id,
      teamsTable.name,
      teamsTable.slug,
    )
    .orderBy(desc(sql`sum(${matchEventsTable.amount})`))
    .limit(limit);

  const entries = await Promise.all(
    rows.map(async (row) => {
      const photoResult = row.photoMediaId ? await getMediaAsset({ id: row.photoMediaId }) : null;
      const photoUrl = photoResult?.success && photoResult.data ? photoResult.data.url : null;
      return {
        playerId: row.playerId,
        slug: row.slug,
        name: row.name,
        number: row.number,
        photoUrl,
        teamId: row.teamId,
        teamName: row.teamName,
        teamSlug: row.teamSlug,
        goals: clampScore(Number(row.goals) || 0),
      };
    }),
  );

  return entries.filter((entry) => entry.goals > 0);
}
