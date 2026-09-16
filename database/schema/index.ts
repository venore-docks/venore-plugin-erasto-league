// Schema dividido por entidade (teams/players/match-state, e matches/match-events nas próximas
// fases) — reexportado aqui num import único, igual a antes. drizzle.config.ts aponta pra este
// arquivo (schema: ["./database/schema/index.ts"]).
export * from "./schema";
export * from "./teams";
export * from "./players";
export * from "./match-state";
