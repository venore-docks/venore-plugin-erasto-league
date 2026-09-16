import { clampScore } from "../shared/score";
import { listFinishedMatches } from "./matches";
import { listTeams } from "./teams";
import type { MatchSummary, TeamStanding } from "../contracts/types";

// Classificação (Fase 5): agrega matches "finished" por time. Times cadastrados sem partida ainda
// entram com 0 em tudo, pra aparecerem na tabela desde o cadastro.
export async function computeStandings(): Promise<TeamStanding[]> {
  const [teams, finished] = await Promise.all([listTeams(), listFinishedMatches()]);

  const table = new Map<string, TeamStanding>(
    teams.map((team) => [
      team.id,
      {
        teamId: team.id,
        slug: team.slug,
        name: team.name,
        crestUrl: team.crestUrl,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    ]),
  );

  function ensure(teamId: string): TeamStanding {
    let row = table.get(teamId);
    if (!row) {
      row = { teamId, slug: teamId, name: "—", crestUrl: null, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      table.set(teamId, row);
    }
    return row;
  }

  function apply(match: MatchSummary): void {
    const home = ensure(match.homeTeamId);
    const away = ensure(match.awayTeamId);
    const homeScore = clampScore(match.homeScore);
    const awayScore = clampScore(match.awayScore);

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (awayScore > homeScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const match of finished) {
    apply(match);
  }

  return [...table.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const goalDiffA = a.goalsFor - a.goalsAgainst;
    const goalDiffB = b.goalsFor - b.goalsAgainst;
    if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
    if (b.won !== a.won) return b.won - a.won;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}
