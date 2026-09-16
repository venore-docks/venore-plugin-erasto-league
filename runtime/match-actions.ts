import { eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { matchEvents as matchEventsTable, matches as matchesTable } from "../database/schema";
import type { ClockCommand, EventKind, MatchSide, MatchState } from "../contracts/types";
import { adjustClock, computeElapsedMs, pauseClock, setClock, startClock } from "../shared/clock";
import { getTeam } from "./teams";
import { readMatchRow, readMatchState, writeMatchState } from "./match-store";
import { recordEvent } from "./match-events";

// Mutators do estado da partida — mesma API mental de antes, agora em cima de partida como
// entidade (matches/match_events, runtime/match-events.ts) em vez de contador direto. Sem
// autorização aqui: cada porta de entrada resolve a sua (PIN no controle,
// authorizeActor("erasto-league.manage") na tela admin/súmula) e chama estes.

export { readMatchState as getMatchState };

const MAX_LABEL = 24;

// Cria a partida (matches) e aponta o cache ao vivo (match_state) pra ela — currentMatchId null
// antes disso é o estado "ocioso" (overlay transparente, controle pede escolher os times).
export async function startMatch(homeTeamId: string, awayTeamId: string): Promise<MatchState> {
  const [homeTeam, awayTeam] = await Promise.all([getTeam(homeTeamId), getTeam(awayTeamId)]);
  if (!homeTeam || !awayTeam) {
    throw new Error("Time não encontrado.");
  }

  const [match] = await db.insert(matchesTable).values({ homeTeamId, awayTeamId }).returning();

  return writeMatchState({
    currentMatchId: match.id,
    homeTeamId,
    awayTeamId,
    homeName: homeTeam.name,
    homeScore: 0,
    awayName: awayTeam.name,
    awayScore: 0,
    label: "",
    clockRunning: false,
    clockAnchorMs: null,
    clockAccumulatedMs: 0,
  });
}

// "Encerrar partida e salvar placar" — marca a partida atual como finished (fica na súmula/
// histórico pra sempre) e volta o cache ao vivo pro estado ocioso.
export async function finishMatch(): Promise<MatchState> {
  const row = await readMatchRow();
  if (row.currentMatchId) {
    await db
      .update(matchesTable)
      .set({ status: "finished", finishedAt: new Date() })
      .where(eq(matchesTable.id, row.currentMatchId));
  }

  return writeMatchState({
    currentMatchId: null,
    homeTeamId: null,
    awayTeamId: null,
    label: "",
    clockRunning: false,
    clockAnchorMs: null,
    clockAccumulatedMs: 0,
  });
}

// "Zerar placar e relógio" — apaga os eventos da partida EM ANDAMENTO (fica 0×0 de novo) sem
// encerrá-la nem trocar os times. Pra quando o operador quer reiniciar a mesma partida do zero.
export async function resetCurrentMatch(): Promise<MatchState> {
  const row = await readMatchRow();
  if (row.currentMatchId) {
    await db.delete(matchEventsTable).where(eq(matchEventsTable.matchId, row.currentMatchId));
    await db.update(matchesTable).set({ homeScore: 0, awayScore: 0 }).where(eq(matchesTable.id, row.currentMatchId));
  }

  return writeMatchState({
    homeScore: 0,
    awayScore: 0,
    label: "",
    clockRunning: false,
    clockAnchorMs: null,
    clockAccumulatedMs: 0,
  });
}

function requireCurrentMatchId(state: MatchState): string {
  if (!state.currentMatchId) {
    throw new Error("Nenhuma partida em andamento.");
  }
  return state.currentMatchId;
}

// delta é ±1 (gol) ou ±0,5 (meio gol) — vira um evento "goal" (negativo = correção). playerId é
// opcional: o controle grava o gol na hora e deixa a atribuição pra logo em seguida (ou pra súmula).
export async function bumpScore(side: MatchSide, delta: number, playerId?: string | null): Promise<{ state: MatchState; eventId: string }> {
  const state = await readMatchState();
  return recordEvent({
    matchId: requireCurrentMatchId(state),
    kind: "goal",
    side,
    amount: delta,
    playerId: playerId ?? null,
    minuteMs: computeElapsedMs(state.clock, Date.now()),
  });
}

// Cartão amarelo/vermelho ou falta — mesmo espírito de bumpScore, sem "amount" (sempre 1 evento).
export async function recordCardOrFoul(
  kind: Exclude<EventKind, "goal">,
  side: MatchSide,
  playerId?: string | null,
): Promise<{ state: MatchState; eventId: string }> {
  const state = await readMatchState();
  return recordEvent({
    matchId: requireCurrentMatchId(state),
    kind,
    side,
    playerId: playerId ?? null,
    minuteMs: computeElapsedMs(state.clock, Date.now()),
  });
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

export { computeElapsedMs };
