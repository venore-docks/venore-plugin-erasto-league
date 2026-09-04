import { eq } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { matchState as matchStateTable } from "../database/schema";
import type { MatchClock, MatchState } from "../contracts/types";

// Persistência do estado da partida (linha única "singleton" em erasto_league.match_state) + um
// pub/sub EM MEMÓRIA best-effort por processo. O banco é a fonte da verdade — o pub/sub só serve
// pra a instância que atendeu a escrita empurrar o snapshot na hora pros SSE conectados NELA. As
// outras instâncias (Vercel) pegam a mudança pelo re-poll de 1s do próprio route de SSE. Foi a
// falta dessa persistência que fazia o overlay "zerar" no F5.

const SINGLETON_ID = "singleton";

type MatchRow = typeof matchStateTable.$inferSelect;

function rowToState(row: MatchRow): MatchState {
  const clock: MatchClock = {
    running: row.clockRunning,
    anchorMs: row.clockAnchorMs ?? null,
    accumulatedMs: row.clockAccumulatedMs ?? 0,
  };
  return {
    home: { name: row.homeName, score: row.homeScore },
    away: { name: row.awayName, score: row.awayScore },
    label: row.label,
    clock,
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
  return rowToState(await readMatchRow());
}

type MatchPatch = Partial<
  Pick<
    MatchRow,
    | "homeName"
    | "homeScore"
    | "awayName"
    | "awayScore"
    | "label"
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
  const state = rowToState(row);
  publish(state);
  return state;
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
