CREATE TABLE "erasto_league"."power_boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "power_boosts_key_unique" UNIQUE("key")
);
--> statement-breakpoint
-- Seed com o catálogo que era mockado em shared/power-boosts.ts (keys iguais, de propósito: usos
-- já registrados em match_boosts.boost_key nas instâncias existentes continuam resolvendo pro
-- rótulo/emoji certo depois desta migration).
INSERT INTO "erasto_league"."power_boosts" ("key", "label", "emoji", "description") VALUES
	('double_goal', 'Gol em Dobro', '🔥', 'O próximo gol do time vale em dobro.'),
	('extra_sub', 'Substituição Extra', '🔄', 'Time pode trocar um jogador a mais que o normal.'),
	('iron_wall', 'Muralha', '🛡️', 'Anula o próximo gol sofrido.'),
	('time_freeze', 'Tempo Congelado', '⏱️', 'Ganha 30s extras de pausa tática.'),
	('wildcard', 'Carta Coringa', '🃏', 'Efeito especial definido pelo árbitro na hora.')
ON CONFLICT ("key") DO NOTHING;
