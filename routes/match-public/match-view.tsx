import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@venore/plugin-sdk/ui";
import type { MatchEvent, MatchSummary, PlayerProfile, PowerBoost, PowerBoostUse, TeamProfile } from "../../contracts/types";
import type { FanVoteLeader } from "../../runtime/fan-votes";
import { formatScore } from "../../shared/score";
import { MATCH_STATUS_BADGE_VARIANT, MATCH_STATUS_LABEL } from "../../shared/match-status";
import { extractYoutubeVideoId } from "../../shared/youtube";
import { matchCoverPath } from "../../shared/match-cover-layout";

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

function BoostRow({
  boost,
  homeTeam,
  awayTeam,
  powerBoosts,
}: {
  boost: PowerBoostUse;
  homeTeam: TeamProfile | null;
  awayTeam: TeamProfile | null;
  powerBoosts: PowerBoost[];
}) {
  const catalogEntry = powerBoosts.find((entry) => entry.key === boost.boostKey);
  const team = boost.side === "home" ? homeTeam : awayTeam;
  const minuteLabel = boost.minuteMs != null ? `${Math.floor(boost.minuteMs / 60000)}'` : null;

  return (
    <div className="flex items-center gap-3 rounded-panel border border-border bg-card px-4 py-2.5">
      <span className="text-lg leading-none">{catalogEntry?.emoji ?? "⚡"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{catalogEntry?.label ?? boost.boostKey}</p>
        <p className="truncate text-xs text-muted-foreground">{team?.name ?? "—"}</p>
      </div>
      {minuteLabel && <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{minuteLabel}</span>}
    </div>
  );
}

type FanVoteSummary = { isOpen: boolean; leaders: FanVoteLeader[]; leaderPercent: number; totalVotes: number };

function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

// Jogador da Torcida (votação aberta, routes/vote-public) — chamada pra votar enquanto aberta,
// líder parcial/vencedor final quando já tem voto. Empate no topo: todos os empatados levam (mesma
// regra do perfil do jogador, shared/fan-votes.ts resolveTopChoiceIds). Separado do MVP oficial
// (escolhido pelo admin).
function FanVoteCallout({ matchId, fanVote }: { matchId: string; fanVote: FanVoteSummary }) {
  const { isOpen, leaders, leaderPercent, totalVotes } = fanVote;
  if (!isOpen && leaders.length === 0) return null;

  const votesLabel = (votes: number) => `${votes} voto${votes === 1 ? "" : "s"}`;
  let detail: ReactNode;
  if (leaders.length === 0) {
    detail = " — votação aberta, ninguém votou ainda";
  } else if (leaders.length === 1) {
    detail = (
      <>
        {" "}
        — {isOpen ? "liderando" : "vencedor"}: <span className="font-semibold text-foreground">{leaders[0].name}</span> ({leaderPercent}% de{" "}
        {votesLabel(totalVotes)})
      </>
    );
  } else {
    detail = (
      <>
        {" "}
        — {isOpen ? "empate na liderança" : "empate, vencedores"}:{" "}
        <span className="font-semibold text-foreground">{joinNames(leaders.map((leader) => leader.name))}</span> ({votesLabel(leaders[0].votes)}{" "}
        cada, de {totalVotes})
      </>
    );
  }

  return (
    <Link
      href={`/erasto-league/votar/jogo/${matchId}`}
      className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-card px-4 py-3 ui-motion-base hover:bg-muted/40"
    >
      <span className="text-lg leading-none">📣</span>
      <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
        Jogador da Torcida
        <span className="font-normal text-muted-foreground">{detail}</span>
      </p>
      <span className="shrink-0 text-sm font-bold text-primary">{isOpen ? "Votar →" : "Ver resultado →"}</span>
    </Link>
  );
}

// Página pública de UM jogo — súmula (placar, eventos) + transmissão. DENTRO da shell/tema do host
// (só tokens shadcn), mesmo princípio de team-profile-view.tsx/player-profile-view.tsx. Com foto
// salva na súmula, a capa gerada (/api/erasto-league/matches/:id/cover — a mesma que vai pro
// YouTube) abre a página.
export function MatchView({
  match,
  homeTeam,
  awayTeam,
  events,
  playerById,
  boosts,
  powerBoosts,
  fanVote,
}: {
  match: MatchSummary;
  homeTeam: TeamProfile | null;
  awayTeam: TeamProfile | null;
  events: MatchEvent[];
  playerById: Map<string, PlayerProfile>;
  boosts: PowerBoostUse[];
  powerBoosts: PowerBoost[];
  fanVote: FanVoteSummary;
}) {
  const mvpPlayer = match.mvpPlayerId ? (playerById.get(match.mvpPlayerId) ?? null) : null;
  const goalsAndCards = events.filter((event) => event.kind !== "foul");

  return (
    <div className="space-y-8">
      {match.coverMediaId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={matchCoverPath(match.id, match.coverMediaId)}
          alt={`${homeTeam?.name ?? "—"} × ${awayTeam?.name ?? "—"}`}
          className="aspect-video w-full rounded-panel border border-border bg-muted object-cover shadow-sm"
        />
      )}

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

      <FanVoteCallout matchId={match.id} fanVote={fanVote} />

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

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Power plays</h2>
        {boosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum power play usado.</p>
        ) : (
          <div className="space-y-2">
            {boosts.map((boost) => (
              <BoostRow key={boost.id} boost={boost} homeTeam={homeTeam} awayTeam={awayTeam} powerBoosts={powerBoosts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
