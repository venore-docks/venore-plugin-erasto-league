import type { ClockCommand, MatchSide, MatchState } from "../contracts/types";
import { adjustClock, computeElapsedMs, pauseClock, setClock, startClock } from "../shared/clock";
import { readMatchRow, readMatchState, writeMatchState } from "./match-store";

// Mutators do estado da partida — mesma API mental do antigo match-bus.ts, agora assíncrona e
// contra o banco (runtime/match-store.ts). Sem autorização aqui: cada porta de entrada resolve a
// sua (PIN no controle, authorizeActor("erasto-league.manage") na tela admin) e chama estes.

export { readMatchState as getMatchState };

const MAX_NAME = 40;
const MAX_LABEL = 24;

export async function bumpScore(side: MatchSide, delta: number): Promise<MatchState> {
  const row = await readMatchRow();
  const current = side === "home" ? row.homeScore : row.awayScore;
  const next = Math.max(0, current + delta);
  return writeMatchState(side === "home" ? { homeScore: next } : { awayScore: next });
}

export async function setTeamName(side: MatchSide, name: string): Promise<MatchState> {
  const fallback = side === "home" ? "Casa" : "Visitante";
  const clean = name.trim().slice(0, MAX_NAME) || fallback;
  return writeMatchState(side === "home" ? { homeName: clean } : { awayName: clean });
}

export async function setLabel(label: string): Promise<MatchState> {
  return writeMatchState({ label: label.trim().slice(0, MAX_LABEL) });
}

export async function applyClockCommand(command: ClockCommand): Promise<MatchState> {
  const state = await readMatchState();
  const now = Date.now();
  const clock = state.clock;

  let nextClock: MatchState["clock"];
  switch (command.kind) {
    case "start":
      nextClock = startClock(clock, now);
      break;
    case "pause":
      nextClock = pauseClock(clock, now);
      break;
    case "reset":
      nextClock = { running: false, anchorMs: null, accumulatedMs: 0 };
      break;
    case "set":
      nextClock = setClock(clock, command.ms, now);
      break;
    case "adjust":
      nextClock = adjustClock(clock, command.deltaMs, now);
      break;
    default:
      nextClock = clock;
      break;
  }

  return writeMatchState({
    clockRunning: nextClock.running,
    clockAnchorMs: nextClock.anchorMs,
    clockAccumulatedMs: nextClock.accumulatedMs,
  });
}

// "Nova partida": zera placar, etiqueta e relógio, e volta aos nomes padrão das settings.
export async function newMatch(defaults: { homeName: string; awayName: string }): Promise<MatchState> {
  return writeMatchState({
    homeName: defaults.homeName,
    homeScore: 0,
    awayName: defaults.awayName,
    awayScore: 0,
    label: "",
    clockRunning: false,
    clockAnchorMs: null,
    clockAccumulatedMs: 0,
  });
}

// Só zera placar + etiqueta + relógio, mantém os nomes atuais dos times (o "Zerar" leve do controle).
export async function resetScoreAndClock(): Promise<MatchState> {
  return writeMatchState({
    homeScore: 0,
    awayScore: 0,
    label: "",
    clockRunning: false,
    clockAnchorMs: null,
    clockAccumulatedMs: 0,
  });
}

export { computeElapsedMs };
