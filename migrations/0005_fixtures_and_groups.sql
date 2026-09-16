CREATE TABLE "erasto_league"."fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" text NOT NULL,
	"group_name" text,
	"round_label" text,
	"home_team_id" uuid,
	"away_team_id" uuid,
	"home_label" text,
	"away_label" text,
	"scheduled_at" timestamp with time zone,
	"match_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "erasto_league"."teams" ADD COLUMN "group_name" text;--> statement-breakpoint
ALTER TABLE "erasto_league"."fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "erasto_league"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erasto_league"."fixtures" ADD CONSTRAINT "fixtures_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "erasto_league"."matches"("id") ON DELETE no action ON UPDATE no action;