import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getTeamBySlug } from "../runtime/teams";
import { computeStandings } from "../runtime/standings";
import { formatScore } from "../shared/score";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Card compacto de um time específico — o dispatch do core (block-renderer.tsx) já garante que
// teamSlug não chega vazio aqui (requiredDataFields em blocks/team-spotlight.ts); o que sobra pra
// tratar é um slug que não bate com nenhum time cadastrado (typo, time apagado).
export async function ErastoLeagueTeamSpotlightBlock({ block, mode }: BlockRendererProps) {
  const teamSlug = readString(block.data, "teamSlug");
  const team = await getTeamBySlug(teamSlug);

  if (!team) {
    if (mode === "edit") {
      return (
        <div className="rounded-panel border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
          Time em destaque: nenhum time cadastrado com o slug &quot;{teamSlug}&quot;.
        </div>
      );
    }
    return null;
  }

  const standings = await computeStandings();
  const standing = standings.find((row) => row.teamId === team.id) ?? null;

  return (
    <Link
      href={`/ext/erasto-league/teams/${team.slug}`}
      className="group flex items-center gap-4 overflow-hidden rounded-panel border border-border bg-card p-5 transition-colors hover:border-ring"
    >
      {team.crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crestUrl} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
      ) : (
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ background: team.primaryColor ?? "#334155" }}
        >
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold text-foreground">{team.name}</p>
        {standing && standing.played > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {standing.points} pts · {standing.won}V {standing.drawn}E {standing.lost}D · saldo{" "}
            {standing.goalsFor - standing.goalsAgainst > 0 ? "+" : ""}
            {formatScore(standing.goalsFor - standing.goalsAgainst)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Ainda sem partidas encerradas.</p>
        )}
      </div>
    </Link>
  );
}
