import { date, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";

// Cadastro de times (Fase 1 do plano de cadastro/eventos) — sempre criado/editado por um admin,
// nunca pelos próprios alunos. crestMediaId aponta pro sistema de mídia do host (getMediaAsset em
// @venore/plugin-sdk/media), não uma URL solta — mesmo padrão de capa de curso do venore-plugin-academy.
export const teams = erastoLeagueSchema.table("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),

  crestMediaId: text("crest_media_id"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  description: text("description"),
  foundedDate: date("founded_date"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
