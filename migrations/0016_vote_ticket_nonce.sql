ALTER TABLE "erasto_league"."favorite_team_votes" ADD COLUMN "ticket_nonce" text;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_fan_votes" ADD COLUMN "ticket_nonce" text;--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_team_votes_ticket_nonce_unique" ON "erasto_league"."favorite_team_votes" USING btree ("ticket_nonce");--> statement-breakpoint
CREATE UNIQUE INDEX "match_fan_votes_ticket_nonce_unique" ON "erasto_league"."match_fan_votes" USING btree ("ticket_nonce");