import { asc, eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { fixtures as fixturesTable } from "../database/schema";
import type { Fixture, FixturePhase } from "../contracts/types";

type FixtureRow = typeof fixturesTable.$inferSelect;

function rowToFixture(row: FixtureRow): Fixture {
  return {
    id: row.id,
    phase: row.phase,
    groupName: row.groupName,
    roundLabel: row.roundLabel,
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    homeLabel: row.homeLabel,
    awayLabel: row.awayLabel,
    scheduledAt: row.scheduledAt?.getTime() ?? null,
    matchId: row.matchId,
    sortOrder: row.sortOrder,
  };
}

// Ordem de apresentação: por data (Postgres já põe NULL — "a definir" — por último num ASC),
// sortOrder só como desempate pra confrontos no mesmo dia ou igualmente sem data (ordem que veio
// do CSV/criação). Pedido explícito: a ordem tem que ser por data, não pela ordem de importação.
export async function listFixtures(): Promise<Fixture[]> {
  const rows = await db.select().from(fixturesTable).orderBy(asc(fixturesTable.scheduledAt), asc(fixturesTable.sortOrder));
  return rows.map(rowToFixture);
}

export async function listFixturesByPhase(phase: FixturePhase): Promise<Fixture[]> {
  const rows = await db
    .select()
    .from(fixturesTable)
    .where(eq(fixturesTable.phase, phase))
    .orderBy(asc(fixturesTable.scheduledAt), asc(fixturesTable.sortOrder));
  return rows.map(rowToFixture);
}

export async function getFixture(id: string): Promise<Fixture | null> {
  const [row] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, id));
  return row ? rowToFixture(row) : null;
}

export type FixtureInput = {
  phase: FixturePhase;
  groupName: string | null;
  roundLabel: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string | null;
  awayLabel: string | null;
  scheduledAt: number | null;
  sortOrder: number;
};

export async function createFixture(input: FixtureInput): Promise<Fixture> {
  const [row] = await db
    .insert(fixturesTable)
    .values({ ...input, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null, updatedAt: new Date() })
    .returning();
  return rowToFixture(row);
}

export async function updateFixture(id: string, input: FixtureInput): Promise<Fixture> {
  const [row] = await db
    .update(fixturesTable)
    .set({ ...input, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null, updatedAt: new Date() })
    .where(eq(fixturesTable.id, id))
    .returning();
  return rowToFixture(row);
}

export async function deleteFixture(id: string): Promise<void> {
  await db.delete(fixturesTable).where(eq(fixturesTable.id, id));
}

// Vínculo manual "este confronto já foi jogado, é esta partida" — feito pela tela de fixtures do
// admin (não automático: times podem se enfrentar mais de uma vez, então casar por par de times +
// data mais próxima é frágil demais pra confiar sem revisão humana).
export async function linkFixtureToMatch(fixtureId: string, matchId: string | null): Promise<Fixture> {
  const [row] = await db.update(fixturesTable).set({ matchId, updatedAt: new Date() }).where(eq(fixturesTable.id, fixtureId)).returning();
  return rowToFixture(row);
}

export async function deleteAllFixtures(): Promise<void> {
  await db.delete(fixturesTable);
}

// Correção pontual (uma vez só) do bug de fuso: confrontos importados/editados antes de
// shared/timezone.ts existir ficaram gravados 3h adiantados (CSV import e o form de edição
// interpretavam "10:30" como 10:30 UTC em vez de horário de Brasília). Soma 3h em todo
// scheduledAt já gravado, sem mexer em mais nada (grupo/rodada/times/vínculo com partida
// continuam intactos) — chamado por um botão só-uso-único em /admin/erasto-league/fixtures.
export async function shiftAllScheduledAtBy3Hours(): Promise<number> {
  const rows = await db.select({ id: fixturesTable.id, scheduledAt: fixturesTable.scheduledAt }).from(fixturesTable);
  const toFix = rows.filter((row) => row.scheduledAt !== null);

  for (const row of toFix) {
    const corrected = new Date(row.scheduledAt!.getTime() + 3 * 60 * 60 * 1000);
    await db.update(fixturesTable).set({ scheduledAt: corrected, updatedAt: new Date() }).where(eq(fixturesTable.id, row.id));
  }

  return toFix.length;
}
