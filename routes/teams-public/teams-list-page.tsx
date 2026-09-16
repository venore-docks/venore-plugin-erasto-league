import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { listTeams } from "../../runtime/teams";
import { listPlayers } from "../../runtime/players";
import { computeStandings } from "../../runtime/standings";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { TeamsListView } from "./teams-list-view";

// Lista pública de times (/ext/erasto-league/teams) — mesma informação da tela admin
// (/admin/erasto-league/teams: brasão, cor, elenco), só que aberta pra qualquer visitante, no
// mesmo padrão visual das outras telas públicas do plugin (overlay/control/perfis).
export default async function TeamsListPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const [teams, players, standings, config] = await Promise.all([
    listTeams(),
    listPlayers(),
    computeStandings(),
    resolveErastoLeagueConfig(),
  ]);

  const rosterCountByTeam = new Map<string, number>();
  for (const player of players) {
    rosterCountByTeam.set(player.teamId, (rosterCountByTeam.get(player.teamId) ?? 0) + 1);
  }
  const standingByTeam = new Map(standings.map((row) => [row.teamId, row]));

  return (
    <TeamsListView teams={teams} rosterCountByTeam={rosterCountByTeam} standingByTeam={standingByTeam} accentColor={config.accentColor} />
  );
}
