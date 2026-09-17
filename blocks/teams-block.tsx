import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { listTeams } from "../runtime/teams";
import { listPlayers } from "../runtime/players";
import { computeStandings } from "../runtime/standings";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Grade de times (bloco erasto-league.teams) — cartão por time com recorde (V/E/D), cartões
// (amarelo/vermelho, agregados de match_events via computeStandings) e tamanho do elenco. Linka
// pro perfil público do time, que agora vive DENTRO da shell (rota "public" do plugin, ver
// routes/route-table.ts) — não mais /ext/erasto-league/teams/:slug.
export async function ErastoLeagueTeamsBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Times");
  const [teams, players, standings] = await Promise.all([listTeams(), listPlayers(), computeStandings()]);

  const rosterCountByTeam = new Map<string, number>();
  for (const player of players) {
    rosterCountByTeam.set(player.teamId, (rosterCountByTeam.get(player.teamId) ?? 0) + 1);
  }
  const standingByTeam = new Map(standings.map((row) => [row.teamId, row]));

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum time cadastrado ainda.</p>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
          {teams.map((team) => {
            const standing = standingByTeam.get(team.id);
            const rosterCount = rosterCountByTeam.get(team.id) ?? 0;
            const color = team.primaryColor ?? "var(--muted-foreground)";

            return (
              <Link
                key={team.id}
                href={`/erasto-league/teams/${team.slug}`}
                className="overflow-hidden rounded-panel border border-border bg-card ui-motion-base hover:border-ring hover:shadow-float"
              >
                <div className="h-1.5 w-full" style={{ background: color }} />
                <div className="flex items-center gap-3 p-4">
                  {team.crestUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.crestUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ background: color }}
                    >
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {rosterCount} jogador{rosterCount === 1 ? "" : "es"}
                    </p>
                  </div>
                </div>

                {standing && (
                  <div className="grid grid-cols-5 gap-px border-t border-border bg-border text-center">
                    <div className="bg-card px-1 py-2">
                      <p className="text-sm font-bold tabular-nums text-foreground">{standing.won}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Vit.</p>
                    </div>
                    <div className="bg-card px-1 py-2">
                      <p className="text-sm font-bold tabular-nums text-foreground">{standing.drawn}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Emp.</p>
                    </div>
                    <div className="bg-card px-1 py-2">
                      <p className="text-sm font-bold tabular-nums text-foreground">{standing.lost}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Der.</p>
                    </div>
                    <div className="bg-card px-1 py-2">
                      <p className="text-sm font-bold tabular-nums text-amber-500">{standing.yellowCards}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">🟨</p>
                    </div>
                    <div className="bg-card px-1 py-2">
                      <p className="text-sm font-bold tabular-nums text-destructive">{standing.redCards}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">🟥</p>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
