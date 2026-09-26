import { getFixture, listFixtures } from "./fixtures";
import { listTeams } from "./teams";
import { resolveErastoLeagueConfig } from "../shared/config";
import { buildFixtureCalendarEvent, matchDurationMinutes, type CalendarEvent } from "../shared/calendar";
import { describeFixtureStage } from "../shared/match-labels";

// Eventos de agenda dos confrontos da tabela de jogos (só os que têm data) — `fixtureId` limita a um
// só (arquivo .ics de um jogo). Duração = tempos × minutos das settings do plugin + margem
// (shared/calendar.ts matchDurationMinutes). O evento aponta pra página do jogo quando o confronto
// já tem partida vinculada; senão, pro site.
export async function loadFixtureCalendarEvents(origin: string, fixtureId?: string): Promise<CalendarEvent[]> {
  const [fixtures, teams, config] = await Promise.all([
    fixtureId ? getFixture(fixtureId).then((fixture) => (fixture ? [fixture] : [])) : listFixtures(),
    listTeams(),
    resolveErastoLeagueConfig(),
  ]);
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  const durationMinutes = matchDurationMinutes(config.periodMs, config.periodCount);

  return fixtures
    .map((fixture) =>
      buildFixtureCalendarEvent({
        fixtureId: fixture.id,
        homeName: (fixture.homeTeamId && teamNameById.get(fixture.homeTeamId)) || fixture.homeLabel || "A definir",
        awayName: (fixture.awayTeamId && teamNameById.get(fixture.awayTeamId)) || fixture.awayLabel || "A definir",
        stageLabel: describeFixtureStage(fixture),
        scheduledDate: fixture.scheduledDate,
        scheduledTime: fixture.scheduledTime,
        durationMinutes,
        url: fixture.matchId ? `${origin}/erasto-league/jogos/${fixture.matchId}` : `${origin}/`,
      }),
    )
    .filter((event) => event !== null);
}
