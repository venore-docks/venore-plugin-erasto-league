import Link from "next/link";
import type { MatchSummary, PlayerProfile, TeamProfile, TeamStanding } from "../../contracts/types";
import { formatScore } from "../../shared/score";
import { playerGenderAccent } from "../../shared/player-gender";

function formatFoundedDate(iso: string | null): string | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return null;
  return `Fundado em ${day}/${month}/${year}`;
}

function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

const RESULT_STYLE: Record<"win" | "draw" | "loss", { label: string; className: string }> = {
  win: { label: "V", className: "bg-success-soft text-success" },
  draw: { label: "E", className: "bg-warning-soft text-warning" },
  loss: { label: "D", className: "bg-destructive/10 text-destructive" },
};

// Perfil público do time — DENTRO da shell/tema do host (rota "public", ver routes/route-table.ts),
// por isso só tokens shadcn (bg-card, text-foreground...), nunca cor fixa: a página inteira
// respeita light/dark do site como qualquer outra. A única cor "livre" é team.primaryColor, dado
// do cadastro (não decisão de design) — mesmo uso que hero-block.tsx faz de config.accentColor,
// misturado em var(--card) via color-mix, nunca aplicado puro.
export function TeamProfileView({
  team,
  roster,
  recentMatches,
  standing,
  teamById,
}: {
  team: TeamProfile;
  roster: PlayerProfile[];
  recentMatches: MatchSummary[];
  standing: TeamStanding | null;
  teamById: Map<string, TeamProfile>;
}) {
  const founded = formatFoundedDate(team.foundedDate);
  const color = team.primaryColor ?? "var(--muted-foreground)";
  const goalDiff = standing ? standing.goalsFor - standing.goalsAgainst : 0;

  return (
    <div className="space-y-8">
      <div
        className="flex items-center gap-5 rounded-panel border border-border p-6"
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 14%, var(--card)), var(--card) 75%)` }}
      >
        {team.crestUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.crestUrl} alt="" className="size-20 shrink-0 rounded-2xl object-cover shadow-float sm:size-24" />
        ) : (
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-float sm:size-24"
            style={{ background: color }}
          >
            {team.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">{team.name}</h1>
          {founded && <p className="mt-1 text-sm text-muted-foreground">{founded}</p>}
        </div>
      </div>

      {standing && standing.played > 0 && (
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-6">
          {[
            { label: "Pontos", value: standing.points },
            { label: "Jogos", value: standing.played },
            { label: "Vitórias", value: standing.won },
            { label: "Empates", value: standing.drawn },
            { label: "Derrotas", value: standing.lost },
            { label: "Saldo", value: `${goalDiff > 0 ? "+" : ""}${formatScore(goalDiff)}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-2 py-3 text-center">
              <p className="text-xl font-extrabold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {team.description && <p className="max-w-2xl text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{team.description}</p>}

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Últimos jogos</h2>
        {recentMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma partida encerrada ainda.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {recentMatches.map((match) => {
              const isHome = match.homeTeamId === team.id;
              const ownScore = isHome ? match.homeScore : match.awayScore;
              const opponentScore = isHome ? match.awayScore : match.homeScore;
              const opponent = teamById.get(isHome ? match.awayTeamId : match.homeTeamId);
              const result = ownScore > opponentScore ? "win" : ownScore < opponentScore ? "loss" : "draw";
              const resultStyle = RESULT_STYLE[result];
              return (
                <Link
                  key={match.id}
                  href={opponent ? `/erasto-league/teams/${opponent.slug}` : "#"}
                  className="flex items-center gap-3 rounded-panel border border-border bg-card px-4 py-3 ui-motion-base hover:border-ring"
                >
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${resultStyle.className}`}>
                    {resultStyle.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{opponent?.name ?? "—"}</span>
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

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Elenco</h2>
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {roster.map((player) => {
              const accent = playerGenderAccent(player.gender);
              return (
              <Link
                key={player.id}
                href={`/erasto-league/players/${player.slug}`}
                className="flex flex-col items-center gap-2 rounded-panel border border-border bg-card p-4 text-center ui-motion-base hover:border-ring"
              >
                {player.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.photoUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-full border-2 object-cover"
                    style={{ borderColor: accent ?? "transparent" }}
                  />
                ) : (
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 bg-muted text-sm font-bold text-muted-foreground"
                    style={{ borderColor: accent ?? "transparent" }}
                  >
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  {player.name}
                  {player.isCaptain && (
                    <span
                      className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
                      title="Capitão"
                    >
                      C
                    </span>
                  )}
                </span>
                {player.number != null && <span className="text-xs font-bold tabular-nums text-muted-foreground">#{player.number}</span>}
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
