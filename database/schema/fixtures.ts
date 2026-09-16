import { integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";
import { teams } from "./teams";
import { matches } from "./matches";
import type { FixturePhase } from "../../contracts/types";

// Confronto agendado (Fase 6 — copa: grupos + eliminatórias). Existe ANTES de qualquer partida
// (importado via CSV — ver runtime/csv-import.ts), e opcionalmente aponta pra uma `matches` row
// quando o jogo já rolou (vínculo manual, ver runtime/fixtures.ts linkFixtureToMatch).
export const fixtures = erastoLeagueSchema.table("fixtures", {
  id: uuid("id").primaryKey().defaultRandom(),
  phase: text("phase").$type<FixturePhase>().notNull(),
  groupName: text("group_name"),
  roundLabel: text("round_label"),

  homeTeamId: uuid("home_team_id").references(() => teams.id),
  awayTeamId: uuid("away_team_id").references(() => teams.id),
  // Fallback de exibição quando o time ainda não é conhecido (ex: "Vencedor Grupo A").
  homeLabel: text("home_label"),
  awayLabel: text("away_label"),

  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  matchId: uuid("match_id").references(() => matches.id),
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
