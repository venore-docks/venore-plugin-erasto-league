import { bigint, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";
import { matches } from "./matches";
import { players } from "./players";
import type { EventKind, MatchSide } from "../../contracts/types";

// Um evento por gol/cartão/falta (Fase 2). playerId nullable: atribuição pode ser pulada ao vivo
// (o controle não trava esperando "quem foi?") e completada depois na súmula (Fase 3).
// amount só é relevante em kind "goal" — aceita 0,5 e valores negativos (botões −1/−0,5 do
// controle, que corrigem o placar sem caso especial: placar do lado = soma dos "goal" daquele lado).
export const matchEvents = erastoLeagueSchema.table("match_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id),
  kind: text("kind").$type<EventKind>().notNull(),
  side: text("side").$type<MatchSide>().notNull(),
  playerId: uuid("player_id").references(() => players.id),
  amount: real("amount").notNull().default(1),
  // ms decorridos de jogo no momento do evento (computeElapsedMs) — timeline futura, opcional.
  minuteMs: bigint("minute_ms", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
