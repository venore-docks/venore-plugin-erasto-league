import { listFixtures } from "./fixtures";
import { listTeams } from "./teams";
import { computeStandings } from "./standings";
import { getMatch } from "./matches";
import { FIXTURE_PHASE_ORDER } from "../shared/fixture-phase";
import { fixtureDateTimeToEpoch } from "../shared/timezone";
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
  // Colunas separadas (não um epoch combinado) — ver database/schema/fixtures.ts e
  // shared/timezone.ts. Quem exibe formata a partir daqui; quem precisa ORDENAR usa
  // fixtureDateTimeToEpoch (só como chave de comparação, nunca gravado).
  scheduledDate: string | null;
  scheduledTime: string | null;
  roundLabel: string | null;
  played: boolean;
};

// Mesmo FixtureView + fase/grupo, pra agenda de jogos precisar mostrar um selo ("Grupo A",
// "Semifinal") junto de cada confronto sem ter que recasar com a fixture original.
export type ScheduleEntry = FixtureView & { phase: FixturePhase; groupName: string | null };

export type GroupView = {
  name: string;
  standings: TeamStanding[];
  fixtures: FixtureView[];
};

export type BracketView = {
  groups: GroupView[];
  knockout: { phase: FixturePhase; fixtures: FixtureView[] }[];
};

function compareBySchedule(a: Fixture, b: Fixture): number {
  const epochA = fixtureDateTimeToEpoch(a.scheduledDate, a.scheduledTime);
  const epochB = fixtureDateTimeToEpoch(b.scheduledDate, b.scheduledTime);
  if (epochA == null && epochB == null) return 0;
  if (epochA == null) return 1;
  if (epochB == null) return -1;
  return epochA - epochB;
}

// Busca fixtures + times + partidas ligadas e devolve um `toView` pronto — reaproveitado pelo
// chaveamento (getBracketView) e pela agenda cronológica (getScheduleView), pra não duplicar o
// join fixture→time→partida em dois lugares.
async function loadFixtureViewData() {
  const [fixtures, teams] = await Promise.all([listFixtures(), listTeams()]);
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
      scheduledDate: fixture.scheduledDate,
      scheduledTime: fixture.scheduledTime,
      roundLabel: fixture.roundLabel,
      played: Boolean(match && match.status === "finished"),
    };
  }

  return { fixtures, toView };
}

// Monta tudo que o bloco erasto-league.bracket precisa: grupos (mini-classificação + jogos) e
// eliminatórias (quartas/semi/final), sempre lido do banco na hora de renderizar (mesma filosofia
// dos outros blocos — nunca dado salvo na composição).
export async function getBracketView(): Promise<BracketView> {
  const [{ fixtures, toView }, standings] = await Promise.all([loadFixtureViewData(), computeStandings()]);

  const groupFixtures = fixtures.filter((fixture) => fixture.phase === "group");
  const groupNames = [...new Set(groupFixtures.map((fixture) => fixture.groupName).filter((name): name is string => Boolean(name)))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );

  // Grupo é propriedade do CONFRONTO (fixtures.groupName), não do time — um time não guarda em
  // qual grupo está; deriva-se de quais fixtures de fase de grupos ele aparece.
  const teamIdsByGroup = new Map<string, Set<string>>();
  for (const fixture of groupFixtures) {
    if (!fixture.groupName) continue;
    const set = teamIdsByGroup.get(fixture.groupName) ?? new Set<string>();
    if (fixture.homeTeamId) set.add(fixture.homeTeamId);
    if (fixture.awayTeamId) set.add(fixture.awayTeamId);
    teamIdsByGroup.set(fixture.groupName, set);
  }

  const groups: GroupView[] = groupNames.map((name) => ({
    name,
    standings: standings.filter((row) => teamIdsByGroup.get(name)?.has(row.teamId)),
    fixtures: groupFixtures.filter((fixture) => fixture.groupName === name).map(toView),
  }));

  const knockout = FIXTURE_PHASE_ORDER.filter((phase) => phase !== "group")
    .map((phase) => ({ phase, fixtures: fixtures.filter((fixture) => fixture.phase === phase).map(toView) }))
    .filter((entry) => entry.fixtures.length > 0);

  return { groups, knockout };
}

// Agenda de jogos: TODOS os confrontos (qualquer fase), em ordem cronológica — jogos com data
// primeiro (mais próximo primeiro), sem data por último. Alimenta o bloco erasto-league.schedule
// (widget novo, separado do chaveamento pra poder mostrar data/hora sem lotar o card de grupo).
export async function getScheduleView(limit?: number): Promise<ScheduleEntry[]> {
  const { fixtures, toView } = await loadFixtureViewData();

  const sorted = [...fixtures].sort(compareBySchedule);

  const entries: ScheduleEntry[] = sorted.map((fixture) => ({ ...toView(fixture), phase: fixture.phase, groupName: fixture.groupName }));
  return typeof limit === "number" && limit > 0 ? entries.slice(0, limit) : entries;
}

// FixtureView + cores dos times — só o bloco/TV de "próximo jogo" (ad 16:9) precisa disso, pra
// pintar um fundo split com a cor de cada lado.
export type NextGameView = FixtureView & { homeColor: string | null; awayColor: string | null };

// Próximo jogo ainda não realizado, em ordem cronológica (mesma fonte de getScheduleView) — null
// quando não há nenhum confronto pendente (campeonato encerrado ou tabela ainda não importada).
// Confronto sem match linkada (matchId null) cujo horário marcado já passou há mais que essa folga
// não pode continuar sendo o "próximo jogo" pra sempre — normalmente o auto-link em
// runtime/match-actions.ts já resolve isso ao encerrar a partida, mas fixtures de antes dessa
// correção (ou o raro caso sem match nenhum registrado) ficariam travando "próximo jogo" no
// confronto mais antigo indefinidamente sem esse limite. Só afeta a ESCOLHA de qual é o próximo —
// não faz esse confronto aparecer como "jogado"/com placar em nenhum outro lugar (getScheduleView
// continua mostrando "a definir", nunca inventa um resultado).
const STALE_UNLINKED_FIXTURE_GRACE_MS = 3 * 60 * 60 * 1000;

function isStaleUnlinkedFixture(fixture: Fixture): boolean {
  const epoch = fixtureDateTimeToEpoch(fixture.scheduledDate, fixture.scheduledTime);
  return epoch != null && Date.now() - epoch > STALE_UNLINKED_FIXTURE_GRACE_MS;
}

export async function getNextFixture(): Promise<NextGameView | null> {
  const [fixtures, teams] = await Promise.all([listFixtures(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const matchIds = [...new Set(fixtures.map((fixture) => fixture.matchId).filter((id): id is string => Boolean(id)))];
  const matches = await Promise.all(matchIds.map((id) => getMatch(id)));
  const matchById = new Map(matches.filter((match): match is MatchSummary => Boolean(match)).map((match) => [match.id, match]));

  const sorted = [...fixtures].sort(compareBySchedule);

  const next = sorted.find((fixture) => {
    const match = fixture.matchId ? matchById.get(fixture.matchId) : null;
    if (match && match.status === "finished") return false;
    if (!fixture.matchId && isStaleUnlinkedFixture(fixture)) return false;
    return true;
  });
  if (!next) return null;

  const home = next.homeTeamId ? teamById.get(next.homeTeamId) : null;
  const away = next.awayTeamId ? teamById.get(next.awayTeamId) : null;
  const match = next.matchId ? matchById.get(next.matchId) : null;

  return {
    id: next.id,
    homeName: home?.name ?? next.homeLabel ?? "A definir",
    homeCrestUrl: home?.crestUrl ?? null,
    homeSlug: home?.slug ?? null,
    homeColor: home?.primaryColor ?? null,
    awayName: away?.name ?? next.awayLabel ?? "A definir",
    awayCrestUrl: away?.crestUrl ?? null,
    awaySlug: away?.slug ?? null,
    awayColor: away?.primaryColor ?? null,
    homeScore: match ? match.homeScore : null,
    awayScore: match ? match.awayScore : null,
    scheduledDate: next.scheduledDate,
    scheduledTime: next.scheduledTime,
    roundLabel: next.roundLabel,
    played: Boolean(match && match.status === "finished"),
  };
}
