import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getTeamBySlug } from "../../runtime/teams";
import { listPlayersByTeam } from "../../runtime/players";
import { TeamProfileView } from "./team-profile-view";

// Perfil público do time (/ext/erasto-league/teams/:slug) — só leitura, sem PIN, mesmo padrão de
// overlay/control (fora da shell do host). Estatísticas/gráfico de rendimento entram na Fase 4.
export default async function TeamProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) {
    notFound();
  }

  const roster = await listPlayersByTeam(team.id);

  return <TeamProfileView team={team} roster={roster} />;
}
