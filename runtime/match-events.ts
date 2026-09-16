import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { matchEvents as matchEventsTable, matches as matchesTable, matchState as matchStateTable } from "../database/schema";
import { clampScore } from "../shared/score";
import { readMatchState, writeMatchState } from "./match-store";
import type { EventKind, MatchEvent, MatchSide, MatchState } from "../contracts/types";

type EventRow = typeof matchEventsTable.$inferSelect;

function rowToEvent(row: EventRow): MatchEvent {
  return {
    id: row.id,
    matchId: row.matchId,
    kind: row.kind,
    side: row.side,
    playerId: row.playerId,
    amount: row.amount,
    minuteMs: row.minuteMs ?? null,
    createdAt: row.createdAt.getTime(),
  };
}

// Placar de um lado = soma dos eventos "goal" daquele lado — recalculado (não incrementado) a cada
// escrita, inclusive delete/edit na súmula, pra nunca divergir entre matches/match_state/eventos.
async function recalcAndSync(matchId: string): Promise<void> {
  const sums = await db
    .select({ side: matchEventsTable.side, total: sql<string>`coalesce(sum(${matchEventsTable.amount}), 0)` })
    .from(matchEventsTable)
    .where(and(eq(matchEventsTable.matchId, matchId), eq(matchEventsTable.kind, "goal")))
    .groupBy(matchEventsTable.side);

  const totals: Record<MatchSide, number> = { home: 0, away: 0 };
  for (const row of sums) {
    if (row.side === "home" || row.side === "away") {
      totals[row.side] = clampScore(Number(row.total) || 0);
    }
  }

  await db.update(matchesTable).set({ homeScore: totals.home, awayScore: totals.away }).where(eq(matchesTable.id, matchId));

  const [state] = await db.select().from(matchStateTable).where(eq(matchStateTable.id, "singleton"));
  if (state?.currentMatchId === matchId) {
    await writeMatchState({ homeScore: totals.home, awayScore: totals.away });
  }
}

export type RecordEventInput = {
  matchId: string;
  kind: EventKind;
  side: MatchSide;
  playerId?: string | null;
  // só relevante pra kind "goal" — 1 (gol), 0.5 (meio gol) ou negativo (correção −1/−0,5).
  amount?: number;
  minuteMs?: number | null;
};

// Único ponto de escrita de gol/cartão/falta — usado pelo controle ao vivo (playerId geralmente
// null no momento do tap) e pela súmula (playerId sempre escolhido). Devolve o MatchState já
// atualizado quando o evento é da partida em andamento (senão, undefined — súmula de partida
// antiga não mexe no que está ao vivo).
export async function recordEvent(input: RecordEventInput): Promise<{ eventId: string; state: MatchState }> {
  const [row] = await db
    .insert(matchEventsTable)
    .values({
      matchId: input.matchId,
      kind: input.kind,
      side: input.side,
      playerId: input.playerId ?? null,
      amount: input.kind === "goal" ? (input.amount ?? 1) : 1,
      minuteMs: input.minuteMs ?? null,
    })
    .returning();

  await recalcAndSync(input.matchId);
  return { eventId: row.id, state: await readMatchState() };
}

export async function attributePlayer(eventId: string, playerId: string | null): Promise<void> {
  await db.update(matchEventsTable).set({ playerId }).where(eq(matchEventsTable.id, eventId));
}

export async function listEventsByMatch(matchId: string): Promise<MatchEvent[]> {
  const rows = await db
    .select()
    .from(matchEventsTable)
    .where(eq(matchEventsTable.matchId, matchId))
    .orderBy(asc(matchEventsTable.createdAt));
  return rows.map(rowToEvent);
}

export type EventPatch = { kind?: EventKind; side?: MatchSide; playerId?: string | null; amount?: number };

export async function updateEvent(eventId: string, patch: EventPatch): Promise<void> {
  const [existing] = await db.select().from(matchEventsTable).where(eq(matchEventsTable.id, eventId));
  if (!existing) return;
  await db.update(matchEventsTable).set(patch).where(eq(matchEventsTable.id, eventId));
  await recalcAndSync(existing.matchId);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const [existing] = await db.select().from(matchEventsTable).where(eq(matchEventsTable.id, eventId));
  if (!existing) return;
  await db.delete(matchEventsTable).where(eq(matchEventsTable.id, eventId));
  await recalcAndSync(existing.matchId);
}
