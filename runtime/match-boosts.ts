import { asc, eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { matchBoosts as matchBoostsTable } from "../database/schema";
import type { MatchSide, PowerBoostKey, PowerBoostUse } from "../contracts/types";

type BoostRow = typeof matchBoostsTable.$inferSelect;

function rowToUse(row: BoostRow): PowerBoostUse {
  return {
    id: row.id,
    matchId: row.matchId,
    side: row.side,
    boostKey: row.boostKey,
    minuteMs: row.minuteMs ?? null,
    createdAt: row.createdAt.getTime(),
  };
}

export type RecordBoostUseInput = {
  matchId: string;
  side: MatchSide;
  boostKey: PowerBoostKey;
  minuteMs?: number | null;
};

// Único ponto de escrita — usado pelo controle ao vivo e (correção/registro tardio) pela súmula.
export async function recordBoostUse(input: RecordBoostUseInput): Promise<PowerBoostUse> {
  const [row] = await db
    .insert(matchBoostsTable)
    .values({ matchId: input.matchId, side: input.side, boostKey: input.boostKey, minuteMs: input.minuteMs ?? null })
    .returning();
  return rowToUse(row);
}

export async function listBoostsByMatch(matchId: string): Promise<PowerBoostUse[]> {
  const rows = await db.select().from(matchBoostsTable).where(eq(matchBoostsTable.matchId, matchId)).orderBy(asc(matchBoostsTable.createdAt));
  return rows.map(rowToUse);
}

// Correção na súmula — "usei sem querer" / duplicado.
export async function deleteBoostUse(id: string): Promise<void> {
  await db.delete(matchBoostsTable).where(eq(matchBoostsTable.id, id));
}
