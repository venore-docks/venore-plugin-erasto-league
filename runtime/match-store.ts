import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import {
  matchBoosts as matchBoostsTable,
  matchEvents as matchEventsTable,
  matchState as matchStateTable,
  players as playersTable,
  powerBoosts as powerBoostsTable,
} from "../database/schema";
import type { BoostMarker, CardMarker, GoalMarker, MatchClock, MatchState } from "../contracts/types";

// Persistência do estado da partida (linha única "singleton" em erasto_league.match_state) + um
// pub/sub EM MEMÓRIA best-effort por processo. O banco é a fonte da verdade — o pub/sub só serve
// pra a instância que atendeu a escrita empurrar o snapshot na hora pros SSE conectados NELA. As
// outras instâncias (Vercel) pegam a mudança pelo re-poll de 1s do próprio route de SSE. Foi a
// falta dessa persistência que fazia o overlay "zerar" no F5.

const SINGLETON_ID = "singleton";

type MatchRow = typeof matchStateTable.$inferSelect;

type LiveMarkers = { goals: GoalMarker[]; cards: CardMarker[]; boosts: BoostMarker[] };

const EMPTY_MARKERS: LiveMarkers = { goals: [], cards: [], boosts: [] };

// Gols/cartões/boosts da partida ATUAL, prontos pra exibir (nome do jogador, rótulo/emoji do
// catálogo já resolvidos) — sempre recalculado do zero a partir de match_events/match_boosts, nunca
// cacheado em match_state (que só guarda o placar, ver comentário no schema). Chamado a cada leitura
// de MatchState (readMatchState/writeMatchState abaixo), então roda com bastante frequência (o
// dbPoll de 1s do SSE, ver routes/api/events/route.ts) — aceitável pro volume de uma liga pequena,
// não pensado pra escala maior.
async function loadLiveMarkers(matchId: string): Promise<LiveMarkers> {
  const [eventRows, boostRows, boostCatalog] = await Promise.all([
    db.select().from(matchEventsTable).where(eq(matchEventsTable.matchId, matchId)).orderBy(asc(matchEventsTable.createdAt)),
    db.select().from(matchBoostsTable).where(eq(matchBoostsTable.matchId, matchId)).orderBy(asc(matchBoostsTable.createdAt)),
    db.select().from(powerBoostsTable),
  ]);

  const playerIds = [...new Set(eventRows.map((row) => row.playerId).filter((id): id is string => Boolean(id)))];
  const playerRows = playerIds.length > 0 ? await db.select().from(playersTable).where(inArray(playersTable.id, playerIds)) : [];
  const playerNameById = new Map(playerRows.map((player) => [player.id, player.name]));
  const resolvePlayerName = (playerId: string | null) => (playerId ? playerNameById.get(playerId) ?? null : null);

  const goals: GoalMarker[] = eventRows
    .filter((row) => row.kind === "goal" && row.amount > 0)
    .map((row) => ({
      id: row.id,
      side: row.side,
      playerId: row.playerId,
      playerName: resolvePlayerName(row.playerId),
      amount: row.amount,
      occurredAt: row.createdAt.getTime(),
    }));

  const cards: CardMarker[] = eventRows
    .filter((row): row is typeof row & { kind: "yellow_card" | "red_card" } => row.kind === "yellow_card" || row.kind === "red_card")
    .map((row) => ({
      id: row.id,
      side: row.side,
      kind: row.kind,
      playerId: row.playerId,
      playerName: resolvePlayerName(row.playerId),
    }));

  const boostByKey = new Map(boostCatalog.map((boost) => [boost.key, boost]));
  // Catálogo pode ter perdido a entrada (excluída depois do uso, ver runtime/power-boosts.ts) —
  // cai pro key cru sem emoji em vez de sumir da lista.
  const boosts: BoostMarker[] = boostRows.map((row) => {
    const entry = boostByKey.get(row.boostKey);
    return { id: row.id, side: row.side, boostKey: row.boostKey, label: entry?.label ?? row.boostKey, emoji: entry?.emoji ?? "" };
  });

  return { goals, cards, boosts };
}

function rowToState(row: MatchRow, markers: LiveMarkers): MatchState {
  const clock: MatchClock = {
    running: row.clockRunning,
    anchorMs: row.clockAnchorMs ?? null,
    accumulatedMs: row.clockAccumulatedMs ?? 0,
  };
  return {
    currentMatchId: row.currentMatchId,
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    home: { name: row.homeName, score: row.homeScore },
    away: { name: row.awayName, score: row.awayScore },
    label: row.label,
    preMatchMessage: row.preMatchMessage,
    clock,
    goals: markers.goals,
    cards: markers.cards,
    boosts: markers.boosts,
    updatedAt: row.updatedAt.getTime(),
  };
}

// Lê a linha singleton; recria com os defaults se ela sumiu (não deveria — a migration semeia,
// mas um DROP manual não pode derrubar o overlay).
export async function readMatchRow(): Promise<MatchRow> {
  const [row] = await db.select().from(matchStateTable).where(eq(matchStateTable.id, SINGLETON_ID));
  if (row) return row;
  const [created] = await db
    .insert(matchStateTable)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await db.select().from(matchStateTable).where(eq(matchStateTable.id, SINGLETON_ID));
  return again;
}

export async function readMatchState(): Promise<MatchState> {
  const row = await readMatchRow();
  const markers = row.currentMatchId ? await loadLiveMarkers(row.currentMatchId) : EMPTY_MARKERS;
  return rowToState(row, markers);
}

type MatchPatch = Partial<
  Pick<
    MatchRow,
    | "currentMatchId"
    | "homeTeamId"
    | "awayTeamId"
    | "homeName"
    | "homeScore"
    | "awayName"
    | "awayScore"
    | "label"
    | "preMatchMessage"
    | "clockRunning"
    | "clockAnchorMs"
    | "clockAccumulatedMs"
  >
>;

// Único ponto de escrita. Aplica o patch, carimba updated_at e notifica os SSE locais.
export async function writeMatchState(patch: MatchPatch): Promise<MatchState> {
  const [row] = await db
    .update(matchStateTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(matchStateTable.id, SINGLETON_ID))
    .returning();
  const markers = row.currentMatchId ? await loadLiveMarkers(row.currentMatchId) : EMPTY_MARKERS;
  const state = rowToState(row, markers);
  publish(state);
  return state;
}

// "Toca" o singleton (sem mudar nenhum campo, só updated_at) quando a mutação foi numa entidade
// que match_state não cacheia diretamente (uso de power play; atribuição de jogador a um gol/
// cartão já registrado) — sem isso o SSE nunca saberia que goals/cards/boosts mudaram: nenhum
// campo da LINHA em si mudou, só o que loadLiveMarkers recalcula por fora dela. Vira NO-OP se a
// partida em questão não é mais a que está ao vivo (ex: súmula de partida antiga).
export async function touchMatchStateIfCurrent(matchId: string): Promise<void> {
  const row = await readMatchRow();
  if (row.currentMatchId === matchId) {
    await writeMatchState({});
  }
}

// --- pub/sub em memória (globalThis: Server Action e Route Handler podem cair em cópias de bundle
// diferentes do módulo dentro do MESMO processo — cada uma com seu Set; globalThis é o único
// objeto garantidamente compartilhado). ---

type Subscriber = (state: MatchState) => void;
type BusGlobal = typeof globalThis & { __erastoLeagueSubs?: Set<Subscriber> };

function subs(): Set<Subscriber> {
  const g = globalThis as BusGlobal;
  if (!g.__erastoLeagueSubs) g.__erastoLeagueSubs = new Set();
  return g.__erastoLeagueSubs;
}

export function subscribeToMatch(subscriber: Subscriber): () => void {
  const set = subs();
  set.add(subscriber);
  return () => {
    set.delete(subscriber);
  };
}

function publish(state: MatchState): void {
  for (const subscriber of subs()) {
    try {
      subscriber(state);
    } catch {
      // entrega best-effort — um stream já fechado não derruba os outros
    }
  }
}
