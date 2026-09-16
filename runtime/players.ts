import { asc, eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { players as playersTable } from "../database/schema";
import { slugify } from "../shared/slug";
import type { PlayerProfile } from "../contracts/types";

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
