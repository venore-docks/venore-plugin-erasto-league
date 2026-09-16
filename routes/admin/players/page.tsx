import Link from "next/link";
import { Users } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, Button, EmptyState } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { listPlayers } from "../../../runtime/players";
import { listTeams } from "../../../runtime/teams";
import { PLAYER_GENDER_LABEL } from "../../../shared/player-gender";

// Lista de jogadores cadastrados (/admin/erasto-league/players) — igual a times, sempre cadastro
// de admin. Agrupa visualmente por time só pra leitura mais fácil (sem seções colapsáveis, é uma
// lista pequena de campeonato interno).
export default async function PlayersAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [players, teams] = await Promise.all([listPlayers(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Jogadores"
        description="Cadastro de jogadores — número, foto e time."
        actions={
          <Button asChild>
            <Link href="/admin/erasto-league/players/new">Novo jogador</Link>
          </Button>
        }
      />

      {players.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" strokeWidth={1.5} />}
          title="Nenhum jogador cadastrado"
          description={
            teams.length === 0
              ? "Cadastre um time primeiro, depois adicione os jogadores dele."
              : "Cadastre o primeiro jogador de um time."
          }
          action={
            teams.length > 0 && (
              <Button asChild>
                <Link href="/admin/erasto-league/players/new">Novo jogador</Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-panel border border-border bg-card">
          {players.map((player) => {
            const team = teamById.get(player.teamId);
            return (
              <li key={player.id}>
                <Link
                  href={`/admin/erasto-league/players/${player.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/14"
                >
                  {player.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.photoUrl} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-foreground">{player.name}</span>
                  {player.isCaptain && (
                    <span
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
                      title="Capitão"
                    >
                      C
                    </span>
                  )}
                  {player.gender && <span className="text-xs text-muted-foreground">{PLAYER_GENDER_LABEL[player.gender]}</span>}
                  {player.number != null && (
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">#{player.number}</span>
                  )}
                  {team && (
                    <span
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      <span className="size-2 rounded-full" style={{ background: team.primaryColor ?? "#334155" }} />
                      {team.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
