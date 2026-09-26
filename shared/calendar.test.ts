import { describe, expect, it } from "vitest";
import { buildFixtureCalendarEvent, calendarSubscriptionUrls, googleCalendarUrl, matchDurationMinutes, shouldOfferCalendar, toIcs } from "./calendar";

const BASE = {
  fixtureId: "f1",
  homeName: "Tubarões",
  awayName: "Leões do Erasto",
  stageLabel: "Grupo A · 2ª Rodada",
  durationMinutes: 30,
  url: "https://erasto-league.vercel.app/",
};

describe("buildFixtureCalendarEvent", () => {
  it("jogo com hora: horário de Brasília vira UTC (+3h) e dura o tempo de jogo", () => {
    const event = buildFixtureCalendarEvent({ ...BASE, scheduledDate: "2026-09-25", scheduledTime: "10:30" });
    expect(event?.when).toEqual({ kind: "timed", startMs: Date.UTC(2026, 8, 25, 13, 30), endMs: Date.UTC(2026, 8, 25, 14, 0) });
    expect(event?.title).toBe("⚽ Erasto League: Tubarões × Leões do Erasto");
    expect(event?.uid).toBe("fixture-f1@erasto-league");
  });

  it("dia marcado sem hora vira evento de dia inteiro; sem data não vira evento", () => {
    expect(buildFixtureCalendarEvent({ ...BASE, scheduledDate: "2026-09-25", scheduledTime: null })?.when).toEqual({
      kind: "allDay",
      date: "2026-09-25",
    });
    expect(buildFixtureCalendarEvent({ ...BASE, scheduledDate: null, scheduledTime: null })).toBeNull();
  });
});

describe("toIcs", () => {
  const timed = buildFixtureCalendarEvent({ ...BASE, scheduledDate: "2026-09-25", scheduledTime: "10:30" })!;
  const allDay = buildFixtureCalendarEvent({ ...BASE, fixtureId: "f2", scheduledDate: "2026-12-31", scheduledTime: null })!;
  const ics = toIcs([timed, allDay], { feed: true, now: Date.UTC(2026, 8, 1) });

  it("CRLF, horários em UTC e fim exclusivo no dia inteiro (virada de ano)", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20260925T133000Z\r\nDTEND:20260925T140000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101");
    expect(ics).toContain("X-WR-CALNAME:Erasto League");
  });

  it("escapa vírgula/ponto e vírgula/quebra de linha e dobra linha longa sem passar de 75 bytes", () => {
    const event = { ...timed, title: "A, B; C", description: "linha 1\nlinha 2 " + "é".repeat(60) };
    const text = toIcs([event], { now: 0 });
    expect(text).toContain("SUMMARY:A\\, B\\; C");
    expect(text).toContain("DESCRIPTION:linha 1\\nlinha 2 ");
    for (const line of text.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // desdobrar (tirar CRLF + espaço) devolve o texto original
    expect(text.replace(/\r\n /g, "")).toContain("é".repeat(60));
  });
});

describe("googleCalendarUrl / calendarSubscriptionUrls / matchDurationMinutes", () => {
  it("link do Google com as datas em UTC", () => {
    const event = buildFixtureCalendarEvent({ ...BASE, scheduledDate: "2026-09-25", scheduledTime: "10:30" })!;
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20260925T133000Z/20260925T140000Z");
    expect(url.searchParams.get("text")).toBe(event.title);
  });

  it("assinatura: webcal pro iPhone/Outlook e cid pro Google", () => {
    const urls = calendarSubscriptionUrls("https://erasto-league.vercel.app/api/erasto-league/agenda");
    expect(urls.webcal).toBe("webcal://erasto-league.vercel.app/api/erasto-league/agenda");
    expect(urls.google).toBe(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(urls.webcal)}`);
  });

  it("duração = tempos × minutos + 10", () => {
    expect(matchDurationMinutes(10 * 60_000, 2)).toBe(30);
  });
});

describe("shouldOfferCalendar", () => {
  const now = Date.UTC(2026, 8, 26, 15, 0); // 26/09 12:00 em Brasília
  it("só pra jogo não disputado, com data, que não começou há mais de 3h", () => {
    expect(shouldOfferCalendar("2026-09-28", "10:30", false, now)).toBe(true);
    expect(shouldOfferCalendar("2026-09-26", "10:30", false, now)).toBe(true); // começou há 1h30
    expect(shouldOfferCalendar("2026-09-25", "10:30", false, now)).toBe(false);
    expect(shouldOfferCalendar("2026-09-28", "10:30", true, now)).toBe(false);
    expect(shouldOfferCalendar(null, null, false, now)).toBe(false);
  });
});
