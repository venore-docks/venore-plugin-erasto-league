// Schema dividido por entidade — reexportado aqui num import único, igual a antes.
// drizzle.config.ts aponta pra este arquivo (schema: ["./database/schema/index.ts"]).
export * from "./schema";
export * from "./teams";
export * from "./players";
export * from "./matches";
export * from "./match-events";
export * from "./match-state";
