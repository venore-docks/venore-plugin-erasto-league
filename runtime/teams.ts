import { asc, eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { teams as teamsTable } from "../database/schema";
import { slugify } from "../shared/slug";
import type { TeamProfile } from "../contracts/types";

type TeamRow = typeof teamsTable.$inferSelect;

async function resolveMediaUrl(mediaId: string | null): Promise<string | null> {
  if (!mediaId) return null;
  const result = await getMediaAsset({ id: mediaId });
  return result.success && result.data ? result.data.url : null;
}

async function rowToProfile(row: TeamRow): Promise<TeamProfile> {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    crestMediaId: row.crestMediaId,
    crestUrl: await resolveMediaUrl(row.crestMediaId),
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    description: row.description,
    foundedDate: row.foundedDate,
  };
}

// Garante um slug único (tenta o base; em colisão, sufixa -2, -3... até achar livre).
// excludeId: ao editar um time, não colide com o próprio registro.
async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const clashes = await db.select({ id: teamsTable.id }).from(teamsTable).where(eq(teamsTable.slug, candidate));
    const clash = clashes.find((row) => row.id !== excludeId);
    if (!clash) return candidate;
  }
}

export async function listTeams(): Promise<TeamProfile[]> {
  const rows = await db.select().from(teamsTable).orderBy(asc(teamsTable.name));
  return Promise.all(rows.map(rowToProfile));
}

export async function getTeam(id: string): Promise<TeamProfile | null> {
  const [row] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  return row ? rowToProfile(row) : null;
}

export async function getTeamBySlug(slug: string): Promise<TeamProfile | null> {
  const [row] = await db.select().from(teamsTable).where(eq(teamsTable.slug, slug));
  return row ? rowToProfile(row) : null;
}

export type TeamInput = {
  name: string;
  crestMediaId: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  description: string | null;
  foundedDate: string | null;
};

export async function createTeam(input: TeamInput): Promise<TeamProfile> {
  const slug = await uniqueSlug(input.name);
  const [row] = await db
    .insert(teamsTable)
    .values({ ...input, slug, updatedAt: new Date() })
    .returning();
  return rowToProfile(row);
}

export async function updateTeam(id: string, input: TeamInput): Promise<TeamProfile> {
  const [existing] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  const slug = existing && existing.name === input.name ? existing.slug : await uniqueSlug(input.name, id);
  const [row] = await db
    .update(teamsTable)
    .set({ ...input, slug, updatedAt: new Date() })
    .where(eq(teamsTable.id, id))
    .returning();
  return rowToProfile(row);
}
