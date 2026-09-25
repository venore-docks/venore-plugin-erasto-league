import { asc, eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { matchEvents as matchEventsTable, matchFanVotes as matchFanVotesTable, players as playersTable } from "../database/schema";
import { slugify } from "../shared/slug";
import type { PlayerGender, PlayerPosition, PlayerProfile } from "../contracts/types";

type PlayerRow = typeof playersTable.$inferSelect;

async function resolveMediaUrl(mediaId: string | null): Promise<string | null> {
  if (!mediaId) return null;
  const result = await getMediaAsset({ id: mediaId });
  return result.success && result.data ? result.data.url : null;
}

async function rowToProfile(row: PlayerRow): Promise<PlayerProfile> {
  return {
    id: row.id,
    slug: row.slug,
    teamId: row.teamId,
    name: row.name,
    number: row.number,
    gender: row.gender,
    position: row.position,
    isCaptain: row.isCaptain,
    photoMediaId: row.photoMediaId,
    photoUrl: await resolveMediaUrl(row.photoMediaId),
    bio: row.bio,
  };
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const clashes = await db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.slug, candidate));
    const clash = clashes.find((row) => row.id !== excludeId);
    if (!clash) return candidate;
  }
}

export async function listPlayers(): Promise<PlayerProfile[]> {
  const rows = await db.select().from(playersTable).orderBy(asc(playersTable.name));
  return Promise.all(rows.map(rowToProfile));
}

export async function listPlayersByTeam(teamId: string): Promise<PlayerProfile[]> {
  const rows = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, teamId))
    .orderBy(asc(playersTable.number), asc(playersTable.name));
  return Promise.all(rows.map(rowToProfile));
}

export async function getPlayer(id: string): Promise<PlayerProfile | null> {
  const [row] = await db.select().from(playersTable).where(eq(playersTable.id, id));
  return row ? rowToProfile(row) : null;
}

export async function getPlayerBySlug(slug: string): Promise<PlayerProfile | null> {
  const [row] = await db.select().from(playersTable).where(eq(playersTable.slug, slug));
  return row ? rowToProfile(row) : null;
}

export type PlayerInput = {
  teamId: string;
  name: string;
  number: number | null;
  gender: PlayerGender | null;
  position: PlayerPosition | null;
  isCaptain: boolean;
  photoMediaId: string | null;
  bio: string | null;
};

export async function createPlayer(input: PlayerInput): Promise<PlayerProfile> {
  const slug = await uniqueSlug(input.name);
  const [row] = await db
    .insert(playersTable)
    .values({ ...input, slug, updatedAt: new Date() })
    .returning();
  return rowToProfile(row);
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<PlayerProfile> {
  const [existing] = await db.select().from(playersTable).where(eq(playersTable.id, id));
  const slug = existing && existing.name === input.name ? existing.slug : await uniqueSlug(input.name, id);
  const [row] = await db
    .update(playersTable)
    .set({ ...input, slug, updatedAt: new Date() })
    .where(eq(playersTable.id, id))
    .returning();
  return rowToProfile(row);
}

export type PlayerDeleteImpact = { eventCount: number; fanVoteCount: number };

// Quantos eventos (gol/cartão/falta) ficariam sem jogador atribuído se este jogador fosse excluído
// — mostrado antes de confirmar (routes/admin/players/delete-player-control.tsx) — e quantos votos
// de Jogador da Torcida recebidos por ele seriam apagados.
export async function getPlayerDeleteImpact(id: string): Promise<PlayerDeleteImpact> {
  const [eventRows, fanVoteRows] = await Promise.all([
    db.select({ id: matchEventsTable.id }).from(matchEventsTable).where(eq(matchEventsTable.playerId, id)),
    db.select({ id: matchFanVotesTable.id }).from(matchFanVotesTable).where(eq(matchFanVotesTable.playerId, id)),
  ]);
  return { eventCount: eventRows.length, fanVoteCount: fanVoteRows.length };
}

// Exclusão "segura": os eventos do jogador não são apagados (isso mexeria no placar/histórico das
// partidas) — só perdem a atribuição (playerId null, mesmo estado de "quem fez?" pulado no
// controle), corrigível depois na súmula atribuindo outro jogador se for o caso. Votos de Jogador
// da Torcida nele, ao contrário, são apagados: um voto sem jogador não tem o que mostrar.
export async function deletePlayer(id: string): Promise<void> {
  await db.update(matchEventsTable).set({ playerId: null }).where(eq(matchEventsTable.playerId, id));
  await db.delete(matchFanVotesTable).where(eq(matchFanVotesTable.playerId, id));
  await db.delete(playersTable).where(eq(playersTable.id, id));
}
