import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { fixtures as fixturesTable, matchBoosts as matchBoostsTable, matchEvents as matchEventsTable, matches as matchesTable } from "../database/schema";
import { recordEvent } from "./match-events";
import { linkFixtureToMatch } from "./fixtures";
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
    mvpPlayerId: row.mvpPlayerId,
    mvpNote: row.mvpNote,
  };
}

// MVP da partida (súmula em routes/admin/matches, e o passo opcional no controle ao vivo depois de
// encerrar — routes/control/console.tsx) — sempre substitui a escolha anterior (não há histórico de
// MVP por partida, só o atual).
export async function setMatchMvp(matchId: string, playerId: string | null, note: string | null): Promise<MatchSummary> {
  const [row] = await db
    .update(matchesTable)
    .set({ mvpPlayerId: playerId, mvpNote: note })
    .where(eq(matchesTable.id, matchId))
    .returning();
  return rowToSummary(row);
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

// Candidatas pra vincular um fixture (tela de admin/fixtures) — os dois times na partida,
// qualquer ordem/status (o admin decide qual é a certa).
export async function listMatchesBetweenTeams(teamAId: string, teamBId: string): Promise<MatchSummary[]> {
  const rows = await db
    .select()
    .from(matchesTable)
    .where(
      or(
        and(eq(matchesTable.homeTeamId, teamAId), eq(matchesTable.awayTeamId, teamBId)),
        and(eq(matchesTable.homeTeamId, teamBId), eq(matchesTable.awayTeamId, teamAId)),
      ),
    )
    .orderBy(desc(matchesTable.startedAt));
  return rows.map(rowToSummary);
}

export type ManualMatchInput = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  // "YYYY-MM-DD" (input type="date") — null = agora. Sempre local, sem hora (jogo passado, hora
  // exata não importa pra súmula/classificação).
  playedOn: string | null;
};

// Cria uma súmula já ENCERRADA sem passar pelo controle ao vivo — pra jogo que já aconteceu
// (atrasou o cadastro, ou é histórico anterior ao plugin). O placar entra como um evento "goal" de
// amount=N por lado (playerId null) em vez de escrever homeScore/awayScore direto, pra manter o
// mesmo invariante do resto do sistema (placar = soma dos eventos, runtime/match-events.ts) — dá
// pra depois abrir a súmula normal e detalhar/atribuir os gols a jogadores específicos.
export async function createManualMatch(input: ManualMatchInput): Promise<MatchSummary> {
  const playedAt = input.playedOn ? parseLocalDate(input.playedOn) : new Date();

  const [row] = await db
    .insert(matchesTable)
    .values({
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      status: "finished",
      startedAt: playedAt,
      finishedAt: playedAt,
    })
    .returning();

  if (input.homeScore > 0) {
    await recordEvent({ matchId: row.id, kind: "goal", side: "home", amount: input.homeScore });
  }
  if (input.awayScore > 0) {
    await recordEvent({ matchId: row.id, kind: "goal", side: "away", amount: input.awayScore });
  }

  const created = await getMatch(row.id);
  return created!;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0);
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

export type MatchDeleteImpact = { eventCount: number; boostCount: number; fixtureCount: number; isLive: boolean };

export async function getMatchDeleteImpact(id: string): Promise<MatchDeleteImpact> {
  const [match, eventRows, boostRows, fixtureRows] = await Promise.all([
    getMatch(id),
    db.select({ id: matchEventsTable.id }).from(matchEventsTable).where(eq(matchEventsTable.matchId, id)),
    db.select({ id: matchBoostsTable.id }).from(matchBoostsTable).where(eq(matchBoostsTable.matchId, id)),
    db.select({ id: fixturesTable.id }).from(fixturesTable).where(eq(fixturesTable.matchId, id)),
  ]);
  return {
    eventCount: eventRows.length,
    boostCount: boostRows.length,
    fixtureCount: fixtureRows.length,
    isLive: match?.status === "in_progress",
  };
}

export type DeleteMatchResult = { ok: true } | { ok: false; error: string };

// Exclusão de súmula — sem cascade no schema (matches.id é referenciado por match_events/
// match_boosts sem onDelete, e por fixtures.match_id/match_state.current_match_id, nullable), então
// quem apaga daqui precisa desfazer os vínculos na ordem certa antes do delete em si. Bloqueada só
// pra partida em andamento: currentMatchId só aponta pra uma partida "in_progress" (startMatch a
// escreve, endCurrentMatch em runtime/match-actions.ts a limpa ao encerrar/cancelar), então uma
// partida "finished"/"cancelled" nunca é a match_state atual — não há nada pra desfazer ali, só
// direciona o admin pro controle ao vivo (Encerrar/Cancelar) antes de poder excluir.
export async function deleteMatch(id: string): Promise<DeleteMatchResult> {
  const impact = await getMatchDeleteImpact(id);
  if (impact.isLive) {
    return { ok: false, error: "Esta partida está em andamento — encerre ou cancele no controle ao vivo antes de excluir." };
  }

  const linkedFixtures = await db.select({ id: fixturesTable.id }).from(fixturesTable).where(eq(fixturesTable.matchId, id));
  for (const fixture of linkedFixtures) {
    await linkFixtureToMatch(fixture.id, null);
  }

  await db.delete(matchBoostsTable).where(eq(matchBoostsTable.matchId, id));
  await db.delete(matchEventsTable).where(eq(matchEventsTable.matchId, id));
  await db.delete(matchesTable).where(eq(matchesTable.id, id));

  return { ok: true };
}
