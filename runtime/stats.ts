import { and, count, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { matchEvents as matchEventsTable, matches as matchesTable, players as playersTable, teams as teamsTable } from "../database/schema";
import { rowToSummary } from "./matches";
import { clampScore } from "../shared/score";
import type { MatchSummary } from "../contracts/types";

// Stats de um jogador (perfil público, Fase 4) — só eventos de partidas encerradas contam (mesmo
// filtro de runtime/standings.ts). "Jogos" vem das partidas ENCERRADAS DO TIME do jogador, não de
// partidas em que ele teve algum evento atribuído: não existe conceito de escalação/titular no
// modelo (só evento), e a maioria dos gols/cartões é registrada no controle ao vivo sem escolher o
// jogador na hora (atribuição fica pra súmula, opcional) — contar só eventos atribuídos deixava
// "Jogos" (e o card de stats inteiro, condicionado a matchesPlayed > 0) zerado pra praticamente todo
// jogador que não fez gol/cartão, mesmo tendo disputado o campeonato inteiro.
export type PlayerStats = {
  matchesPlayed: number;
  goals: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  mvpCount: number;
};

export async function getPlayerStats(playerId: string, teamId: string): Promise<PlayerStats> {
  const [eventRows, mvpRows, matchesPlayedRows] = await Promise.all([
    db
      .select({ kind: matchEventsTable.kind, amount: matchEventsTable.amount })
      .from(matchEventsTable)
      .innerJoin(matchesTable, eq(matchEventsTable.matchId, matchesTable.id))
      .where(and(eq(matchEventsTable.playerId, playerId), eq(matchesTable.status, "finished"))),
    db
      .select({ count: count() })
      .from(matchesTable)
      .where(and(eq(matchesTable.mvpPlayerId, playerId), eq(matchesTable.status, "finished"))),
    db
      .select({ count: count() })
      .from(matchesTable)
      .where(and(eq(matchesTable.status, "finished"), or(eq(matchesTable.homeTeamId, teamId), eq(matchesTable.awayTeamId, teamId)))),
  ]);

  const stats: PlayerStats = {
    matchesPlayed: matchesPlayedRows[0]?.count ?? 0,
    goals: 0,
    yellowCards: 0,
    redCards: 0,
    fouls: 0,
    mvpCount: mvpRows[0]?.count ?? 0,
  };
  for (const row of eventRows) {
    if (row.kind === "goal") stats.goals = clampScore(stats.goals + row.amount);
    else if (row.kind === "yellow_card") stats.yellowCards += 1;
    else if (row.kind === "red_card") stats.redCards += 1;
    else if (row.kind === "foul") stats.fouls += 1;
  }
  return stats;
}

// Partidas em que o jogador foi o MVP oficial (súmula/controle) — lista de prêmios do perfil
// público, mesmo filtro de getPlayerStats.mvpCount (só encerradas). Mais recente primeiro.
export async function listMvpMatchesForPlayer(playerId: string): Promise<MatchSummary[]> {
  const rows = await db
    .select()
    .from(matchesTable)
    .where(and(eq(matchesTable.mvpPlayerId, playerId), eq(matchesTable.status, "finished")))
    .orderBy(desc(matchesTable.startedAt));
  return rows.map(rowToSummary);
}

// Últimos jogos de um jogador — mesma fonte de runtime/matches.ts listRecentMatchesForTeam (todas
// as partidas encerradas DO TIME dele, não só as que têm algum evento seu atribuído — mesmo motivo
// de getPlayerStats acima). Reaproveita a mesma query, sem duplicar.
export async function listRecentMatchesForPlayer(teamId: string, limit = 5): Promise<MatchSummary[]> {
  const rows = await db
    .select()
    .from(matchesTable)
    .where(and(eq(matchesTable.status, "finished"), or(eq(matchesTable.homeTeamId, teamId), eq(matchesTable.awayTeamId, teamId))))
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
// limit omitido = lista inteira (usado por /erasto-league/artilharia, routes/artillery-public —
// o bloco erasto-league.top-scorers sempre passa um limit).
export async function listTopScorers(limit?: number): Promise<ScorerEntry[]> {
  const base = db
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
    .orderBy(desc(sql`sum(${matchEventsTable.amount})`));

  const rows = typeof limit === "number" ? await base.limit(limit) : await base;

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

export type MvpEntry = {
  playerId: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  teamId: string;
  teamName: string;
  teamSlug: string;
  mvpCount: number;
};

// Ranking de MVPs (bloco erasto-league.mvp-scorers) — mesma filosofia/estrutura de listTopScorers,
// mas contando partidas em que o jogador foi escolhido MVP (matches.mvp_player_id) em vez de somar
// gols. limit omitido = lista inteira (usado por /erasto-league/mvps, routes/mvp-public).
export async function listTopMvps(limit?: number): Promise<MvpEntry[]> {
  const base = db
    .select({
      playerId: playersTable.id,
      slug: playersTable.slug,
      name: playersTable.name,
      photoMediaId: playersTable.photoMediaId,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      teamSlug: teamsTable.slug,
      mvpCount: count(matchesTable.id),
    })
    .from(matchesTable)
    .innerJoin(playersTable, eq(matchesTable.mvpPlayerId, playersTable.id))
    .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(and(isNotNull(matchesTable.mvpPlayerId), eq(matchesTable.status, "finished")))
    .groupBy(playersTable.id, playersTable.slug, playersTable.name, playersTable.photoMediaId, teamsTable.id, teamsTable.name, teamsTable.slug)
    .orderBy(desc(count(matchesTable.id)));

  const rows = typeof limit === "number" ? await base.limit(limit) : await base;

  return Promise.all(
    rows.map(async (row) => {
      const photoResult = row.photoMediaId ? await getMediaAsset({ id: row.photoMediaId }) : null;
      const photoUrl = photoResult?.success && photoResult.data ? photoResult.data.url : null;
      return {
        playerId: row.playerId,
        slug: row.slug,
        name: row.name,
        photoUrl,
        teamId: row.teamId,
        teamName: row.teamName,
        teamSlug: row.teamSlug,
        mvpCount: row.mvpCount,
      };
    }),
  );
}
