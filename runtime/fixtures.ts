import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { fixtures as fixturesTable } from "../database/schema";
import type { Fixture, FixturePhase } from "../contracts/types";

type FixtureRow = typeof fixturesTable.$inferSelect;

// Postgres devolve "time" como "HH:mm:ss" — corta os segundos, que ninguém digita/usa aqui
// (mesmo formato de <input type="time">, "HH:mm").
function trimSeconds(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

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
    scheduledDate: row.scheduledDate,
    scheduledTime: trimSeconds(row.scheduledTime),
    matchId: row.matchId,
    sortOrder: row.sortOrder,
  };
}

// Ordem de apresentação: por data e hora (Postgres já põe NULL — "a definir" — por último num
// ASC), sortOrder só como desempate pra confrontos no mesmo dia/horário ou igualmente sem data
// (ordem que veio do CSV/criação). Pedido explícito: a ordem tem que ser por data, não pela ordem
// de importação.
export async function listFixtures(): Promise<Fixture[]> {
  const rows = await db
    .select()
    .from(fixturesTable)
    .orderBy(asc(fixturesTable.scheduledDate), asc(fixturesTable.scheduledTime), asc(fixturesTable.sortOrder));
  return rows.map(rowToFixture);
}

export async function listFixturesByPhase(phase: FixturePhase): Promise<Fixture[]> {
  const rows = await db
    .select()
    .from(fixturesTable)
    .where(eq(fixturesTable.phase, phase))
    .orderBy(asc(fixturesTable.scheduledDate), asc(fixturesTable.scheduledTime), asc(fixturesTable.sortOrder));
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
  // Colunas separadas (não um timestamp combinado) — ver database/schema/fixtures.ts. scheduledTime
  // sem scheduledDate é descartado na escrita (não faz sentido sozinho).
  scheduledDate: string | null;
  scheduledTime: string | null;
  sortOrder: number;
};

function normalizeSchedule(input: FixtureInput): { scheduledDate: string | null; scheduledTime: string | null } {
  if (!input.scheduledDate) return { scheduledDate: null, scheduledTime: null };
  return { scheduledDate: input.scheduledDate, scheduledTime: input.scheduledTime };
}

export async function createFixture(input: FixtureInput): Promise<Fixture> {
  const [row] = await db
    .insert(fixturesTable)
    .values({ ...input, ...normalizeSchedule(input), updatedAt: new Date() })
    .returning();
  return rowToFixture(row);
}

export async function updateFixture(id: string, input: FixtureInput): Promise<Fixture> {
  const [row] = await db
    .update(fixturesTable)
    .set({ ...input, ...normalizeSchedule(input), updatedAt: new Date() })
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

// Candidato pra auto-link no fim de uma partida (runtime/match-actions.ts, endCurrentMatch) — só
// linka sozinho quando é inequívoco: exatamente um fixture ainda sem match (matchId null) com esse
// par exato de times (mesmo mando de campo). Zero ou mais de um (rematch dentro do campeonato), o
// admin resolve manualmente em /admin/erasto-league/fixtures — mesma garantia contra ambiguidade
// documentada em linkFixtureToMatch.
export async function findUnlinkedFixtureForTeams(homeTeamId: string, awayTeamId: string): Promise<Fixture | null> {
  const rows = await db
    .select()
    .from(fixturesTable)
    .where(and(isNull(fixturesTable.matchId), eq(fixturesTable.homeTeamId, homeTeamId), eq(fixturesTable.awayTeamId, awayTeamId)));
  return rows.length === 1 ? rowToFixture(rows[0]) : null;
}
