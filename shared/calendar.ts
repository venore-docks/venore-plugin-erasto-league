import { fixtureDateTimeToEpoch } from "./timezone";

// "Adicionar à agenda" dos jogos marcados (tabela de jogos) — sem banco nem next/*: monta o evento a
// partir do confronto e serializa em .ics (iPhone/Outlook/qualquer app de agenda, e o feed de
// assinatura com todos os jogos) ou em link do Google Agenda (Android não abre .ics sozinho).
// Testado em shared/calendar.test.ts; rotas em routes/api/calendar.

export type CalendarEvent = {
  // Estável por confronto: reimportar/atualizar o feed troca o evento em vez de duplicar.
  uid: string;
  title: string;
  // Com hora marcada: início/fim em epoch ms. Sem hora ("dia marcado, horário a definir"): dia
  // inteiro — nunca um "00:00" inventado.
  when: { kind: "timed"; startMs: number; endMs: number } | { kind: "allDay"; date: string };
  description: string;
  url: string | null;
};

export type FixtureCalendarInput = {
  fixtureId: string;
  homeName: string;
  awayName: string;
  // "Semifinal", "Grupo A · 2ª Rodada"... (shared/match-labels.ts describeFixtureStage).
  stageLabel: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number;
  // Página pra onde o evento aponta (site da liga).
  url: string | null;
};

// null = confronto sem data — não tem o que pôr na agenda.
export function buildFixtureCalendarEvent(input: FixtureCalendarInput): CalendarEvent | null {
  if (!input.scheduledDate) return null;

  const title = `⚽ Erasto League: ${input.homeName} × ${input.awayName}`;
  const description = [input.stageLabel, input.url ? `Acompanhe: ${input.url}` : null].filter(Boolean).join("\n");
  const uid = `fixture-${input.fixtureId}@erasto-league`;

  if (!input.scheduledTime) {
    return { uid, title, when: { kind: "allDay", date: input.scheduledDate }, description, url: input.url };
  }

  const startMs = fixtureDateTimeToEpoch(input.scheduledDate, input.scheduledTime)!;
  return { uid, title, when: { kind: "timed", startMs, endMs: startMs + input.durationMinutes * 60_000 }, description, url: input.url };
}

// Duração do evento: tempos × minutos do jogo (settings do plugin) + 10 min de intervalo/margem.
export function matchDurationMinutes(periodMs: number, periodCount: number): number {
  return Math.round((periodMs * periodCount) / 60_000) + 10;
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

// 20260925T133000Z
function formatUtcStamp(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// "2026-09-25" -> "20260925"; nextDay=true -> "20260926" (fim exclusivo de evento de dia inteiro).
function formatDate(date: string, nextDay = false): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + (nextDay ? 1 : 0)));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// RFC 5545 §3.3.11: \ ; , e quebra de linha escapados em TEXT.
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// RFC 5545 §3.1: linha de no máximo 75 octetos, continuação com CRLF + espaço — contando BYTES
// UTF-8 (acento/emoji ocupam mais de um) sem partir um caractere no meio.
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function eventLines(event: CalendarEvent, stampMs: number): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${formatUtcStamp(stampMs)}`];
  if (event.when.kind === "timed") {
    lines.push(`DTSTART:${formatUtcStamp(event.when.startMs)}`, `DTEND:${formatUtcStamp(event.when.endMs)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(event.when.date)}`, `DTEND;VALUE=DATE:${formatDate(event.when.date, true)}`);
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push("END:VEVENT");
  return lines;
}

// Um ou vários eventos num VCALENDAR. `feed` marca o calendário de assinatura (nome + intervalo de
// atualização que Apple/Outlook/Google respeitam) — o arquivo de um jogo só não precisa disso.
export function toIcs(events: CalendarEvent[], options: { feed?: boolean; now?: number } = {}): string {
  const stampMs = options.now ?? Date.now();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Venore Docks//Erasto League//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (options.feed) {
    lines.push("X-WR-CALNAME:Erasto League", "X-WR-TIMEZONE:America/Sao_Paulo", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H");
  }
  for (const event of events) lines.push(...eventLines(event, stampMs));
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// Link "adicionar evento" do Google Agenda (abre já preenchido, a pessoa só confirma).
export function googleCalendarUrl(event: CalendarEvent): string {
  const dates =
    event.when.kind === "timed"
      ? `${formatUtcStamp(event.when.startMs)}/${formatUtcStamp(event.when.endMs)}`
      : `${formatDate(event.when.date)}/${formatDate(event.when.date, true)}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates, details: event.description, ctz: "America/Sao_Paulo" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Assinatura do feed com todos os jogos: webcal:// abre "assinar calendário" no iPhone/Mac/Outlook;
// o Google Agenda assina pela própria URL (https) via ?cid=.
export function calendarSubscriptionUrls(feedUrl: string): { webcal: string; google: string } {
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  return { webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
}

// Feed de assinatura (todos os jogos com data) e .ics de um jogo — rotas em routes/api/calendar.
export const CALENDAR_FEED_PATH = "/api/erasto-league/agenda";

export function fixtureCalendarPath(fixtureId: string): string {
  return `/api/erasto-league/fixtures/${fixtureId}/calendar`;
}

export type FixtureCalendarLinks = { google: string; ics: string };

// Os dois destinos do "Adicionar à agenda" de um jogo; null = jogo sem data.
export function fixtureCalendarLinks(input: FixtureCalendarInput): FixtureCalendarLinks | null {
  const event = buildFixtureCalendarEvent(input);
  return event ? { google: googleCalendarUrl(event), ics: fixtureCalendarPath(input.fixtureId) } : null;
}

// Jogo que começou há mais de 3h (ou já foi disputado) não ganha "Adicionar à agenda" — mesma folga
// que runtime/bracket.ts dá pra confronto sem súmula vinculada.
const CALENDAR_GRACE_MS = 3 * 60 * 60 * 1000;

export function shouldOfferCalendar(scheduledDate: string | null, scheduledTime: string | null, played: boolean, now = Date.now()): boolean {
  const epoch = fixtureDateTimeToEpoch(scheduledDate, scheduledTime);
  return !played && epoch != null && epoch + CALENDAR_GRACE_MS >= now;
}
