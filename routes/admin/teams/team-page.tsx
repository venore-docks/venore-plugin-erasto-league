import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader, Button } from "@venore/plugin-sdk/ui";
import { getTeam } from "../../../runtime/teams";
import { listPlayersByTeam } from "../../../runtime/players";
import { TeamForm } from "./team-form";
import { DeleteTeamControl } from "./delete-team-control";

// /admin/erasto-league/teams/:id — id "new" = formulário em branco (criar), qualquer outro valor
// é o uuid de um time existente (editar). Mesmo formulário serve os dois casos.
export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const isNew = id === "new";
  const team = isNew ? null : await getTeam(id);
  if (!isNew && !team) {
    notFound();
  }

  const crestMediaResult = team?.crestMediaId ? await getMediaAsset({ id: team.crestMediaId }) : null;
  const crestMedia = crestMediaResult?.success ? crestMediaResult.data : null;

  const roster = team ? await listPlayersByTeam(team.id) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isNew ? "Novo time" : team!.name}
        description={isNew ? "Cadastra um time novo pro campeonato." : `/${team!.slug}`}
        actions={
          team && (
            <>
              <Button asChild variant="outline">
                <Link href={`/ext/erasto-league/teams/${team.slug}`} target="_blank" rel="noreferrer">
                  Ver página pública ↗
                </Link>
              </Button>
              <DeleteTeamControl teamId={team.id} teamName={team.name} />
            </>
          )
        }
      />

      <TeamForm team={team} crestMedia={crestMedia} />

      {team && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Elenco</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/erasto-league/players/new?teamId=${team.id}`}>
                <Plus className="size-4" /> Adicionar jogador
              </Link>
            </Button>
          </div>
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado neste time ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-panel border border-border bg-card">
              {roster.map((player) => (
                <li key={player.id}>
                  <Link
                    href={`/admin/erasto-league/players/${player.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/14"
                  >
                    {player.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.photoUrl} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {player.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-foreground">{player.name}</span>
                    {player.number != null && (
                      <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">#{player.number}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
