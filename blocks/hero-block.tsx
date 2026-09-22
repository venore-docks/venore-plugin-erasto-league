import Link from "next/link";
import { Button } from "@venore/plugin-sdk/ui";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getMatchState } from "../runtime/match-actions";
import { formatScore } from "../shared/score";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Capa do site — DENTRO da shell/tema do host, mesmo princípio de team-profile-view.tsx: só cor do
// TEMA (var(--primary), shadcn), nunca a cor de destaque das settings do plugin
// (erasto-league.accentColor) — essa é identidade visual do overlay/controle/TV (telas fora do
// tema do site, ver README), não do site em si. "ao vivo agora" ainda vem de match_state, pra a
// home nunca mostrar uma partida velha como se estivesse rolando.
export async function ErastoLeagueHeroBlock({ block }: BlockRendererProps) {
  const state = await getMatchState();

  const title = readString(block.data, "title", "Erasto League");
  const subtitle = readString(block.data, "subtitle");
  const ctaLabel = readString(block.data, "ctaLabel");
  const ctaHref = readString(block.data, "ctaHref");
  const isLive = Boolean(state.currentMatchId);

  return (
    <section
      className="relative overflow-hidden rounded-panel px-6 py-14 text-center sm:px-10 sm:py-20"
      style={{
        background: `radial-gradient(120% 140% at 50% -10%, color-mix(in srgb, var(--primary) 30%, transparent), transparent 60%),
          linear-gradient(160deg, color-mix(in srgb, var(--primary) 16%, var(--card)), var(--card) 70%)`,
      }}
    >
      {isLive && (
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wide">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
          Ao vivo — {state.home.name} {formatScore(state.home.score)} × {formatScore(state.away.score)} {state.away.name}
        </div>
      )}

      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{subtitle}</p>}

      {ctaLabel && ctaHref && (
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
