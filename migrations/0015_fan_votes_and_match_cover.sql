CREATE TABLE "erasto_league"."favorite_team_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"voter_key" text NOT NULL,
	"ip_hash" text,
	"ua_hash" text,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_team_votes_voter_key_unique" UNIQUE("voter_key")
);
--> statement-breakpoint
CREATE TABLE "erasto_league"."match_fan_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"voter_key" text NOT NULL,
	"ip_hash" text,
	"ua_hash" text,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "erasto_league"."matches" ADD COLUMN "cover_media_id" text;--> statement-breakpoint
ALTER TABLE "erasto_league"."favorite_team_votes" ADD CONSTRAINT "favorite_team_votes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_fan_votes" ADD CONSTRAINT "match_fan_votes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "erasto_league"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_fan_votes" ADD CONSTRAINT "match_fan_votes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "erasto_league"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorite_team_votes_ip_idx" ON "erasto_league"."favorite_team_votes" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "favorite_team_votes_team_idx" ON "erasto_league"."favorite_team_votes" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_fan_votes_match_voter_unique" ON "erasto_league"."match_fan_votes" USING btree ("match_id","voter_key");--> statement-breakpoint
CREATE INDEX "match_fan_votes_match_ip_idx" ON "erasto_league"."match_fan_votes" USING btree ("match_id","ip_hash");