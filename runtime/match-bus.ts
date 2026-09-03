import type { MatchSide, MatchState } from "../contracts/types";

// Placar + pub/sub em memória, por processo. Não é uma feature (sem handler/service/store/
// authorizeActor) — é infraestrutura de runtime, mesmo espírito do runtime/output-bus.ts do
// broadcast. Spike de partida ÚNICA: um estado global, não um Map por matchId.
//
// Guardado em globalThis, não numa variável de módulo: uma Server Action (routes/control/
// actions.ts) e um Route Handler (routes/api/events/route.ts) podem acabar com cópias avaliadas
// diferentes deste módulo em camadas de bundle diferentes do Next.js — cada cópia com seu
// próprio Set de subscribers, evento publicado numa nunca chega na outra. globalThis é o único
// objeto garantidamente compartilhado entre as camadas dentro do mesmo processo.

type Subscriber = (state: MatchState) => void;

type MatchBusGlobal = typeof globalThis & {
  __erastoLeagueMatch?: MatchState;
  __erastoLeagueSubscribers?: Set<Subscriber>;
};

function freshState(): MatchState {
  return {
    home: { name: "Casa", score: 0 },
    away: { name: "Visitante", score: 0 },
    label: "",
    updatedAt: Date.now(),
  };
}

function bus(): MatchBusGlobal {
  return globalThis as MatchBusGlobal;
}

export function getMatchState(): MatchState {
  const g = bus();
  if (!g.__erastoLeagueMatch) {
    g.__erastoLeagueMatch = freshState();
  }
  return g.__erastoLeagueMatch;
}

function subscribers(): Set<Subscriber> {
  const g = bus();
  if (!g.__erastoLeagueSubscribers) {
    g.__erastoLeagueSubscribers = new Set();
  }
  return g.__erastoLeagueSubscribers;
}

export function subscribeToMatch(subscriber: Subscriber): () => void {
  const set = subscribers();
  set.add(subscriber);
  return () => {
    set.delete(subscriber);
  };
}

function publish(state: MatchState): void {
  for (const subscriber of subscribers()) {
    try {
      subscriber(state);
    } catch {
      // Entrega é best-effort — um stream já fechado não derruba os outros.
    }
  }
}

// Único ponto de escrita. Aplica a mutação in-place no estado global, carimba updatedAt e
// notifica todos os SSE conectados com o snapshot novo.
export function mutateMatchState(mutate: (draft: MatchState) => void): MatchState {
  const state = getMatchState();
  mutate(state);
  state.updatedAt = Date.now();
  publish(state);
  return state;
}

export function bumpScore(side: MatchSide, delta: number): MatchState {
  return mutateMatchState((draft) => {
    const next = draft[side].score + delta;
    draft[side].score = next < 0 ? 0 : next;
  });
}

export function setTeamName(side: MatchSide, name: string): MatchState {
  const fallback = side === "home" ? "Casa" : "Visitante";
  const clean = name.trim().slice(0, 40) || fallback;
  return mutateMatchState((draft) => {
    draft[side].name = clean;
  });
}

export function setLabel(label: string): MatchState {
  const clean = label.trim().slice(0, 24);
  return mutateMatchState((draft) => {
    draft.label = clean;
  });
}

export function resetMatch(): MatchState {
  return mutateMatchState((draft) => {
    draft.home.score = 0;
    draft.away.score = 0;
    draft.label = "";
  });
}
