import Link from "next/link";
import type { MatchSummary, PlayerProfile, TeamProfile } from "../../contracts/types";
import type { PlayerStats } from "../../runtime/stats";
import { formatScore } from "../../shared/score";
import { PLAYER_POSITION_LABEL } from "../../shared/player-position";

function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

// Prêmios do jogador numa partida (routes/players-public/page.tsx mergeAwards) — MVP oficial
// (súmula) e/ou Jogador da Torcida (votação encerrada).
export type PlayerAward = { match: MatchSummary; mvp: boolean; fanVote: boolean };

const RESULT_STYLE: Record<"win" | "draw" | "loss", { label: string; className: string }> = {
  win: { label: "V", className: "bg-success-soft text-success" },
  draw: { label: "E", className: "bg-warning-soft text-warning" },
  loss: { label: "D", className: "bg-destructive/10 text-destructive" },
};

// Perfil público do jogador — DENTRO da shell/tema do host, mesmo princípio do team-profile-view.tsx
// (só tokens shadcn; team?.primaryColor é dado do cadastro, não decisão de design, misturado em
// var(--card) via color-mix como o hero-block já faz com config.accentColor).
// "vs <adversário>" do ponto de vista do time ATUAL do jogador; se ele trocou de time depois do
// jogo, mostra o confronto inteiro.
function describeOpponent(match: MatchSummary, playerTeamId: string, teamById: Map<string, TeamProfile>): string {
  const nameOf = (id: string) => teamById.get(id)?.name ?? "—";
  if (match.homeTeamId === playerTeamId) return `vs ${nameOf(match.awayTeamId)}`;
  if (match.awayTeamId === playerTeamId) return `vs ${nameOf(match.homeTeamId)}`;
  return `${nameOf(match.homeTeamId)} × ${nameOf(match.awayTeamId)}`;
}

export function PlayerProfileView({
  player,
  team,
  stats,
  fanVoteWins,
  awards,
  recentMatches,
  teamById,
}: {
  player: PlayerProfile;
  team: TeamProfile | null;
  stats: PlayerStats;
  // Quantas vezes foi o Jogador da Torcida (votação encerrada, empate no topo conta).
  fanVoteWins: number;
  awards: PlayerAward[];
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

      {(stats.matchesPlayed > 0 || awards.length > 0) && (
        // Gols, MVPs e Jogador da Torcida primeiro (1ª linha no celular) — os números que a torcida
        // procura; jogos e cartões depois.
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-6">
          {[
            { label: "⚽ Gols", value: formatScore(stats.goals) },
            { label: "⭐ MVPs", value: stats.mvpCount },
            { label: "📣 Jogador da Torcida", value: fanVoteWins },
            { label: "Jogos", value: stats.matchesPlayed },
            { label: "🟨 Amarelos", value: stats.yellowCards },
            { label: "🟥 Vermelhos", value: stats.redCards },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-2 py-3 text-center">
              <p className="text-xl font-extrabold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {player.bio && <p className="max-w-2xl text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{player.bio}</p>}

      {awards.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Prêmios</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {awards.map((award) => (
              <Link
                key={award.match.id}
                href={`/erasto-league/jogos/${award.match.id}`}
                className="flex flex-col gap-1.5 rounded-panel border border-border bg-card px-4 py-3 ui-motion-base hover:border-ring"
              >
                <span className="flex flex-wrap gap-1.5">
                  {award.mvp && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning">⭐ MVP</span>}
                  {award.fanVote && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">📣 Jogador da Torcida</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {describeOpponent(award.match, player.teamId, teamById)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatMatchDate(award.match.finishedAt ?? award.match.startedAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
