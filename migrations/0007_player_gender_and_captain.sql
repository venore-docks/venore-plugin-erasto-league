ALTER TABLE "erasto_league"."players" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "erasto_league"."players" ADD COLUMN "is_captain" boolean DEFAULT false NOT NULL;