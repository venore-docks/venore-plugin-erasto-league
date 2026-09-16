import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { matches as matchesTable } from "../database/schema";
import type { MatchSummary } from "../contracts/types";

type MatchRow = typeof matchesTable.$inferSelect;

// Exportado pra runtime/stats.ts (histórico de partidas de um jogador) reusar o mesmo mapper em
// vez de duplicar.
export function rowToSummary(row: MatchRow): MatchSummary {
  return {
    id: row.id,
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    label: row.label,
    status: row.status,
    startedAt: row.startedAt.getTime(),
    finishedAt: row.finishedAt?.getTime() ?? null,
  };
}

// Lista todas as partidas (súmula: /admin/erasto-league/matches) — mais recente primeiro.
export async function listMatches(): Promise<MatchSummary[]> {
  const rows = await db.select().from(matchesTable).orderBy(desc(matchesTable.startedAt));
  return rows.map(rowToSummary);
}

export async function listFinishedMatches(): Promise<MatchSummary[]> {
  const rows = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.status, "finished"))
    .orderBy(desc(matchesTable.finishedAt));
  return rows.map(rowToSummary);
}

export async function getMatch(id: string): Promise<MatchSummary | null> {
  const [row] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
  return row ? rowToSummary(row) : null;
}

// Últimos jogos de um time (perfil público, Fase 4) — só encerradas, mais recente primeiro.
export async function listRecentMatchesForTeam(teamId: string, limit = 5): Promise<MatchSummary[]> {
  const rows = await db
    .select()
    .from(matchesTable)
    .where(and(eq(matchesTable.status, "finished"), or(eq(matchesTable.homeTeamId, teamId), eq(matchesTable.awayTeamId, teamId))))
    .orderBy(desc(matchesTable.finishedAt))
    .limit(limit);
  return rows.map(rowToSummary);
}
