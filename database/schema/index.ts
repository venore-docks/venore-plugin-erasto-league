import { bigint, boolean, integer, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

// Schema próprio do plugin — aplicado no install pelo run-plugin-migrations.ts do core (nunca no
// vercel-build). O nome bate com o default derivado da key ("erasto-league" → "erasto_league").
export const erastoLeagueSchema = pgSchema("erasto_league");

// Spike de partida ÚNICA: uma linha só, id fixo "singleton". Quando virar liga de verdade (times
// cadastrados, rodadas, tabela) isto passa a ter uma linha por partida + FKs — por ora, um estado
// global persistido, pra sobreviver a restart e a multi-instância da Vercel (o motivo do overlay
// "zerar" no F5 era o estado morar só em globalThis).
export const matchState = erastoLeagueSchema.table("match_state", {
  id: text("id").primaryKey().default("singleton"),

  homeName: text("home_name").notNull().default("Casa"),
  homeScore: integer("home_score").notNull().default(0),
  awayName: text("away_name").notNull().default("Visitante"),
  awayScore: integer("away_score").notNull().default(0),

  label: text("label").notNull().default(""),

  // Relógio — ver MatchClock em contracts/types.ts. bigint em ms; mode "number" porque o intervalo
  // (partidas de minutos) cabe folgado em Number.MAX_SAFE_INTEGER.
  clockRunning: boolean("clock_running").notNull().default(false),
  clockAnchorMs: bigint("clock_anchor_ms", { mode: "number" }),
  clockAccumulatedMs: bigint("clock_accumulated_ms", { mode: "number" }).notNull().default(0),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
