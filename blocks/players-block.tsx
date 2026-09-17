import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { listPlayers } from "../runtime/players";
import { listTeams } from "../runtime/teams";
import { playerGenderAccent } from "../shared/player-gender";
import { PLAYER_POSITION_LABEL } from "../shared/player-position";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Grade de jogadores (bloco erasto-league.players) — espelha teams-block.tsx (mesmo grid, mesma
// filosofia de sempre ler do banco na hora de renderizar). A faixa colorida no topo do card usa a
// cor do GÊNERO (chart-6/chart-7, ver shared/player-gender.ts) em vez da cor do time — o bloco de
// times já cobre "cor por time"; este é o único lugar pensado pra bater o olho e diferenciar
// masculino/feminino num campeonato misto.
export async function ErastoLeaguePlayersBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Jogadores");
  const [players, teams] = await Promise.all([listPlayers(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado ainda.</p>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
          {players.map((player) => {
            const team = teamById.get(player.teamId);
            const accent = playerGenderAccent(player.gender);

            return (
              <Link
                key={player.id}
                href={`/erasto-league/players/${player.slug}`}
                className="overflow-hidden rounded-panel border border-border bg-card ui-motion-base hover:border-ring hover:shadow-float"
              >
                <div className="h-1.5 w-full" style={{ background: accent ?? "var(--border)" }} />
                <div className="flex items-center gap-3 p-4">
                  {player.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.photoUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                      {player.number != null && <span className="tabular-nums text-muted-foreground">#{player.number}</span>}
                      {player.name}
                      {player.isCaptain && (
                        <span
                          className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
                          title="Capitão"
                        >
                          C
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {team?.name ?? "—"}
                      {player.position && ` · ${PLAYER_POSITION_LABEL[player.position]}`}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
