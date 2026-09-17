import { asc, eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { powerBoosts as powerBoostsTable } from "../database/schema";
import { slugify } from "../shared/slug";
import type { PowerBoost } from "../contracts/types";

type PowerBoostRow = typeof powerBoostsTable.$inferSelect;

function rowToPowerBoost(row: PowerBoostRow): PowerBoost {
  return { id: row.id, key: row.key, label: row.label, emoji: row.emoji, description: row.description };
}

// Mesma lógica de uniqueSlug em runtime/teams.ts — tenta o key base (slugify do rótulo), sufixa
// -2/-3... em colisão. excludeId: ao editar, não colide com o próprio registro.
async function uniqueKey(label: string, excludeId?: string): Promise<string> {
  const base = slugify(label).replace(/-/g, "_") || "boost";
  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}_${suffix + 1}`;
    const clashes = await db.select({ id: powerBoostsTable.id }).from(powerBoostsTable).where(eq(powerBoostsTable.key, candidate));
    const clash = clashes.find((row) => row.id !== excludeId);
    if (!clash) return candidate;
  }
}

export async function listPowerBoosts(): Promise<PowerBoost[]> {
  const rows = await db.select().from(powerBoostsTable).orderBy(asc(powerBoostsTable.createdAt));
  return rows.map(rowToPowerBoost);
}

export type PowerBoostInput = { label: string; emoji: string; description: string };

export async function createPowerBoost(input: PowerBoostInput): Promise<PowerBoost> {
  const key = await uniqueKey(input.label);
  const [row] = await db
    .insert(powerBoostsTable)
    .values({ key, label: input.label, emoji: input.emoji, description: input.description, updatedAt: new Date() })
    .returning();
  return rowToPowerBoost(row);
}

// Key só é recalculada se o rótulo mudou (mesmo critério de updateTeam pro slug) — evita que um
// ajuste de digitação no rótulo troque silenciosamente a chave gravada em usos já registrados.
export async function updatePowerBoost(id: string, input: PowerBoostInput): Promise<PowerBoost> {
  const [existing] = await db.select().from(powerBoostsTable).where(eq(powerBoostsTable.id, id));
  const key = existing && existing.label === input.label ? existing.key : await uniqueKey(input.label, id);
  const [row] = await db
    .update(powerBoostsTable)
    .set({ key, label: input.label, emoji: input.emoji, description: input.description, updatedAt: new Date() })
    .where(eq(powerBoostsTable.id, id))
    .returning();
  return rowToPowerBoost(row);
}

// Sem bloqueio de exclusão: match_boosts.boost_key não tem FK pra power_boosts.id de propósito
// (mesma filosofia de deletePlayer) — usos já registrados de uma partida antiga continuam
// existindo, só perdem o rótulo/emoji bonito e caem pro key cru na exibição (ver
// routes/control/console.tsx, routes/admin/matches/match-page.tsx).
export async function deletePowerBoost(id: string): Promise<void> {
  await db.delete(powerBoostsTable).where(eq(powerBoostsTable.id, id));
}
