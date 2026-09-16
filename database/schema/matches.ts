import { real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";
import { teams } from "./teams";
import type { MatchStatus } from "../../contracts/types";

// Ficha durável de cada partida (Fase 2 — partida como entidade viva). homeScore/awayScore
// espelham a soma dos match_events "goal" daquele lado (runtime/match-events.ts é o único ponto de
// escrita) — mantidos aqui pra não recalcular via SUM() a cada leitura de súmula/perfil.
export const matches = erastoLeagueSchema.table("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeTeamId: uuid("home_team_id")
    .notNull()
    .references(() => teams.id),
  awayTeamId: uuid("away_team_id")
    .notNull()
    .references(() => teams.id),
  homeScore: real("home_score").notNull().default(0),
  awayScore: real("away_score").notNull().default(0),
  label: text("label").notNull().default(""),
  status: text("status").$type<MatchStatus>().notNull().default("in_progress"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
