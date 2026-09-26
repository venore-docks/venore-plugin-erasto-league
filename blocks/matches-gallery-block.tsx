import Link from "next/link";
import type { CSSProperties } from "react";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { listMatches } from "../runtime/matches";
import { listTeams } from "../runtime/teams";
import { listFixtures } from "../runtime/fixtures";
import { formatScore } from "../shared/score";
import { describeFixtureStage, describeMatchDate } from "../shared/match-labels";
import { youtubeThumbnailUrl } from "../shared/youtube";
import { YoutubeThumbnail } from "./youtube-thumbnail";
import type { Fixture, MatchSummary, TeamProfile } from "../contracts/types";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function TeamCrest({ team, size }: { team: TeamProfile | undefined; size: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "size-14 sm:size-16" : "size-6";
  if (team?.crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crestUrl}
        alt=""
        loading="lazy"
        className={`${sizeClass} shrink-0 rounded-full object-cover ${size === "lg" ? "shadow-float" : "border border-border/60"}`}
      />
    );
  }
  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground ${
        size === "lg" ? "text-base shadow-float" : "text-[9px]"
      }`}
    >
      {(team?.name ?? "—").slice(0, 2).toUpperCase()}
    </span>
  );
}

// Fundo de reserva do card: cor de cada time (dado do cadastro, misturado nos tokens do tema via
// color-mix — mesmo princípio de routes/players-public) e os dois brasões. Sempre renderizado: sem
// link do YouTube é o que aparece; com link, fica por baixo da miniatura (blocks/youtube-thumbnail.tsx)
// e reaparece se ela não carregar.
function fallbackBackground(home: TeamProfile | undefined, away: TeamProfile | undefined): CSSProperties {
  const homeColor = home?.primaryColor ?? "var(--muted-foreground)";
  const awayColor = away?.primaryColor ?? "var(--muted-foreground)";
  return {
    background: `linear-gradient(115deg, color-mix(in srgb, ${homeColor} 45%, var(--muted)) 0%, var(--muted) 46%, var(--muted) 54%, color-mix(in srgb, ${awayColor} 45%, var(--muted)) 100%)`,
  };
}

function Thumbnail({ match, home, away }: { match: MatchSummary; home: TeamProfile | undefined; away: TeamProfile | undefined }) {
  const thumbnailUrl = youtubeThumbnailUrl(match.youtubeUrl);

  return (
    <div className="relative aspect-video overflow-hidden bg-muted">
      <div className="flex size-full items-center justify-center gap-4 sm:gap-6" style={fallbackBackground(home, away)}>
        <TeamCrest team={home} size="lg" />
        <span className="text-lg font-black italic text-muted-foreground">×</span>
        <TeamCrest team={away} size="lg" />
      </div>
      {thumbnailUrl && <YoutubeThumbnail src={thumbnailUrl} />}

      {match.status === "in_progress" && (
        <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground shadow-sm">
          ● Ao vivo
        </span>
      )}

      {thumbnailUrl ? (
        <span className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm ui-motion-base group-hover:bg-primary group-hover:text-primary-foreground">
          <svg viewBox="0 0 24 24" className="size-4 translate-x-px" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      ) : (
        <span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
          Vídeo em breve
        </span>
      )}
    </div>
  );
}

// Vencedor com o mesmo destaque (text-success) dos cards de resultado/agenda — só depois de
// encerrado; ao vivo, placar sem destaque.
function TeamLine({ team, score, won, lost }: { team: TeamProfile | undefined; score: number; won: boolean; lost: boolean }) {
  const tone = won ? "font-bold text-success" : lost ? "font-medium text-muted-foreground" : "font-semibold text-foreground";
  return (
    <div className="flex items-center gap-2">
      <TeamCrest team={team} size="sm" />
      <span className={`min-w-0 flex-1 truncate text-sm ${tone}`}>{team?.name ?? "—"}</span>
      <span className={`shrink-0 text-sm tabular-nums ${tone}`}>{formatScore(score)}</span>
    </div>
  );
}

function MatchCard({
  match,
  home,
  away,
  fixture,
}: {
  match: MatchSummary;
  home: TeamProfile | undefined;
  away: TeamProfile | undefined;
  fixture: Fixture | undefined;
}) {
  const finished = match.status === "finished";
  const homeWon = finished && match.homeScore > match.awayScore;
  const awayWon = finished && match.awayScore > match.homeScore;
  const caption = [describeFixtureStage(fixture), describeMatchDate(match.startedAt, fixture)].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/erasto-league/jogos/${match.id}`}
      className="group flex flex-col overflow-hidden rounded-panel border border-border bg-card shadow-sm ui-motion-base hover:border-ring"
    >
      <Thumbnail match={match} home={home} away={away} />
      <div className="space-y-1.5 p-3">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{caption}</p>
        <TeamLine team={home} score={match.homeScore} won={homeWon} lost={awayWon} />
        <TeamLine team={away} score={match.awayScore} won={awayWon} lost={homeWon} />
      </div>
    </Link>
  );
}

// Jogos e transmissões — acervo inteiro de partidas salvas (súmulas), mais recente primeiro, em
// grade de cards. A miniatura vem da CDN do YouTube (shared/youtube.ts youtubeThumbnailUrl), nunca
// da capa gerada em /api/erasto-league/matches/:id/cover: com dezenas de jogos na mesma página,
// gerar/revalidar uma capa por card custaria CPU da Vercel à toa — e quando o admin sobe a capa no
// YouTube, a miniatura já É a capa. "cancelled" (legado) fica de fora.
export async function ErastoLeagueMatchesGalleryBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Jogos");
  const onlyBroadcast = readString(block.data, "filter", "all") === "broadcast";

  const [matches, teams, fixtures] = await Promise.all([listMatches(), listTeams(), listFixtures()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const fixtureByMatchId = new Map(fixtures.filter((fixture) => fixture.matchId).map((fixture) => [fixture.matchId!, fixture]));
  const visible = matches.filter((match) => match.status !== "cancelled" && (!onlyBroadcast || match.youtubeUrl));

  return (
    <div className="space-y-4">
      {(title || visible.length > 0) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}
          {visible.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {visible.length} jogo{visible.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {onlyBroadcast ? "Nenhum jogo com transmissão ainda." : "Nenhum jogo salvo ainda."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              home={teamById.get(match.homeTeamId)}
              away={teamById.get(match.awayTeamId)}
              fixture={fixtureByMatchId.get(match.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
