CREATE SCHEMA "erasto_league";
--> statement-breakpoint
CREATE TABLE "erasto_league"."match_state" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"home_name" text DEFAULT 'Casa' NOT NULL,
	"home_score" integer DEFAULT 0 NOT NULL,
	"away_name" text DEFAULT 'Visitante' NOT NULL,
	"away_score" integer DEFAULT 0 NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"clock_running" boolean DEFAULT false NOT NULL,
	"clock_anchor_ms" bigint,
	"clock_accumulated_ms" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "erasto_league"."match_state" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;
