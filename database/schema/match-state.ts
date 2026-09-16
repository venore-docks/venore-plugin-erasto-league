import { bigint, boolean, real, text, timestamp } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";

// Spike de partida ÚNICA: uma linha só, id fixo "singleton". Estado global persistido, pra
// sobreviver a restart e a multi-instância da Vercel (o motivo do overlay "zerar" no F5 era o
// estado morar só em globalThis).
//
// Fase 2 do plano de cadastro/eventos (docs internos) vai ligar isto a `matches`/`teams` via
// currentMatchId/homeTeamId/awayTeamId — não mexido ainda nesta leva (Fase 1 = só cadastro de
// times/jogadores, sem tocar no fluxo de partida).
export const matchState = erastoLeagueSchema.table("match_state", {
  id: text("id").primaryKey().default("singleton"),

  homeName: text("home_name").notNull().default("Casa"),
  // real (não integer): o placar aceita meio ponto (+0,5). 0,5 / 1,5 / 2,5… são exatos em float4.
  homeScore: real("home_score").notNull().default(0),
  awayName: text("away_name").notNull().default("Visitante"),
  awayScore: real("away_score").notNull().default(0),

  label: text("label").notNull().default(""),

  // Relógio — ver MatchClock em contracts/types.ts. bigint em ms; mode "number" porque o intervalo
  // (partidas de minutos) cabe folgado em Number.MAX_SAFE_INTEGER.
  clockRunning: boolean("clock_running").notNull().default(false),
  clockAnchorMs: bigint("clock_anchor_ms", { mode: "number" }),
  clockAccumulatedMs: bigint("clock_accumulated_ms", { mode: "number" }).notNull().default(0),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
