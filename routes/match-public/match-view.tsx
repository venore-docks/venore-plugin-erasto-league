import Link from "next/link";
import { Badge } from "@venore/plugin-sdk/ui";
import type { MatchEvent, MatchSummary, PlayerProfile, TeamProfile } from "../../contracts/types";
import { formatScore } from "../../shared/score";
import { MATCH_STATUS_BADGE_VARIANT, MATCH_STATUS_LABEL } from "../../shared/match-status";
import { extractYoutubeVideoId } from "../../shared/youtube";

const EVENT_ICON: Record<MatchEvent["kind"], string> = { goal: "⚽", yellow_card: "🟨", red_card: "🟥", foul: "⚠️" };
const EVENT_LABEL: Record<MatchEvent["kind"], string> = {
  goal: "Gol",
  yellow_card: "Cartão amarelo",
  red_card: "Cartão vermelho",
  foul: "Falta",
};

function formatMatchDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function TeamHeader({ team, score }: { team: TeamProfile | null; score: number }) {
  const content = (
    <>
      {team?.crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crestUrl} alt="" className="size-16 shrink-0 rounded-full object-cover shadow-float sm:size-24" />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground sm:size-24">
          {(team?.name ?? "—").slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[9rem] truncate text-center text-sm font-bold text-foreground sm:max-w-[12rem] sm:text-base">
        {team?.name ?? "—"}
      </span>
    </>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
      {team ? (
        <Link href={`/erasto-league/teams/${team.slug}`} className="flex flex-col items-center gap-3 ui-motion-base hover:opacity-80">
          {content}
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-3">{content}</div>
      )}
      <span className="text-2xl font-extrabold tabular-nums text-foreground sm:text-4xl">{formatScore(score)}</span>
    </div>
  );
}

function BroadcastSection({ youtubeUrl }: { youtubeUrl: string | null }) {
  if (!youtubeUrl) {
    return (
      <div className="rounded-panel border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Transmissão ainda não disponível.
      </div>
    );
  }

  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) {
    return (
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-panel border border-border bg-card p-6 text-sm font-bold text-primary hover:underline"
      >
        Assistir no YouTube ↗
      </a>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-panel border border-border bg-card shadow-sm">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Transmissão do jogo"
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function EventRow({
  event,
  homeTeam,
  awayTeam,
  playerById,
}: {
  event: MatchEvent;
  homeTeam: TeamProfile | null;
  awayTeam: TeamProfile | null;
  playerById: Map<string, PlayerProfile>;
}) {
  const player = event.playerId ? playerById.get(event.playerId) : null;
  const team = event.side === "home" ? homeTeam : awayTeam;
  const minuteLabel = event.minuteMs != null ? `${Math.floor(event.minuteMs / 60000)}'` : null;

  return (
    <div className="flex items-center gap-3 rounded-panel border border-border bg-card px-4 py-2.5">
      <span className="text-lg leading-none">{EVENT_ICON[event.kind]}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {EVENT_LABEL[event.kind]}
          {event.kind === "goal" && event.amount !== 1 ? ` (${formatScore(event.amount)})` : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">{player?.name ?? "Sem jogador atribuído"} — {team?.name ?? "—"}</p>
      </div>
      {minuteLabel && <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{minuteLabel}</span>}
    </div>
  );
}

// Página pública de UM jogo — súmula (placar, eventos) + transmissão. DENTRO da shell/tema do host
// (só tokens shadcn), mesmo princípio de team-profile-view.tsx/player-profile-view.tsx.
export function MatchView({
  match,
  homeTeam,
  awayTeam,
  events,
  playerById,
}: {
  match: MatchSummary;
  homeTeam: TeamProfile | null;
  awayTeam: TeamProfile | null;
  events: MatchEvent[];
  playerById: Map<string, PlayerProfile>;
}) {
  const mvpPlayer = match.mvpPlayerId ? (playerById.get(match.mvpPlayerId) ?? null) : null;
  const goalsAndCards = events.filter((event) => event.kind !== "foul");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={MATCH_STATUS_BADGE_VARIANT[match.status]}>{MATCH_STATUS_LABEL[match.status]}</Badge>
          <span className="text-xs text-muted-foreground">
            {match.finishedAt ? formatMatchDateTime(match.finishedAt) : formatMatchDateTime(match.startedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-panel border border-border bg-card p-6 sm:gap-8 sm:p-8">
        <TeamHeader team={homeTeam} score={match.homeScore} />
        <span className="shrink-0 text-lg font-black italic text-muted-foreground sm:text-2xl">×</span>
        <TeamHeader team={awayTeam} score={match.awayScore} />
      </div>

      {mvpPlayer && (
        <div className="flex items-center gap-2 rounded-panel border border-warning bg-warning-soft px-4 py-3">
          <span className="text-lg leading-none">⭐</span>
          <p className="text-sm font-semibold text-foreground">
            MVP: {mvpPlayer.name}
            {match.mvpNote ? <span className="font-normal text-muted-foreground"> — &ldquo;{match.mvpNote}&rdquo;</span> : null}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Transmissão</h2>
        <BroadcastSection youtubeUrl={match.youtubeUrl} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Lances</h2>
        {goalsAndCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum gol ou cartão registrado.</p>
        ) : (
          <div className="space-y-2">
            {goalsAndCards.map((event) => (
              <EventRow key={event.id} event={event} homeTeam={homeTeam} awayTeam={awayTeam} playerById={playerById} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
