import Link from "next/link";
import type { MatchSummary, PlayerProfile, TeamProfile } from "../../contracts/types";
import type { PlayerStats } from "../../runtime/stats";
import { formatScore } from "../../shared/score";
import { PLAYER_POSITION_LABEL } from "../../shared/player-position";

function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

const RESULT_STYLE: Record<"win" | "draw" | "loss", { label: string; className: string }> = {
  win: { label: "V", className: "bg-success-soft text-success" },
  draw: { label: "E", className: "bg-warning-soft text-warning" },
  loss: { label: "D", className: "bg-destructive/10 text-destructive" },
};

// Perfil público do jogador — DENTRO da shell/tema do host, mesmo princípio do team-profile-view.tsx
// (só tokens shadcn; team?.primaryColor é dado do cadastro, não decisão de design, misturado em
// var(--card) via color-mix como o hero-block já faz com config.accentColor).
export function PlayerProfileView({
  player,
  team,
  stats,
  recentMatches,
  teamById,
}: {
  player: PlayerProfile;
  team: TeamProfile | null;
  stats: PlayerStats;
  recentMatches: MatchSummary[];
  teamById: Map<string, TeamProfile>;
}) {
  const color = team?.primaryColor ?? "var(--muted-foreground)";

  return (
    <div className="space-y-8">
      <div
        className="flex items-center gap-5 rounded-panel border border-border p-6"
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 14%, var(--card)), var(--card) 75%)` }}
      >
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photoUrl} alt="" className="size-20 shrink-0 rounded-full object-cover shadow-float sm:size-24" />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground shadow-float sm:size-24">
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
          <h1 className="mt-1 inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {player.name}
            {player.isCaptain && (
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                title="Capitão"
              >
                C
              </span>
            )}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {player.number != null && <span className="font-bold tabular-nums text-foreground">#{player.number}</span>}
            {player.position && <span>{PLAYER_POSITION_LABEL[player.position]}</span>}
            {team && (
              <Link href={`/erasto-league/teams/${team.slug}`} className="ui-motion-base hover:text-foreground hover:underline">
                {team.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {stats.matchesPlayed > 0 && (
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-5">
          {[
            { label: "Gols", value: formatScore(stats.goals) },
            { label: "Jogos", value: stats.matchesPlayed },
            { label: "MVPs", value: stats.mvpCount },
            { label: "🟨 Amarelos", value: stats.yellowCards },
            { label: "🟥 Vermelhos", value: stats.redCards },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-2 py-3 text-center">
              <p className="text-xl font-extrabold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {player.bio && <p className="max-w-2xl text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{player.bio}</p>}

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Últimos jogos</h2>
        {recentMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma partida encerrada ainda.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {recentMatches.map((match) => {
              const isHome = match.homeTeamId === player.teamId;
              const ownScore = isHome ? match.homeScore : match.awayScore;
              const opponentScore = isHome ? match.awayScore : match.homeScore;
              const opponent = teamById.get(isHome ? match.awayTeamId : match.homeTeamId);
              const result = ownScore > opponentScore ? "win" : ownScore < opponentScore ? "loss" : "draw";
              const resultStyle = RESULT_STYLE[result];
              return (
                <Link
                  key={match.id}
                  href={`/erasto-league/jogos/${match.id}`}
                  className="flex items-center gap-3 rounded-panel border border-border bg-card px-4 py-3 ui-motion-base hover:border-ring"
                >
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${resultStyle.className}`}>
                    {resultStyle.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">vs {opponent?.name ?? "—"}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {formatScore(ownScore)} × {formatScore(opponentScore)}
                  </span>
                  {match.finishedAt && <span className="shrink-0 text-xs text-muted-foreground">{formatMatchDate(match.finishedAt)}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
