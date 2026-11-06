CREATE TABLE "erasto_league"."match_winner_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"voter_key" text NOT NULL,
	"ip_hash" text,
	"ua_hash" text,
	"ticket_nonce" text,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "erasto_league"."match_winner_votes" ADD CONSTRAINT "match_winner_votes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "erasto_league"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_winner_votes" ADD CONSTRAINT "match_winner_votes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "match_winner_votes_match_voter_unique" ON "erasto_league"."match_winner_votes" USING btree ("match_id","voter_key");--> statement-breakpoint
CREATE INDEX "match_winner_votes_match_ip_idx" ON "erasto_league"."match_winner_votes" USING btree ("match_id","ip_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "match_winner_votes_ticket_nonce_unique" ON "erasto_league"."match_winner_votes" USING btree ("ticket_nonce");