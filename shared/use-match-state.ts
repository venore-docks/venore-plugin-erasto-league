"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchState } from "../contracts/types";

// Assinatura do estado da partida com degradação: SSE (/api/erasto-league/events) como caminho
// primário e, quando ele cai — a Vercel corta a função no teto de duração —, polling de
// /api/erasto-league/state a cada 2s até o SSE voltar. O relógio é calculado localmente pelo
// consumidor (computeElapsedMs) a partir de {running, anchorMs, accumulatedMs}, então uma janela
// sem conexão não congela o cronômetro na tela.
export function useMatchState(initial: MatchState): {
  state: MatchState;
  setState: (s: MatchState) => void;
  live: boolean;
} {
  const [state, setState] = useState<MatchState>(initial);
  const [live, setLive] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const apply = (raw: string) => {
      try {
        const next = JSON.parse(raw) as MatchState;
        // não regride pra um snapshot mais velho (SSE e poll podem se cruzar)
        if (next.updatedAt >= stateRef.current.updatedAt) setState(next);
      } catch {
        /* keep-alive / linha malformada */
      }
    };

    const startPolling = () => {
      if (poll || stopped) return;
      poll = setInterval(() => {
        fetch("/api/erasto-league/state", { cache: "no-store" })
          .then((r) => (r.ok ? r.text() : null))
          .then((t) => t && apply(t))
          .catch(() => {});
      }, 2000);
    };
    const stopPolling = () => {
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    };

    const connect = () => {
      if (stopped) return;
      es = new EventSource("/api/erasto-league/events");
      es.onopen = () => {
        setLive(true);
        stopPolling();
      };
      es.onmessage = (event) => apply(event.data);
      es.onerror = () => {
        setLive(false);
        startPolling();
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      es?.close();
      stopPolling();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  return { state, setState, live };
}

// Tique local pro relógio — re-render a cada `ms` (default 200ms) só pra o cronômetro andar.
export function useTick(ms = 200): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
