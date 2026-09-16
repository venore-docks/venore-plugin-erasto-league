import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getPlayerBySlug } from "../../runtime/players";
import { getTeam, listTeams } from "../../runtime/teams";
import { getPlayerStats, listRecentMatchesForPlayer } from "../../runtime/stats";
import { PlayerProfileView } from "./player-profile-view";

// Perfil público do jogador (/ext/erasto-league/players/:slug) — só leitura, sem PIN.
export default async function PlayerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) {
    notFound();
  }

  const [team, stats, recentMatches, allTeams] = await Promise.all([
    getTeam(player.teamId),
    getPlayerStats(player.id),
    listRecentMatchesForPlayer(player.id),
    listTeams(),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return <PlayerProfileView player={player} team={team} stats={stats} recentMatches={recentMatches} teamById={teamById} />;
}
