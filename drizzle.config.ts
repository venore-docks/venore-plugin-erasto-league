import { defineConfig } from "drizzle-kit";

// Migrations próprias do plugin (docs/venore-docks.md — "Schema e migrations"). `drizzle-kit
// generate` roda AQUI no repo do plugin; a aplicação no host é feita pelo run-plugin-migrations.ts
// do core no install, lendo manifest.migrationsPath. Tabela de tracking própria, pra não
// compartilhar o cursor de "última migration aplicada" com o core nem com outro plugin — o nome
// bate com o default derivado da key ("erasto-league" → "erasto_league_migrations").
export default defineConfig({
  schema: ["./database/schema/index.ts"],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  migrations: { schema: "erasto_league_migrations", table: "__drizzle_migrations" },
});
