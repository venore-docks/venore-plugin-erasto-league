import Link from "next/link";
import { Shield, Users } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, Button, EmptyState } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { listTeams } from "../../../runtime/teams";
import { listPlayers } from "../../../runtime/players";

// Lista de times cadastrados (/admin/erasto-league/teams) — cadastro é sempre feito por um admin,
// nunca pelos alunos (ver contexto no README/plano interno).
export default async function TeamsAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [teams, players] = await Promise.all([listTeams(), listPlayers()]);
  const rosterCountByTeam = new Map<string, number>();
  for (const player of players) {
    rosterCountByTeam.set(player.teamId, (rosterCountByTeam.get(player.teamId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Times"
        description="Cadastro de times do campeonato — brasão, cores, descrição e elenco."
        actions={
          <Button asChild>
            <Link href="/admin/erasto-league/teams/new">Novo time</Link>
          </Button>
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={<Shield className="size-8" strokeWidth={1.5} />}
          title="Nenhum time cadastrado"
          description="Cadastre o primeiro time pra poder escolhê-lo no controle da partida."
          action={
            <Button asChild>
              <Link href="/admin/erasto-league/teams/new">Novo time</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/admin/erasto-league/teams/${team.id}`}
              className="group overflow-hidden rounded-panel border border-border bg-card transition-colors hover:border-ring"
            >
              <div className="h-1.5 w-full" style={{ background: team.primaryColor ?? "#334155" }} />
              <div className="flex items-center gap-3 p-4">
                {team.crestUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={team.crestUrl} alt="" className="size-12 rounded-lg object-cover" />
                ) : (
                  <div
                    className="flex size-12 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ background: team.primaryColor ?? "#334155" }}
                  >
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-foreground">{team.name}</p>
                  <p className="truncate text-xs text-muted-foreground">/{team.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {rosterCountByTeam.get(team.id) ?? 0}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
