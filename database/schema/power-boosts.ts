import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";

// Catálogo de "power boosts" — antes mockado em shared/power-boosts.ts, agora editável pelo admin
// (/admin/erasto-league/power-boosts). "key" é o identificador estável gravado em
// match_boosts.boost_key (segue o nome, igual ao slug de time/jogador — ver runtime/power-boosts.ts
// uniqueKey), não exposto pra edição direta. Excluir um boost do catálogo NÃO apaga usos já
// registrados: match_boosts.boost_key não tem FK aqui de propósito (mesma filosofia de jogador —
// história antiga só perde a referência do rótulo/emoji e cai pro key cru, ver
// routes/control/console.tsx).
export const powerBoosts = erastoLeagueSchema.table("power_boosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  emoji: text("emoji").notNull().default(""),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
