import { and, count, desc, eq, gt, inArray, isNotNull, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@venore/plugin-sdk";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import {
  favoriteTeamVotes as favoriteTeamVotesTable,
  matchFanVotes as matchFanVotesTable,
  matches as matchesTable,
  players as playersTable,
  teams as teamsTable,
} from "../database/schema";
import { rowToSummary } from "./matches";
import {
  buildAuditGroups,
  computeVoteShares,
  isVoteWindowOpen,
  resolveMatchVoteWindow,
  resolveTopChoiceIds,
  type AuditGroup,
  type VoteCount,
  type VoteWindow,
} from "../shared/fan-votes";
import type { MatchSummary } from "../contracts/types";
import type { VoterIdentity } from "./voter";

// Votação da torcida — "Jogador da Torcida" (um voto por aparelho por partida, janela até N horas
// depois do jogo) e "Time favorito" (um voto por aparelho na temporada, pode trocar). Regras puras
// (janela, percentuais, heurística de auditoria) em shared/fan-votes.ts; identidade do aparelho em
// runtime/voter.ts. Sem autorização aqui: voto é público de propósito, e as portas de admin
// (anular/restaurar/zerar) checam getPluginAdminPageData antes de chamar.

const HOUR_MS = 60 * 60 * 1000;

async function resolveMediaUrl(mediaId: string | null): Promise<string | null> {
  if (!mediaId) return null;
  const result = await getMediaAsset({ id: mediaId });
  return result.success && result.data ? result.data.url : null;
}

// Uma linha do resultado, já pronta pra exibir (site, TV, admin) — jogador (foto + time) ou time
// (brasão + cor).
export type FanVoteResultEntry = {
  id: string;
  name: string;
  imageUrl: string | null;
  // Jogador: nome do time. Time: null.
  subtitle: string | null;
  href: string;
  color: string | null;
  votes: number;
  percent: number;
};

// Quem está no topo (todos, em caso de empate — shared/fan-votes.ts resolveTopChoiceIds), calculado
// sobre a lista inteira, não só sobre as `entries` cortadas pelo limit.
export type FanVoteLeader = { id: string; name: string; votes: number };

export type FanVoteResults = { totalVotes: number; entries: FanVoteResultEntry[]; leaders: FanVoteLeader[] };

const EMPTY_RESULTS: FanVoteResults = { totalVotes: 0, entries: [], leaders: [] };

function pickLeaders(shares: VoteCount[], nameById: Map<string, string>): FanVoteLeader[] {
  const leaderIds = new Set(resolveTopChoiceIds(shares));
  return shares.filter((share) => leaderIds.has(share.id)).map((share) => ({ id: share.id, name: nameById.get(share.id) ?? "—", votes: share.votes }));
}

export type CastVoteResult =
  | { ok: true; choiceId: string; changed: boolean }
  | { ok: false; code: "closed" | "invalid_choice" | "already_voted" | "not_found"; message: string; choiceId?: string };

// ---------------------------------------------------------------------------------------------
// Jogador da Torcida (por partida)
// ---------------------------------------------------------------------------------------------

export type MatchVotePoll = {
  match: MatchSummary;
  window: VoteWindow | null;
  isOpen: boolean;
};

export function toMatchVotePoll(match: MatchSummary, windowHours: number, now = Date.now()): MatchVotePoll {
  const window = resolveMatchVoteWindow(match, windowHours);
  return { match, window, isOpen: isVoteWindowOpen(window, now) };
}

// Partidas com votação aberta agora: em andamento, ou encerradas há menos de windowHours. Mais
// recente primeiro (o hub /erasto-league/votar destaca a primeira).
export async function listOpenMatchPolls(windowHours: number, now = Date.now()): Promise<MatchVotePoll[]> {
  const closedBefore = new Date(now - windowHours * HOUR_MS);
  const rows = await db
    .select()
    .from(matchesTable)
    .where(
      or(eq(matchesTable.status, "in_progress"), and(eq(matchesTable.status, "finished"), gt(matchesTable.finishedAt, closedBefore))),
    )
    .orderBy(desc(matchesTable.startedAt));
  return rows.map((row) => toMatchVotePoll(rowToSummary(row), windowHours, now)).filter((poll) => poll.isOpen);
}

// Partida em destaque pro bloco do site / TV / overlay: a votação aberta mais recente; sem nenhuma
// aberta, a última partida que TEVE voto (mostra o resultado final). null = nunca houve votação.
export async function getFeaturedMatchPoll(windowHours: number, now = Date.now()): Promise<MatchVotePoll | null> {
  const open = await listOpenMatchPolls(windowHours, now);
  if (open.length > 0) return open[0];

  const [row] = await db
    .select()
    .from(matchesTable)
    .where(
      and(
        eq(matchesTable.status, "finished"),
        sql`exists (select 1 from ${matchFanVotesTable} where ${matchFanVotesTable.matchId} = ${matchesTable.id} and ${matchFanVotesTable.voidedAt} is null)`,
      ),
    )
    .orderBy(desc(matchesTable.finishedAt))
    .limit(1);
  return row ? toMatchVotePoll(rowToSummary(row), windowHours, now) : null;
}

// Resultado (parcial ou final) de uma partida — só votos não anulados. limit corta a lista exibida,
// mas o percentual é sempre sobre o total (inclusive quem ficou de fora do corte).
export async function getMatchFanVoteResults(matchId: string, limit?: number): Promise<FanVoteResults> {
  const rows = await db
    .select({
      playerId: playersTable.id,
      slug: playersTable.slug,
      name: playersTable.name,
      photoMediaId: playersTable.photoMediaId,
      teamName: teamsTable.name,
      teamColor: teamsTable.primaryColor,
      votes: count(matchFanVotesTable.id),
    })
    .from(matchFanVotesTable)
    .innerJoin(playersTable, eq(matchFanVotesTable.playerId, playersTable.id))
    .innerJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(and(eq(matchFanVotesTable.matchId, matchId), isNull(matchFanVotesTable.voidedAt)))
    .groupBy(playersTable.id, playersTable.slug, playersTable.name, playersTable.photoMediaId, teamsTable.name, teamsTable.primaryColor);

  if (rows.length === 0) return EMPTY_RESULTS;

  // Desempate estável por nome antes do sort por votos (computeVoteShares preserva a ordem de
  // entrada em empate).
  const byName = [...rows].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const shares = computeVoteShares(byName.map((row) => ({ id: row.playerId, votes: row.votes })));
  const rowById = new Map(rows.map((row) => [row.playerId, row]));
  const visible = typeof limit === "number" ? shares.slice(0, limit) : shares;

  const entries = await Promise.all(
    visible.map(async (share) => {
      const row = rowById.get(share.id)!;
      return {
        id: row.playerId,
        name: row.name,
        imageUrl: await resolveMediaUrl(row.photoMediaId),
        subtitle: row.teamName,
        href: `/erasto-league/players/${row.slug}`,
        color: row.teamColor,
        votes: share.votes,
        percent: share.percent,
      };
    }),
  );

  return {
    totalVotes: shares.reduce((sum, share) => sum + share.votes, 0),
    entries,
    leaders: pickLeaders(shares, new Map(rows.map((row) => [row.playerId, row.name]))),
  };
}

// Partidas em que o jogador foi o Jogador da Torcida — só votação JÁ ENCERRADA (parcial não é
// prêmio), ele no topo dos votos válidos, e empate no topo contando pra todos os empatados
// (shared/fan-votes.ts resolveTopChoiceIds — mesma regra da página do jogo). Mais recente primeiro.
export async function listFanVoteAwardsForPlayer(playerId: string, windowHours: number, now = Date.now()): Promise<MatchSummary[]> {
  const closedBefore = new Date(now - windowHours * HOUR_MS);
  // Candidatas: partidas encerradas há mais de windowHours em que ele teve ao menos 1 voto válido
  // (súmula manual sem finishedAt fecha a contar do início, igual a resolveMatchVoteWindow).
  const candidates = await db
    .selectDistinct({ matchId: matchFanVotesTable.matchId })
    .from(matchFanVotesTable)
    .innerJoin(matchesTable, eq(matchFanVotesTable.matchId, matchesTable.id))
    .where(
      and(
        eq(matchFanVotesTable.playerId, playerId),
        isNull(matchFanVotesTable.voidedAt),
        eq(matchesTable.status, "finished"),
        or(lte(matchesTable.finishedAt, closedBefore), and(isNull(matchesTable.finishedAt), lte(matchesTable.startedAt, closedBefore))),
      ),
    );
  if (candidates.length === 0) return [];

  const counts = await db
    .select({ matchId: matchFanVotesTable.matchId, playerId: matchFanVotesTable.playerId, votes: count(matchFanVotesTable.id) })
    .from(matchFanVotesTable)
    .where(and(inArray(matchFanVotesTable.matchId, candidates.map((row) => row.matchId)), isNull(matchFanVotesTable.voidedAt)))
    .groupBy(matchFanVotesTable.matchId, matchFanVotesTable.playerId);

  const countsByMatch = new Map<string, VoteCount[]>();
  for (const row of counts) {
    const list = countsByMatch.get(row.matchId) ?? [];
    list.push({ id: row.playerId, votes: row.votes });
    countsByMatch.set(row.matchId, list);
  }
  const wonMatchIds = [...countsByMatch].filter(([, list]) => resolveTopChoiceIds(list).includes(playerId)).map(([matchId]) => matchId);
  if (wonMatchIds.length === 0) return [];

  const rows = await db.select().from(matchesTable).where(inArray(matchesTable.id, wonMatchIds)).orderBy(desc(matchesTable.startedAt));
  return rows.map(rowToSummary);
}

// Em quem ESTE aparelho votou nesta partida (inclusive voto anulado — quem votou não fica sabendo
// que foi anulado, e continua sem poder votar de novo).
export async function getVoterMatchChoice(matchId: string, voterKey: string | null): Promise<string | null> {
  if (!voterKey) return null;
  const [row] = await db
    .select({ playerId: matchFanVotesTable.playerId })
    .from(matchFanVotesTable)
    .where(and(eq(matchFanVotesTable.matchId, matchId), eq(matchFanVotesTable.voterKey, voterKey)));
  return row?.playerId ?? null;
}

export async function castMatchFanVote(input: {
  matchId: string;
  playerId: string;
  voter: VoterIdentity;
  windowHours: number;
  now?: number;
}): Promise<CastVoteResult> {
  const now = input.now ?? Date.now();
  const [matchRow] = await db.select().from(matchesTable).where(eq(matchesTable.id, input.matchId));
  if (!matchRow) {
    return { ok: false, code: "not_found", message: "Partida não encontrada." };
  }

  const poll = toMatchVotePoll(rowToSummary(matchRow), input.windowHours, now);
  if (!poll.isOpen) {
    return { ok: false, code: "closed", message: "A votação deste jogo já foi encerrada." };
  }

  // Só jogador de um dos dois times da partida (elenco atual — o mesmo que a página de voto lista).
  const [player] = await db
    .select({ id: playersTable.id, teamId: playersTable.teamId })
    .from(playersTable)
    .where(eq(playersTable.id, input.playerId));
  if (!player || (player.teamId !== matchRow.homeTeamId && player.teamId !== matchRow.awayTeamId)) {
    return { ok: false, code: "invalid_choice", message: "Esse jogador não está em nenhum dos dois times deste jogo." };
  }

  const inserted = await db
    .insert(matchFanVotesTable)
    .values({
      matchId: input.matchId,
      playerId: input.playerId,
      voterKey: input.voter.voterKey,
      ipHash: input.voter.ipHash,
      uaHash: input.voter.uaHash,
    })
    .onConflictDoNothing({ target: [matchFanVotesTable.matchId, matchFanVotesTable.voterKey] })
    .returning({ id: matchFanVotesTable.id });

  if (inserted.length === 0) {
    const existing = await getVoterMatchChoice(input.matchId, input.voter.voterKey);
    return {
      ok: false,
      code: "already_voted",
      message: "Este aparelho já votou neste jogo.",
      choiceId: existing ?? undefined,
    };
  }

  return { ok: true, choiceId: input.playerId, changed: false };
}

// ---------------------------------------------------------------------------------------------
// Time favorito (temporada)
// ---------------------------------------------------------------------------------------------

export async function getFavoriteTeamResults(limit?: number): Promise<FanVoteResults> {
  const rows = await db
    .select({
      teamId: teamsTable.id,
      slug: teamsTable.slug,
      name: teamsTable.name,
      crestMediaId: teamsTable.crestMediaId,
      color: teamsTable.primaryColor,
      votes: count(favoriteTeamVotesTable.id),
    })
    .from(favoriteTeamVotesTable)
    .innerJoin(teamsTable, eq(favoriteTeamVotesTable.teamId, teamsTable.id))
    .where(isNull(favoriteTeamVotesTable.voidedAt))
    .groupBy(teamsTable.id, teamsTable.slug, teamsTable.name, teamsTable.crestMediaId, teamsTable.primaryColor);

  if (rows.length === 0) return EMPTY_RESULTS;

  const byName = [...rows].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const shares = computeVoteShares(byName.map((row) => ({ id: row.teamId, votes: row.votes })));
  const rowById = new Map(rows.map((row) => [row.teamId, row]));
  const visible = typeof limit === "number" ? shares.slice(0, limit) : shares;

  const entries = await Promise.all(
    visible.map(async (share) => {
      const row = rowById.get(share.id)!;
      return {
        id: row.teamId,
        name: row.name,
        imageUrl: await resolveMediaUrl(row.crestMediaId),
        subtitle: null,
        href: `/erasto-league/teams/${row.slug}`,
        color: row.color,
        votes: share.votes,
        percent: share.percent,
      };
    }),
  );

  return {
    totalVotes: shares.reduce((sum, share) => sum + share.votes, 0),
    entries,
    leaders: pickLeaders(shares, new Map(rows.map((row) => [row.teamId, row.name]))),
  };
}

export async function getVoterFavoriteTeam(voterKey: string | null): Promise<string | null> {
  if (!voterKey) return null;
  const [row] = await db
    .select({ teamId: favoriteTeamVotesTable.teamId })
    .from(favoriteTeamVotesTable)
    .where(eq(favoriteTeamVotesTable.voterKey, voterKey));
  return row?.teamId ?? null;
}

// Upsert por aparelho: votar de novo TROCA o voto (pedido: pode trocar enquanto aberta). voidedAt
// nunca é tocado aqui — voto anulado pelo admin continua anulado mesmo se o aparelho "trocar".
export async function castFavoriteTeamVote(input: { teamId: string; voter: VoterIdentity; isOpen: boolean }): Promise<CastVoteResult> {
  if (!input.isOpen) {
    return { ok: false, code: "closed", message: "A votação do time favorito está fechada." };
  }

  const [team] = await db.select({ id: teamsTable.id }).from(teamsTable).where(eq(teamsTable.id, input.teamId));
  if (!team) {
    return { ok: false, code: "invalid_choice", message: "Time não encontrado." };
  }

  const previous = await getVoterFavoriteTeam(input.voter.voterKey);
  const now = new Date();
  await db
    .insert(favoriteTeamVotesTable)
    .values({
      teamId: input.teamId,
      voterKey: input.voter.voterKey,
      ipHash: input.voter.ipHash,
      uaHash: input.voter.uaHash,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: favoriteTeamVotesTable.voterKey,
      set: { teamId: input.teamId, ipHash: input.voter.ipHash, uaHash: input.voter.uaHash, updatedAt: now },
    });

  return { ok: true, choiceId: input.teamId, changed: previous !== null && previous !== input.teamId };
}

// Nova temporada: apaga TODOS os votos de time favorito (admin, com confirmação).
export async function resetFavoriteTeamVotes(): Promise<number> {
  const deleted = await db.delete(favoriteTeamVotesTable).returning({ id: favoriteTeamVotesTable.id });
  return deleted.length;
}

// ---------------------------------------------------------------------------------------------
// Auditoria (admin) — agrupa por IP, anula/restaura em lote. Nada é anulado automaticamente.
// ---------------------------------------------------------------------------------------------

export type VoteAudit = {
  totalVotes: number;
  voidedVotes: number;
  groups: AuditGroup[];
  // Rótulo de cada choiceId que aparece nos grupos (nome do jogador/time).
  choiceNames: Record<string, string>;
};

export async function getMatchVoteAudit(matchId: string): Promise<VoteAudit> {
  const rows = await db
    .select({
      ipHash: matchFanVotesTable.ipHash,
      uaHash: matchFanVotesTable.uaHash,
      choiceId: matchFanVotesTable.playerId,
      createdAt: matchFanVotesTable.createdAt,
      voidedAt: matchFanVotesTable.voidedAt,
      choiceName: playersTable.name,
    })
    .from(matchFanVotesTable)
    .innerJoin(playersTable, eq(matchFanVotesTable.playerId, playersTable.id))
    .where(eq(matchFanVotesTable.matchId, matchId));
  return buildAudit(rows);
}

export async function getFavoriteTeamVoteAudit(): Promise<VoteAudit> {
  const rows = await db
    .select({
      ipHash: favoriteTeamVotesTable.ipHash,
      uaHash: favoriteTeamVotesTable.uaHash,
      choiceId: favoriteTeamVotesTable.teamId,
      createdAt: favoriteTeamVotesTable.updatedAt,
      voidedAt: favoriteTeamVotesTable.voidedAt,
      choiceName: teamsTable.name,
    })
    .from(favoriteTeamVotesTable)
    .innerJoin(teamsTable, eq(favoriteTeamVotesTable.teamId, teamsTable.id));
  return buildAudit(rows);
}

function buildAudit(
  rows: { ipHash: string | null; uaHash: string | null; choiceId: string; createdAt: Date; voidedAt: Date | null; choiceName: string }[],
): VoteAudit {
  const choiceNames: Record<string, string> = {};
  for (const row of rows) choiceNames[row.choiceId] = row.choiceName;
  const groups = buildAuditGroups(
    rows.map((row) => ({
      ipHash: row.ipHash,
      uaHash: row.uaHash,
      choiceId: row.choiceId,
      createdAt: row.createdAt.getTime(),
      voided: row.voidedAt !== null,
    })),
  );
  return {
    totalVotes: rows.length,
    voidedVotes: rows.filter((row) => row.voidedAt !== null).length,
    groups,
    choiceNames,
  };
}

// "all" anula todos os votos ativos do grupo; "keep-one-per-browser" mantém o voto mais antigo de
// cada navegador (uaHash) e anula o resto — o caso típico de "alguém votou 20× limpando cookie".
export type VoidMode = "all" | "keep-one-per-browser";

export async function voidMatchVotesByIp(matchId: string, ipHash: string, mode: VoidMode): Promise<number> {
  const scope = and(eq(matchFanVotesTable.matchId, matchId), eq(matchFanVotesTable.ipHash, ipHash), isNull(matchFanVotesTable.voidedAt));
  const keepIds = mode === "keep-one-per-browser" ? await earliestActiveIdPerBrowser("match", scope) : [];
  const updated = await db
    .update(matchFanVotesTable)
    .set({ voidedAt: new Date() })
    .where(keepIds.length > 0 ? and(scope, notInArray(matchFanVotesTable.id, keepIds)) : scope)
    .returning({ id: matchFanVotesTable.id });
  return updated.length;
}

export async function restoreMatchVotesByIp(matchId: string, ipHash: string): Promise<number> {
  const updated = await db
    .update(matchFanVotesTable)
    .set({ voidedAt: null })
    .where(and(eq(matchFanVotesTable.matchId, matchId), eq(matchFanVotesTable.ipHash, ipHash), isNotNull(matchFanVotesTable.voidedAt)))
    .returning({ id: matchFanVotesTable.id });
  return updated.length;
}

export async function voidFavoriteVotesByIp(ipHash: string, mode: VoidMode): Promise<number> {
  const scope = and(eq(favoriteTeamVotesTable.ipHash, ipHash), isNull(favoriteTeamVotesTable.voidedAt));
  const keepIds = mode === "keep-one-per-browser" ? await earliestActiveIdPerBrowser("favorite", scope) : [];
  const updated = await db
    .update(favoriteTeamVotesTable)
    .set({ voidedAt: new Date() })
    .where(keepIds.length > 0 ? and(scope, notInArray(favoriteTeamVotesTable.id, keepIds)) : scope)
    .returning({ id: favoriteTeamVotesTable.id });
  return updated.length;
}

export async function restoreFavoriteVotesByIp(ipHash: string): Promise<number> {
  const updated = await db
    .update(favoriteTeamVotesTable)
    .set({ voidedAt: null })
    .where(and(eq(favoriteTeamVotesTable.ipHash, ipHash), isNotNull(favoriteTeamVotesTable.voidedAt)))
    .returning({ id: favoriteTeamVotesTable.id });
  return updated.length;
}

async function earliestActiveIdPerBrowser(
  poll: "match" | "favorite",
  scope: ReturnType<typeof and>,
): Promise<string[]> {
  const rows =
    poll === "match"
      ? await db
          .select({ id: matchFanVotesTable.id, uaHash: matchFanVotesTable.uaHash, at: matchFanVotesTable.createdAt })
          .from(matchFanVotesTable)
          .where(scope)
      : await db
          .select({ id: favoriteTeamVotesTable.id, uaHash: favoriteTeamVotesTable.uaHash, at: favoriteTeamVotesTable.createdAt })
          .from(favoriteTeamVotesTable)
          .where(scope);

  const earliest = new Map<string, { id: string; at: number }>();
  for (const row of rows) {
    const browser = row.uaHash ?? "";
    const current = earliest.get(browser);
    if (!current || row.at.getTime() < current.at) {
      earliest.set(browser, { id: row.id, at: row.at.getTime() });
    }
  }
  return [...earliest.values()].map((entry) => entry.id);
}

// ---------------------------------------------------------------------------------------------
// Fingerprint barato pra TV/overlay só refazerem a leitura cara quando algo mudou (mesma ideia de
// runtime/tv-version.ts): contagens + último voto/anulação + última partida iniciada/encerrada.
// ---------------------------------------------------------------------------------------------

export async function getFanVotesVersion(): Promise<string> {
  const [[matchVotes], [favoriteVotes], [matchTimes]] = await Promise.all([
    db
      .select({
        total: count(),
        voided: count(matchFanVotesTable.voidedAt),
        lastAt: sql<string | null>`max(${matchFanVotesTable.createdAt})`,
        lastVoidAt: sql<string | null>`max(${matchFanVotesTable.voidedAt})`,
      })
      .from(matchFanVotesTable),
    db
      .select({
        total: count(),
        voided: count(favoriteTeamVotesTable.voidedAt),
        lastAt: sql<string | null>`max(${favoriteTeamVotesTable.updatedAt})`,
        lastVoidAt: sql<string | null>`max(${favoriteTeamVotesTable.voidedAt})`,
      })
      .from(favoriteTeamVotesTable),
    db
      .select({
        lastStart: sql<string | null>`max(${matchesTable.startedAt})`,
        lastFinish: sql<string | null>`max(${matchesTable.finishedAt})`,
      })
      .from(matchesTable),
  ]);

  return [
    matchVotes?.total,
    matchVotes?.voided,
    matchVotes?.lastAt,
    matchVotes?.lastVoidAt,
    favoriteVotes?.total,
    favoriteVotes?.voided,
    favoriteVotes?.lastAt,
    favoriteVotes?.lastVoidAt,
    matchTimes?.lastStart,
    matchTimes?.lastFinish,
  ].join("|");
}

// O que o overlay do QR (routes/vote-overlay) deve chamar agora: a votação de jogo aberta mais
// recente (com o confronto no texto); sem nenhuma, o Time favorito se estiver aberto; senão nada
// (overlay fica transparente). Uma query só, com os nomes dos times por join — roda no poll do OBS.
export type VoteCallout = { kind: "match"; matchId: string; title: string } | { kind: "favorite" } | null;

export async function resolveVoteCallout(windowHours: number, favoriteOpen: boolean, now = Date.now()): Promise<VoteCallout> {
  const homeTeams = alias(teamsTable, "home_team");
  const awayTeams = alias(teamsTable, "away_team");
  const closedBefore = new Date(now - windowHours * HOUR_MS);
  const [row] = await db
    .select({ id: matchesTable.id, homeName: homeTeams.name, awayName: awayTeams.name })
    .from(matchesTable)
    .innerJoin(homeTeams, eq(matchesTable.homeTeamId, homeTeams.id))
    .innerJoin(awayTeams, eq(matchesTable.awayTeamId, awayTeams.id))
    .where(
      or(eq(matchesTable.status, "in_progress"), and(eq(matchesTable.status, "finished"), gt(matchesTable.finishedAt, closedBefore))),
    )
    .orderBy(desc(matchesTable.startedAt))
    .limit(1);

  if (row) return { kind: "match", matchId: row.id, title: `${row.homeName} × ${row.awayName}` };
  return favoriteOpen ? { kind: "favorite" } : null;
}

// Quantos votos do Jogador da Torcida existem por partida (lista de súmulas no admin).
export async function countMatchFanVotesByMatch(matchIds: string[]): Promise<Map<string, number>> {
  if (matchIds.length === 0) return new Map();
  const rows = await db
    .select({ matchId: matchFanVotesTable.matchId, votes: count() })
    .from(matchFanVotesTable)
    .where(and(inArray(matchFanVotesTable.matchId, matchIds), isNull(matchFanVotesTable.voidedAt)))
    .groupBy(matchFanVotesTable.matchId);
  return new Map(rows.map((row) => [row.matchId, row.votes]));
}
