import { and, asc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { fixtures as fixturesTable, matches as matchesTable } from "../database/schema";
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

// Candidato pra auto-link no fim de uma partida (runtime/match-actions.ts endCurrentMatch, e
// runtime/matches.ts createManualMatch pra súmula de jogo atrasado) — só linka sozinho quando é
// inequívoco: exatamente um fixture ainda sem match (matchId null) com esse par de times, EM
// QUALQUER ORDEM de mando de campo. Mando de campo na fixture é só informativo (quem definiu o
// confronto), não precisa bater com quem o controle marcou como "casa" ao iniciar a partida —
// exigir a mesma ordem deixava esse jogo preso como "próximo jogo"/sem resultado na agenda pra
// sempre sempre que o operador invertia os lados no controle ao vivo. Zero ou mais de um candidato
// (rematch dentro do campeonato), o admin resolve manualmente em /admin/erasto-league/fixtures —
// mesma garantia contra ambiguidade documentada em linkFixtureToMatch.
export async function findUnlinkedFixtureForTeams(teamAId: string, teamBId: string): Promise<Fixture | null> {
  const rows = await db
    .select()
    .from(fixturesTable)
    .where(
      and(
        isNull(fixturesTable.matchId),
        or(
          and(eq(fixturesTable.homeTeamId, teamAId), eq(fixturesTable.awayTeamId, teamBId)),
          and(eq(fixturesTable.homeTeamId, teamBId), eq(fixturesTable.awayTeamId, teamAId)),
        ),
      ),
    );
  return rows.length === 1 ? rowToFixture(rows[0]) : null;
}

export type AutoLinkFixturesResult = { linked: number; skipped: number };

// Vínculo em massa (botão "Vincular automaticamente" em /admin/erasto-league/fixtures) — mesmo
// critério de findUnlinkedFixtureForTeams (par de times em qualquer ordem, só quando é
// inequívoco), só que na direção inversa: parte de cada CONFRONTO ainda sem partida e procura uma
// partida encerrada livre (não vinculada a nenhum outro confronto) com esse par de times. Cobre
// partidas que já existiam antes do auto-link automático (endCurrentMatch/createManualMatch), ou
// que passaram por ele sem achar candidato único na hora (ex.: outro confronto do mesmo par ainda
// não tinha sido resolvido). Confronto sem os dois times cadastrados (rótulo livre tipo "Vencedor
// Grupo A") ou com zero/mais de uma partida candidata continua exigindo escolha manual — mesma
// garantia contra ambiguidade de sempre, só que reportada em vez de silenciosa.
export async function autoLinkAllFixtures(): Promise<AutoLinkFixturesResult> {
  const [pendingFixtures, linkedRows, finishedMatches] = await Promise.all([
    db.select().from(fixturesTable).where(isNull(fixturesTable.matchId)),
    db.select({ matchId: fixturesTable.matchId }).from(fixturesTable).where(isNotNull(fixturesTable.matchId)),
    db.select().from(matchesTable).where(eq(matchesTable.status, "finished")),
  ]);

  const linkedMatchIds = new Set(linkedRows.map((row) => row.matchId).filter((id): id is string => Boolean(id)));

  let linked = 0;
  let skipped = 0;
  for (const fixture of pendingFixtures) {
    if (!fixture.homeTeamId || !fixture.awayTeamId) {
      skipped += 1;
      continue;
    }

    const candidates = finishedMatches.filter(
      (match) =>
        !linkedMatchIds.has(match.id) &&
        ((match.homeTeamId === fixture.homeTeamId && match.awayTeamId === fixture.awayTeamId) ||
          (match.homeTeamId === fixture.awayTeamId && match.awayTeamId === fixture.homeTeamId)),
    );

    if (candidates.length !== 1) {
      skipped += 1;
      continue;
    }

    await db.update(fixturesTable).set({ matchId: candidates[0].id, updatedAt: new Date() }).where(eq(fixturesTable.id, fixture.id));
    linkedMatchIds.add(candidates[0].id);
    linked += 1;
  }

  return { linked, skipped };
}
