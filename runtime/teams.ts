import { asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { fixtures as fixturesTable, matches as matchesTable, players as playersTable, teams as teamsTable } from "../database/schema";
import { deletePlayer } from "./players";
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

// Case-insensitive — usado pelo import de CSV (runtime/csv-import.ts) pra casar "Bananáticos FC"
// digitado numa linha de fixtures.csv com o time já cadastrado, sem depender de acentuação/caixa
// exatas.
export async function getTeamByName(name: string): Promise<TeamProfile | null> {
  const [row] = await db.select().from(teamsTable).where(ilike(teamsTable.name, name.trim()));
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

// Igual a createTeam, mas com id explícito em vez de deixar o banco sortear (defaultRandom) — só
// pra import de CSV (runtime/csv-import.ts) quando a planilha já vem com um uuid pré-gerado pro
// time, pra poder referenciar esse mesmo id em fixtures.csv antes mesmo do time existir no banco.
export async function createTeamWithId(id: string, input: TeamInput): Promise<TeamProfile> {
  const slug = await uniqueSlug(input.name);
  const [row] = await db
    .insert(teamsTable)
    .values({ ...input, id, slug, updatedAt: new Date() })
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

// Import de teams.csv (runtime/csv-import.ts): se já existe um time com esse nome
// (case-insensitive), atualiza os campos preenchidos na planilha; senão cria. Nunca duplica um
// time por causa de reimportar a mesma planilha duas vezes.
export async function upsertTeamByName(input: TeamInput): Promise<{ team: TeamProfile; created: boolean }> {
  const existing = await getTeamByName(input.name);
  if (existing) {
    const team = await updateTeam(existing.id, input);
    return { team, created: false };
  }
  const team = await createTeam(input);
  return { team, created: true };
}

export type TeamDeleteImpact = { matchCount: number; playerCount: number; fixtureCount: number };

export async function getTeamDeleteImpact(id: string): Promise<TeamDeleteImpact> {
  const [matchRows, playerRows, fixtureRows] = await Promise.all([
    db.select({ id: matchesTable.id }).from(matchesTable).where(or(eq(matchesTable.homeTeamId, id), eq(matchesTable.awayTeamId, id))),
    db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.teamId, id)),
    db.select({ id: fixturesTable.id }).from(fixturesTable).where(or(eq(fixturesTable.homeTeamId, id), eq(fixturesTable.awayTeamId, id))),
  ]);
  return { matchCount: matchRows.length, playerCount: playerRows.length, fixtureCount: fixtureRows.length };
}

export type DeleteTeamResult = { ok: true } | { ok: false; error: string };

// Exclusão "segura": bloqueada se o time tem QUALQUER partida (inclusive em andamento/cancelada) ou
// QUALQUER confronto agendado (fixtures) — times.id é referenciado por matches.home_team_id/
// away_team_id e fixtures.home_team_id/away_team_id (sem cascade nos dois), então apagar quebraria
// a integridade do histórico/classificação/tabela de jogos. Sem partida, os jogadores do time nunca
// tiveram evento (evento sempre pertence a uma partida do próprio time), então apagá-los junto é
// seguro de verdade — reaproveita deletePlayer (mesma lógica seria trivial aqui, mas evita duas
// fontes de verdade sobre "como apagar um jogador").
export async function deleteTeam(id: string): Promise<DeleteTeamResult> {
  const impact = await getTeamDeleteImpact(id);
  if (impact.matchCount > 0) {
    return {
      ok: false,
      error: `Este time tem ${impact.matchCount} partida${impact.matchCount === 1 ? "" : "s"} registrada${impact.matchCount === 1 ? "" : "s"} — excluir apagaria esse histórico da súmula/classificação. Não é permitido.`,
    };
  }
  if (impact.fixtureCount > 0) {
    return {
      ok: false,
      error: `Este time tem ${impact.fixtureCount} confronto${impact.fixtureCount === 1 ? "" : "s"} na tabela de jogos — remova esses confrontos (ou os times deles) em /admin/erasto-league/fixtures antes de excluir.`,
    };
  }

  const players = await db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.teamId, id));
  for (const player of players) {
    await deletePlayer(player.id);
  }
  await db.delete(teamsTable).where(eq(teamsTable.id, id));
  return { ok: true };
}
