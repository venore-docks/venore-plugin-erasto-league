CREATE TABLE "erasto_league"."match_boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"side" text NOT NULL,
	"boost_key" text NOT NULL,
	"minute_ms" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "erasto_league"."match_boosts" ADD CONSTRAINT "match_boosts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "erasto_league"."matches"("id") ON DELETE no action ON UPDATE no action;