import Link from "next/link";
import { notFound } from "next/navigation";
import { getMediaAsset } from "@venore/plugin-sdk/media";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader, Button } from "@venore/plugin-sdk/ui";
import { getPlayer } from "../../../runtime/players";
import { listTeams } from "../../../runtime/teams";
import { PlayerForm } from "./player-form";

// /admin/erasto-league/players/:id — id "new" = formulário em branco. ?teamId= pré-seleciona o
// time quando vem do link "+ Adicionar jogador" da página do time.
export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teamId?: string }>;
}) {
  const { id } = await params;
  const { teamId } = await searchParams;
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const isNew = id === "new";
  const player = isNew ? null : await getPlayer(id);
  if (!isNew && !player) {
    notFound();
  }

  const teams = await listTeams();
  const photoMediaResult = player?.photoMediaId ? await getMediaAsset({ id: player.photoMediaId }) : null;
  const photoMedia = photoMediaResult?.success ? photoMediaResult.data : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isNew ? "Novo jogador" : player!.name}
        description={isNew ? "Cadastra um jogador novo num time." : undefined}
        actions={
          player && (
            <Button asChild variant="outline">
              <Link href={`/ext/erasto-league/players/${player.slug}`} target="_blank" rel="noreferrer">
                Ver página pública ↗
              </Link>
            </Button>
          )
        }
      />
      <PlayerForm player={player} teams={teams} defaultTeamId={teamId ?? null} photoMedia={photoMedia} />
    </div>
  );
}
