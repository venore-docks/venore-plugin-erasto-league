import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { listFinishedMatches } from "../runtime/matches";
import { listTeams } from "../runtime/teams";
import { getPlayer } from "../runtime/players";
import { formatScore } from "../shared/score";
import type { TeamProfile } from "../contracts/types";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

// won/lost decide o peso/cor do nome — sutil de propósito (mesmo vocabulário success/destructive de
// RESULT_STYLE em team-profile-view.tsx/player-profile-view.tsx), sem pill: o placar central já é o
// elemento de maior destaque do card, isso aqui só ajuda o olho a achar quem ganhou sem disputar
// atenção com ele.
function TeamChip({ team, align, won, lost }: { team: TeamProfile; align: "left" | "right"; won: boolean; lost: boolean }) {
  return (
    <Link
      href={`/erasto-league/teams/${team.slug}`}
      className={`flex min-w-0 flex-1 items-center gap-2 hover:opacity-80 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {team.crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.crestUrl}
          alt=""
          className={`size-8 shrink-0 rounded-full border object-cover shadow-sm ${won ? "border-success/50" : "border-border/60"}`}
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {team.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className={`truncate text-sm ${won ? "font-bold text-success" : lost ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}>
        {team.name}
      </span>
    </Link>
  );
}

// Últimos resultados — mesma filosofia de standings-block.tsx (sempre lido na hora, nunca salvo na
// composição). Visual em linha com a agenda de jogos (schedule-block.tsx) — cartão com placar em
// destaque no centro, brasão dos dois lados.
export async function ErastoLeagueRecentResultsBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Últimos resultados");
  const limit = readNumber(block.data, "limit", 5);

  const [matches, teams] = await Promise.all([listFinishedMatches(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const recent = matches.slice(0, limit);

  // Nome do MVP resolvido só pros jogos exibidos (não a lista inteira de partidas encerradas) — o
  // mesmo custo baixo de resolveMediaUrl-por-item já usado em listTopScorers.
  const mvpIds = [...new Set(recent.map((match) => match.mvpPlayerId).filter((id): id is string => Boolean(id)))];
  const mvpPlayers = await Promise.all(mvpIds.map((id) => getPlayer(id)));
  const mvpNameById = new Map(mvpPlayers.filter((player) => player).map((player) => [player!.id, player!.name]));

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma partida encerrada ainda.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((match) => {
            const home = teamById.get(match.homeTeamId);
            const away = teamById.get(match.awayTeamId);
            const homeWon = match.homeScore > match.awayScore;
            const awayWon = match.awayScore > match.homeScore;
            return (
              <div
                key={match.id}
                className="flex items-center gap-3 rounded-panel border border-border bg-card px-4 py-3 shadow-sm transition hover:border-primary/40"
              >
                {home && <TeamChip team={home} align="left" won={homeWon} lost={awayWon} />}

                <div className="flex shrink-0 flex-col items-center gap-0.5 px-1">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold tabular-nums text-primary">
                    {formatScore(match.homeScore)}-{formatScore(match.awayScore)}
                  </span>
                  {match.finishedAt && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{formatMatchDate(match.finishedAt)}</span>
                  )}
                  {match.mvpPlayerId && mvpNameById.has(match.mvpPlayerId) && (
                    <span className="mt-0.5 max-w-[7rem] truncate text-[9px] font-bold uppercase tracking-wide text-warning" title={`MVP: ${mvpNameById.get(match.mvpPlayerId)}`}>
                      ⭐ {mvpNameById.get(match.mvpPlayerId)}
                    </span>
                  )}
                </div>

                {away && <TeamChip team={away} align="right" won={awayWon} lost={homeWon} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
