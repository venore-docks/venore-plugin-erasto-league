import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getPlayerBySlug } from "../../runtime/players";
import { getTeam, listTeams } from "../../runtime/teams";
import { getPlayerStats, listMvpMatchesForPlayer, listRecentMatchesForPlayer } from "../../runtime/stats";
import { listFanVoteAwardsForPlayer } from "../../runtime/fan-votes";
import { readFanVoteWindowHours } from "../../shared/config";
import { PlayerProfileView, type PlayerAward } from "./player-profile-view";

// Prêmios do jogador (MVP oficial + Jogador da Torcida) juntos por partida — quem levou os dois no
// mesmo jogo aparece numa linha só, com os dois selos. Mais recente primeiro.
function mergeAwards(mvpMatches: PlayerAward["match"][], fanVoteMatches: PlayerAward["match"][]): PlayerAward[] {
  const byMatchId = new Map<string, PlayerAward>();
  for (const match of mvpMatches) byMatchId.set(match.id, { match, mvp: true, fanVote: false });
  for (const match of fanVoteMatches) {
    const existing = byMatchId.get(match.id);
    if (existing) existing.fanVote = true;
    else byMatchId.set(match.id, { match, mvp: false, fanVote: true });
  }
  return [...byMatchId.values()].sort((a, b) => b.match.startedAt - a.match.startedAt);
}

// Perfil público do jogador (/erasto-league/players/:slug) — só leitura, sem PIN. Rota "public"
// (ver routes/route-table.ts): renderiza DENTRO da shell/tema do host, não mais em /ext/.
export default async function PlayerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) {
    notFound();
  }

  const windowHours = await readFanVoteWindowHours();
  const [team, stats, recentMatches, allTeams, mvpMatches, fanVoteMatches] = await Promise.all([
    getTeam(player.teamId),
    getPlayerStats(player.id, player.teamId),
    listRecentMatchesForPlayer(player.teamId),
    listTeams(),
    listMvpMatchesForPlayer(player.id),
    listFanVoteAwardsForPlayer(player.id, windowHours),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <PlayerProfileView
      player={player}
      team={team}
      stats={stats}
      fanVoteWins={fanVoteMatches.length}
      awards={mergeAwards(mvpMatches, fanVoteMatches)}
      recentMatches={recentMatches}
      teamById={teamById}
    />
  );
}
