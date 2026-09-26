import { getScheduleView, type ScheduleEntry } from "../../runtime/bracket";
import { fixtureCalendarLinks, shouldOfferCalendar, type FixtureCalendarLinks } from "../../shared/calendar";
import { FIXTURE_PHASE_LABEL } from "../../shared/fixture-phase";
import { fixtureDateTimeToEpoch } from "../../shared/timezone";
import { AddToCalendar } from "../add-to-calendar";
import { TeamCrest } from "./team-crest";

// Mesma folga de runtime/bracket.ts: jogo que começou há mais de 3h sem súmula
// vinculada já não é "próximo".
const STALE_MS = 3 * 60 * 60 * 1000;

function dateParts(date: string): { weekday: string; dayMonth: string } {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return { weekday, dayMonth: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}` };
}

function phaseTag(entry: ScheduleEntry): string {
  if (entry.phase === "group") return [entry.groupName ? `Grupo ${entry.groupName}` : null, entry.roundLabel].filter(Boolean).join(" · ");
  return FIXTURE_PHASE_LABEL[entry.phase];
}

type UpcomingRow = { entry: ScheduleEntry; calendar: FixtureCalendarLinks | null };

// Só os que ainda vão acontecer (sem data entra no fim, "a definir"), com o "Adicionar à agenda" já
// montado — fora do componente pra hora atual não ser lida durante o render.
function selectUpcoming(entries: ScheduleEntry[], durationMinutes: number, origin: string, limit: number, now = Date.now()): UpcomingRow[] {
  return entries
    .filter((entry) => {
      if (entry.played) return false;
      const epoch = fixtureDateTimeToEpoch(entry.scheduledDate, entry.scheduledTime);
      return epoch == null || epoch + STALE_MS >= now;
    })
    .slice(0, limit)
    .map((entry) => ({
      entry,
      calendar: shouldOfferCalendar(entry.scheduledDate, entry.scheduledTime, entry.played, now)
        ? fixtureCalendarLinks({
            fixtureId: entry.id,
            homeName: entry.homeName,
            awayName: entry.awayName,
            stageLabel: phaseTag(entry),
            scheduledDate: entry.scheduledDate,
            scheduledTime: entry.scheduledTime,
            durationMinutes,
            url: `${origin}/`,
          })
        : null,
    }));
}

// Próximos jogos da página inicial — só os que ainda vão acontecer (a agenda completa, com abas por
// rodada, continua no bloco erasto-league.schedule), cada um com "Adicionar à agenda".
export async function HomeUpcoming({ durationMinutes, origin, limit = 4 }: { durationMinutes: number; origin: string; limit?: number }) {
  const upcoming = selectUpcoming(await getScheduleView(), durationMinutes, origin, limit);

  if (upcoming.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum jogo marcado por enquanto.</p>;
  }

  return (
    <ul className="space-y-2">
      {upcoming.map(({ entry, calendar }) => {
        const parts = entry.scheduledDate ? dateParts(entry.scheduledDate) : null;
        return (
          <li key={entry.id} className="flex items-center gap-3 rounded-panel border border-border bg-card px-3 py-2.5">
            <div className="w-14 shrink-0 text-center leading-tight">
              {parts ? (
                <>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">{parts.weekday}</p>
                  <p className="text-sm font-extrabold text-foreground">{parts.dayMonth}</p>
                  <p className="text-[11px] font-bold tabular-nums text-primary">{entry.scheduledTime ?? "—"}</p>
                </>
              ) : (
                <p className="text-[11px] font-semibold text-muted-foreground">A definir</p>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <TeamCrest name={entry.homeName} crestUrl={entry.homeCrestUrl} className="size-6" />
                <span className="truncate text-sm font-semibold text-foreground">{entry.homeName}</span>
              </div>
              <div className="flex items-center gap-2">
                <TeamCrest name={entry.awayName} crestUrl={entry.awayCrestUrl} className="size-6" />
                <span className="truncate text-sm font-semibold text-foreground">{entry.awayName}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="max-w-[7rem] truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{phaseTag(entry)}</span>
              {calendar && <AddToCalendar links={calendar} label="Agenda" align="right" />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
