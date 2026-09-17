ALTER TABLE "erasto_league"."matches" ADD COLUMN "mvp_player_id" uuid;--> statement-breakpoint
ALTER TABLE "erasto_league"."matches" ADD COLUMN "mvp_note" text;--> statement-breakpoint
ALTER TABLE "erasto_league"."matches" ADD CONSTRAINT "matches_mvp_player_id_players_id_fk" FOREIGN KEY ("mvp_player_id") REFERENCES "erasto_league"."players"("id") ON DELETE no action ON UPDATE no action;