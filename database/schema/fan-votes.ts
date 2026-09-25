import { index, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { erastoLeagueSchema } from "./schema";
import { matches } from "./matches";
import { players } from "./players";
import { teams } from "./teams";

// Votação aberta da torcida — sem login de propósito (pedido explícito). Quem vota é identificado
// só por um cookie de aparelho (runtime/voter.ts): voterKey é o hash desse cookie, nunca o valor
// cru. ipHash/uaHash são HMAC truncados de IP (IPv6 agrupado por /64) e user-agent — só servem pra
// AGRUPAR votos na auditoria do admin (muitos votos do mesmo IP e do mesmo navegador = alguém
// limpando cookie/aba anônima), não pra identificar pessoa. voidedAt = voto anulado pelo admin: a
// linha continua (dá pra restaurar), só não conta no resultado.

// "Jogador da Torcida" — um voto por aparelho por partida, sem troca. Janela: do início da partida
// até N horas depois de encerrada (shared/fan-votes.ts resolveMatchVoteWindow).
export const matchFanVotes = erastoLeagueSchema.table(
  "match_fan_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    voterKey: text("voter_key").notNull(),
    ipHash: text("ip_hash"),
    uaHash: text("ua_hash"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("match_fan_votes_match_voter_unique").on(table.matchId, table.voterKey),
    index("match_fan_votes_match_ip_idx").on(table.matchId, table.ipHash),
  ],
);

// "Time favorito" da temporada — um voto por aparelho no campeonato inteiro, que PODE ser trocado
// enquanto a votação estiver aberta (a troca tira o incentivo de abrir aba anônima só pra "mudar de
// ideia"). Aberta/fechada pela setting erasto-league.favoriteTeamVotingOpen; nova temporada = o
// admin zera os votos (routes/admin/votes).
export const favoriteTeamVotes = erastoLeagueSchema.table(
  "favorite_team_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    voterKey: text("voter_key").notNull().unique(),
    ipHash: text("ip_hash"),
    uaHash: text("ua_hash"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("favorite_team_votes_ip_idx").on(table.ipHash), index("favorite_team_votes_team_idx").on(table.teamId)],
);
