import { date, integer, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
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

  // Data e hora SEPARADAS de propósito (não timestamptz) — pedido explícito: um <input
  // type="datetime-local"> exige as duas partes preenchidas antes de aceitar qualquer uma
  // (editar só a hora ficava "preso" esperando uma data), e um timestamp combinado não consegue
  // representar "data já sabida, hora ainda não" sem ambiguidade (meia-noite vira indistinguível
  // de "sem hora"). Como texto puro (YYYY-MM-DD / HH:mm), nenhuma conversão de fuso acontece no
  // caminho de escrita — elimina de vez a classe de bug corrigida em shared/timezone.ts (que
  // existia só por causa do timestamptz + new Date(string) pegando o fuso de quem executa o
  // código). scheduledTime só faz sentido com scheduledDate preenchido; scheduledDate sozinho =
  // "dia marcado, horário a definir" (estado que um timestamp não conseguia expressar).
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  matchId: uuid("match_id").references(() => matches.id),
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
