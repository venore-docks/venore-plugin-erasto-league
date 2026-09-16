import Link from "next/link";
import { Shield } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, Button, EmptyState } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { listTeams } from "../../../runtime/teams";

// Lista de times cadastrados (/admin/erasto-league/teams) — cadastro é sempre feito por um admin,
// nunca pelos alunos (ver contexto no README/plano interno).
export default async function TeamsAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const teams = await listTeams();

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
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/admin/erasto-league/teams/${team.id}`}
              className="flex items-center gap-3 rounded-panel border border-border bg-card p-3 hover:bg-accent/14"
            >
              {team.crestUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.crestUrl} alt="" className="size-10 rounded-md object-cover" />
              ) : (
                <div
                  className="flex size-10 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ background: team.primaryColor ?? "#334155" }}
                >
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{team.name}</p>
                <p className="truncate text-xs text-muted-foreground">/{team.slug}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
