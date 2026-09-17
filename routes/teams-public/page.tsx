import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getTeamBySlug, listTeams } from "../../runtime/teams";
import { listPlayersByTeam } from "../../runtime/players";
import { listRecentMatchesForTeam } from "../../runtime/matches";
import { computeStandings } from "../../runtime/standings";
import { TeamProfileView } from "./team-profile-view";

// Perfil público do time (/erasto-league/teams/:slug) — só leitura, sem PIN. Rota "public" (ver
// routes/route-table.ts): renderiza DENTRO da shell/tema do host, não mais em /ext/.
export default async function TeamProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) {
    notFound();
  }

  const [roster, recentMatches, standings, allTeams] = await Promise.all([
    listPlayersByTeam(team.id),
    listRecentMatchesForTeam(team.id),
    computeStandings(),
    listTeams(),
  ]);
  const standing = standings.find((row) => row.teamId === team.id) ?? null;
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <TeamProfileView team={team} roster={roster} recentMatches={recentMatches} standing={standing} teamById={teamById} />
  );
}
