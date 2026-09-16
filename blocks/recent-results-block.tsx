import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { listFinishedMatches } from "../runtime/matches";
import { listTeams } from "../runtime/teams";
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
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function TeamChip({ team }: { team: TeamProfile }) {
  return (
    <Link href={`/ext/erasto-league/teams/${team.slug}`} className="flex items-center gap-1.5 font-medium text-foreground hover:underline">
      {team.crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crestUrl} alt="" className="size-5 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[8px] font-bold text-muted-foreground">
          {team.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      {team.name}
    </Link>
  );
}

// Últimos resultados — mesma filosofia de standings-block.tsx (sempre lido na hora, nunca salvo na
// composição).
export async function ErastoLeagueRecentResultsBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Últimos resultados");
  const limit = readNumber(block.data, "limit", 5);

  const [matches, teams] = await Promise.all([listFinishedMatches(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const recent = matches.slice(0, limit);

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma partida encerrada ainda.</p>
      ) : (
        <ul className="divide-y divide-border rounded-panel border border-border bg-card">
          {recent.map((match) => {
            const home = teamById.get(match.homeTeamId);
            const away = teamById.get(match.awayTeamId);
            return (
              <li key={match.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  {home && <TeamChip team={home} />}
                  <span className="font-bold text-foreground">
                    {formatScore(match.homeScore)} × {formatScore(match.awayScore)}
                  </span>
                  {away && <TeamChip team={away} />}
                </div>
                {match.finishedAt && <span className="text-xs text-muted-foreground">{formatMatchDate(match.finishedAt)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
