CREATE TABLE "erasto_league"."matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"home_score" real DEFAULT 0 NOT NULL,
	"away_score" real DEFAULT 0 NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "erasto_league"."match_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"side" text NOT NULL,
	"player_id" uuid,
	"amount" real DEFAULT 1 NOT NULL,
	"minute_ms" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "erasto_league"."match_state" ADD COLUMN "current_match_id" uuid;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_state" ADD COLUMN "home_team_id" uuid;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_state" ADD COLUMN "away_team_id" uuid;--> statement-breakpoint
ALTER TABLE "erasto_league"."matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "erasto_league"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_events" ADD CONSTRAINT "match_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "erasto_league"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_state" ADD CONSTRAINT "match_state_current_match_id_matches_id_fk" FOREIGN KEY ("current_match_id") REFERENCES "erasto_league"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_state" ADD CONSTRAINT "match_state_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."match_state" ADD CONSTRAINT "match_state_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;