import Link from "next/link";
import { notFound } from "next/navigation";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader } from "@venore/plugin-sdk/ui";
import { getTeam } from "../../../runtime/teams";
import { listPlayersByTeam } from "../../../runtime/players";
import { TeamForm } from "./team-form";

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
      />

      <TeamForm team={team} crestMedia={crestMedia} />

      {team && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Elenco</h2>
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado neste time ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-panel border border-border bg-card">
              {roster.map((player) => (
                <li key={player.id} className="flex items-center justify-between px-4 py-2.5">
                  <Link href={`/admin/erasto-league/players/${player.id}`} className="text-sm text-foreground hover:underline">
                    {player.number != null ? `#${player.number} ` : ""}
                    {player.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/admin/erasto-league/players/new?teamId=${team.id}`}
            className="inline-block text-sm font-medium text-foreground hover:underline"
          >
            + Adicionar jogador
          </Link>
        </section>
      )}
    </div>
  );
}
