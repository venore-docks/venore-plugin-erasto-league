import { boolean, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";
import { teams } from "./teams";
import type { PlayerGender, PlayerPosition } from "../../contracts/types";

// Cadastro de jogadores (Fase 1) — um time atual só por jogador (FK simples, sem histórico de
// múltiplos clubes por enquanto). photoMediaId segue o mesmo padrão de crestMediaId em teams.ts.
export const players = erastoLeagueSchema.table("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  name: text("name").notNull(),
  number: integer("number"),
  // Nullable — pedido pra sinalizar (cada time tem 1 menina), não pra travar cadastro de quem já
  // existe sem essa info.
  gender: text("gender").$type<PlayerGender>(),
  // Nullable pelo mesmo motivo de gender — cadastro de quem já existe não trava.
  position: text("position").$type<PlayerPosition>(),
  isCaptain: boolean("is_captain").notNull().default(false),

  photoMediaId: text("photo_media_id"),
  bio: text("bio"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
