import { desc, eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { matches as matchesTable } from "../database/schema";
import type { MatchSummary } from "../contracts/types";

type MatchRow = typeof matchesTable.$inferSelect;

function rowToSummary(row: MatchRow): MatchSummary {
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
