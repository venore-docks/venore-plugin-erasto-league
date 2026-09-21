import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatch } from "../../runtime/matches";
import { getTeam } from "../../runtime/teams";
import { listPlayersByTeam } from "../../runtime/players";
import { listEventsByMatch } from "../../runtime/match-events";
import { MatchView } from "./match-view";

// Página pública de UM jogo (/erasto-league/jogos/:id) — súmula + transmissão (link do YouTube
// colado na súmula, ver routes/admin/matches/youtube-url-form.tsx). Linkada pelos widgets de
// resultado (últimos resultados, agenda, fases de grupos — ver blocks/match-result-card.tsx,
// blocks/schedule-tabs.tsx, blocks/bracket-block.tsx) quando o confronto já tem partida vinculada.
// Rota "public" (ver routes/route-table.ts): DENTRO da shell/tema do host, mesmo princípio de
// teams-public/players-public. Funciona pra qualquer status (em andamento também), não só
// encerrada — quem chega aqui direto (link compartilhado antes do apito inicial) ainda vê a súmula
// e a transmissão, se já colada.
export default async function MatchPublicPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { id } = await params;
  const match = await getMatch(id);
  if (!match) {
    notFound();
  }

  const [homeTeam, awayTeam, events, homeRoster, awayRoster] = await Promise.all([
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    listEventsByMatch(id),
    listPlayersByTeam(match.homeTeamId),
    listPlayersByTeam(match.awayTeamId),
  ]);
  const playerById = new Map([...homeRoster, ...awayRoster].map((player) => [player.id, player]));

  return <MatchView match={match} homeTeam={homeTeam} awayTeam={awayTeam} events={events} playerById={playerById} />;
}
