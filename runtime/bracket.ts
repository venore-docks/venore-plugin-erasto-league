import { listFixtures } from "./fixtures";
import { listTeams } from "./teams";
import { computeStandings } from "./standings";
import { getMatch } from "./matches";
import { FIXTURE_PHASE_ORDER } from "../shared/fixture-phase";
import type { Fixture, FixturePhase, MatchSummary, TeamStanding } from "../contracts/types";

export type FixtureView = {
  id: string;
  homeName: string;
  homeCrestUrl: string | null;
  homeSlug: string | null;
  awayName: string;
  awayCrestUrl: string | null;
  awaySlug: string | null;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: number | null;
  roundLabel: string | null;
  played: boolean;
};

export type GroupView = {
  name: string;
  standings: TeamStanding[];
  fixtures: FixtureView[];
};

export type BracketView = {
  groups: GroupView[];
  knockout: { phase: FixturePhase; fixtures: FixtureView[] }[];
};

// Monta tudo que o bloco erasto-league.bracket precisa: grupos (mini-classificação + jogos) e
// eliminatórias (quartas/semi/final), sempre lido do banco na hora de renderizar (mesma filosofia
// dos outros blocos — nunca dado salvo na composição).
export async function getBracketView(): Promise<BracketView> {
  const [fixtures, teams, standings] = await Promise.all([listFixtures(), listTeams(), computeStandings()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const matchIds = [...new Set(fixtures.map((fixture) => fixture.matchId).filter((id): id is string => Boolean(id)))];
  const matches = await Promise.all(matchIds.map((id) => getMatch(id)));
  const matchById = new Map(matches.filter((match): match is MatchSummary => Boolean(match)).map((match) => [match.id, match]));

  function toView(fixture: Fixture): FixtureView {
    const home = fixture.homeTeamId ? teamById.get(fixture.homeTeamId) : null;
    const away = fixture.awayTeamId ? teamById.get(fixture.awayTeamId) : null;
    const match = fixture.matchId ? matchById.get(fixture.matchId) : null;

    return {
      id: fixture.id,
      homeName: home?.name ?? fixture.homeLabel ?? "A definir",
      homeCrestUrl: home?.crestUrl ?? null,
      homeSlug: home?.slug ?? null,
      awayName: away?.name ?? fixture.awayLabel ?? "A definir",
      awayCrestUrl: away?.crestUrl ?? null,
      awaySlug: away?.slug ?? null,
      homeScore: match ? match.homeScore : null,
      awayScore: match ? match.awayScore : null,
      scheduledAt: fixture.scheduledAt,
      roundLabel: fixture.roundLabel,
      played: Boolean(match && match.status === "finished"),
    };
  }

  const groupFixtures = fixtures.filter((fixture) => fixture.phase === "group");
  const groupNames = [...new Set(groupFixtures.map((fixture) => fixture.groupName).filter((name): name is string => Boolean(name)))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );

  const groups: GroupView[] = groupNames.map((name) => ({
    name,
    standings: standings.filter((row) => teamById.get(row.teamId)?.groupName === name),
    fixtures: groupFixtures.filter((fixture) => fixture.groupName === name).map(toView),
  }));

  const knockout = FIXTURE_PHASE_ORDER.filter((phase) => phase !== "group")
    .map((phase) => ({ phase, fixtures: fixtures.filter((fixture) => fixture.phase === phase).map(toView) }))
    .filter((entry) => entry.fixtures.length > 0);

  return { groups, knockout };
}
