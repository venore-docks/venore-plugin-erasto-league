import Link from "next/link";
import { Button } from "@venore/plugin-sdk/ui";
import { getMatchState } from "../../runtime/match-actions";
import { getNextFixture } from "../../runtime/bracket";
import { getTeam } from "../../runtime/teams";
import { fixtureCalendarLinks, shouldOfferCalendar } from "../../shared/calendar";
import { formatScore } from "../../shared/score";
import { NextGameAdCard } from "../next-game-ad-block";
import { AddToCalendar } from "../add-to-calendar";
import { TeamCrest } from "./team-crest";

function LiveTeam({ name, crestUrl }: { name: string; crestUrl: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <TeamCrest name={name} crestUrl={crestUrl} className="size-14 shadow-float sm:size-16" />
      <span className="max-w-full truncate text-center text-sm font-bold text-foreground">{name}</span>
    </div>
  );
}

// Capa da página inicial: título/subtítulo/botão editáveis + o que está acontecendo AGORA — o jogo
// ao vivo (placar de match_state, igual à capa simples, blocks/hero-block.tsx) ou, sem jogo rolando,
// o card do próximo jogo com "Adicionar à agenda". Botão de votar aparece com votação aberta.
export async function HomeHero({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  hasOpenPoll,
  durationMinutes,
  origin,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  hasOpenPoll: boolean;
  durationMinutes: number;
  origin: string;
}) {
  const state = await getMatchState();
  const liveMatchId = state.currentMatchId;
  const [next, homeTeam, awayTeam] = await Promise.all([
    liveMatchId ? null : getNextFixture(),
    liveMatchId && state.homeTeamId ? getTeam(state.homeTeamId) : null,
    liveMatchId && state.awayTeamId ? getTeam(state.awayTeamId) : null,
  ]);
  const nextCalendar =
    next && shouldOfferCalendar(next.scheduledDate, next.scheduledTime, next.played)
      ? fixtureCalendarLinks({
          fixtureId: next.id,
          homeName: next.homeName,
          awayName: next.awayName,
          stageLabel: next.roundLabel,
          scheduledDate: next.scheduledDate,
          scheduledTime: next.scheduledTime,
          durationMinutes,
          url: `${origin}/`,
        })
      : null;

  let aside = null;
  if (liveMatchId) {
    aside = (
      <Link
        href={`/erasto-league/jogos/${liveMatchId}`}
        className="block rounded-panel border border-border bg-card p-5 shadow-float ui-motion-base hover:border-ring"
      >
        <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-destructive">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
          Ao vivo agora{state.label ? ` · ${state.label}` : ""}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <LiveTeam name={state.home.name} crestUrl={homeTeam?.crestUrl ?? null} />
          <span className="shrink-0 text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">
            {formatScore(state.home.score)} × {formatScore(state.away.score)}
          </span>
          <LiveTeam name={state.away.name} crestUrl={awayTeam?.crestUrl ?? null} />
        </div>
        <p className="mt-4 text-center text-sm font-bold text-primary">▶ Assistir e votar no Jogador da Torcida</p>
      </Link>
    );
  } else if (next) {
    aside = (
      <div className="space-y-2">
        <NextGameAdCard next={next} title="Próximo jogo" />
        {nextCalendar && (
          <div className="flex justify-center">
            <AddToCalendar links={nextCalendar} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-panel border border-border"
      style={{
        background: `radial-gradient(120% 140% at 0% -10%, color-mix(in srgb, var(--primary) 26%, transparent), transparent 60%),
          linear-gradient(160deg, color-mix(in srgb, var(--primary) 12%, var(--card)), var(--card) 70%)`,
      }}
    >
      <div className={`grid gap-6 p-5 sm:p-8 ${aside ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:gap-10" : ""}`}>
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">{title}</h1>
          {subtitle && <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">{subtitle}</p>}
          {((ctaLabel && ctaHref) || hasOpenPoll) && (
            <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {ctaLabel && ctaHref && (
                <Button asChild size="lg">
                  <Link href={ctaHref}>{ctaLabel}</Link>
                </Button>
              )}
              {hasOpenPoll && (
                <Button asChild size="lg" variant="outline">
                  <Link href="/erasto-league/votar">Votar no Jogador da Torcida</Link>
                </Button>
              )}
            </div>
          )}
        </div>
        {aside}
      </div>
    </section>
  );
}
