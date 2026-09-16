import { pgSchema } from "drizzle-orm/pg-core";

// Schema próprio do plugin — aplicado no install pelo run-plugin-migrations.ts do core (nunca no
// vercel-build). O nome bate com o default derivado da key ("erasto-league" → "erasto_league").
export const erastoLeagueSchema = pgSchema("erasto_league");
