import { bigint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";
import { matches } from "./matches";
import type { MatchSide, PowerBoostKey } from "../../contracts/types";

// Uso de "power boost" (catálogo mockado, shared/power-boosts.ts) por um time numa partida — cada
// linha é UM uso; um time pode usar o mesmo boost mais de uma vez ou vários boosts diferentes, sem
// limite imposto aqui (regra de negócio real ainda não veio do campeonato).
export const matchBoosts = erastoLeagueSchema.table("match_boosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id),
  side: text("side").$type<MatchSide>().notNull(),
  boostKey: text("boost_key").$type<PowerBoostKey>().notNull(),
  // ms decorridos de jogo no momento do uso (computeElapsedMs) — mesmo espírito de minuteMs em
  // match_events.
  minuteMs: bigint("minute_ms", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
