import type { MatchClock } from "../contracts/types";

// Relógio de jogo — matemática pura, sem I/O. O overlay guarda só {running, anchorMs,
// accumulatedMs} e chama computeElapsedMs(clock, Date.now()) num requestAnimationFrame/intervalo
// local, então o cronômetro corre suave mesmo sem receber nada do servidor por segundos.

export const STOPPED_CLOCK: MatchClock = { running: false, anchorMs: null, accumulatedMs: 0 };

export function computeElapsedMs(clock: MatchClock, now: number): number {
  const base = clock.accumulatedMs;
  if (!clock.running || clock.anchorMs === null) {
    return Math.max(0, base);
  }
  return Math.max(0, base + (now - clock.anchorMs));
}

export function startClock(clock: MatchClock, now: number): MatchClock {
  if (clock.running) return clock;
  return { running: true, anchorMs: now, accumulatedMs: Math.max(0, clock.accumulatedMs) };
}

export function pauseClock(clock: MatchClock, now: number): MatchClock {
  if (!clock.running) return { ...clock, running: false };
  return { running: false, anchorMs: null, accumulatedMs: computeElapsedMs(clock, now) };
}

// Fixa o relógio num valor (ex: atalho "Fim do 1º tempo = 10:00"), preservando running.
export function setClock(clock: MatchClock, ms: number, now: number): MatchClock {
  const target = Math.max(0, Math.round(ms));
  if (clock.running) {
    return { running: true, anchorMs: now, accumulatedMs: target };
  }
  return { running: false, anchorMs: null, accumulatedMs: target };
}

export function adjustClock(clock: MatchClock, deltaMs: number, now: number): MatchClock {
  const current = computeElapsedMs(clock, now);
  return setClock(clock, current + deltaMs, now);
}

// mm:ss (ou h:mm:ss se passar de 1h — não deve num jogo de 20min, mas não quebra).
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
