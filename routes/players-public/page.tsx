import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getPlayerBySlug } from "../../runtime/players";
import { getTeam } from "../../runtime/teams";
import { PlayerProfileView } from "./player-profile-view";

// Perfil público do jogador (/ext/erasto-league/players/:slug) — só leitura, sem PIN. Estatísticas
// (gols/faltas/cartões) e gráfico de rendimento entram na Fase 4.
export default async function PlayerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) {
    notFound();
  }

  const team = await getTeam(player.teamId);

  return <PlayerProfileView player={player} team={team} />;
}
