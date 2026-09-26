import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getScheduleView, type ScheduleEntry } from "../runtime/bracket";
import { resolveRequestOrigin } from "../runtime/request-origin";
import { resolveErastoLeagueConfig } from "../shared/config";
import {
  CALENDAR_FEED_PATH,
  calendarSubscriptionUrls,
  fixtureCalendarLinks,
  matchDurationMinutes,
  shouldOfferCalendar,
  type FixtureCalendarLinks,
} from "../shared/calendar";
import { describeFixtureStage } from "../shared/match-labels";
import { SubscribeCalendar } from "./add-to-calendar";
import { ScheduleTabs } from "./schedule-tabs";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

// "Adicionar à agenda" por confronto ainda por jogar (Google + .ics, shared/calendar.ts) — calculado
// aqui no servidor e passado pronto pra agenda em abas (client component).
function buildCalendarLinks(
  entries: ScheduleEntry[],
  durationMinutes: number,
  origin: string,
  now = Date.now(),
): Record<string, FixtureCalendarLinks> {
  const links: Record<string, FixtureCalendarLinks> = {};
  for (const entry of entries) {
    if (!shouldOfferCalendar(entry.scheduledDate, entry.scheduledTime, entry.played, now)) continue;
    const entryLinks = fixtureCalendarLinks({
      fixtureId: entry.id,
      homeName: entry.homeName,
      awayName: entry.awayName,
      stageLabel: describeFixtureStage(entry),
      scheduledDate: entry.scheduledDate,
      scheduledTime: entry.scheduledTime,
      durationMinutes,
      url: `${origin}/`,
    });
    if (entryLinks) links[entry.id] = entryLinks;
  }
  return links;
}

// Agenda de jogos — TODOS os confrontos (grupos + eliminatórias), organizados em abas por rodada
// (blocks/schedule-tabs.tsx) em vez de uma lista/grade única — evita mostrar tudo de uma vez
// conforme o campeonato acumula jogos. Complementa o bloco de fases (que não mostra mais datas,
// ver bracket-block.tsx) e os últimos resultados (que só mostra o que já terminou) — este cobre
// passado e futuro juntos, sempre lido do banco na hora de renderizar.
export async function ErastoLeagueScheduleBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Agenda de jogos");
  const limit = readNumber(block.data, "limit", 0);
  const [entries, config, { origin }] = await Promise.all([
    getScheduleView(limit > 0 ? limit : undefined),
    resolveErastoLeagueConfig(),
    resolveRequestOrigin(),
  ]);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Tabela de jogos ainda não importada.</p>;
  }

  const calendarLinks = buildCalendarLinks(entries, matchDurationMinutes(config.periodMs, config.periodCount), origin);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}
        <SubscribeCalendar urls={calendarSubscriptionUrls(`${origin}${CALENDAR_FEED_PATH}`)} />
      </div>
      <ScheduleTabs entries={entries} calendarLinks={calendarLinks} />
    </div>
  );
}
