import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { listFinishedMatches } from "../../runtime/matches";
import { listTeams } from "../../runtime/teams";
import { getPlayer } from "../../runtime/players";
import { ResultsView } from "./results-view";

// Lista completa de resultados (/erasto-league/resultados) — sem limite, complementa o bloco
// erasto-league.recent-results (que só mostra os 5 mais recentes + link "Ver mais" pra cá). Rota
// "public" (ver routes/route-table.ts): renderiza DENTRO da shell/tema do host.
export default async function ResultsPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const [matches, teams] = await Promise.all([listFinishedMatches(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const mvpIds = [...new Set(matches.map((match) => match.mvpPlayerId).filter((id): id is string => Boolean(id)))];
  const mvpPlayers = await Promise.all(mvpIds.map((id) => getPlayer(id)));
  const mvpNameById = new Map(mvpPlayers.filter((player) => player).map((player) => [player!.id, player!.name]));

  return <ResultsView matches={matches} teamById={teamById} mvpNameById={mvpNameById} />;
}
