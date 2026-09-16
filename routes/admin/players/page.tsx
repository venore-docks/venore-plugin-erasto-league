import Link from "next/link";
import { Users } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, Button, EmptyState } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { listPlayers } from "../../../runtime/players";
import { listTeams } from "../../../runtime/teams";

// Lista de jogadores cadastrados (/admin/erasto-league/players) — igual a times, sempre cadastro
// de admin. Agrupa visualmente por time só pra leitura mais fácil (sem seções colapsáveis, é uma
// lista pequena de campeonato interno).
export default async function PlayersAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [players, teams] = await Promise.all([listPlayers(), listTeams()]);
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

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
          {players.map((player) => (
            <li key={player.id} className="flex items-center justify-between px-4 py-2.5">
              <Link href={`/admin/erasto-league/players/${player.id}`} className="text-sm text-foreground hover:underline">
                {player.number != null ? `#${player.number} ` : ""}
                {player.name}
              </Link>
              <span className="text-xs text-muted-foreground">{teamNameById.get(player.teamId) ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
