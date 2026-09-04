import { NextResponse } from "next/server";
import { isPluginActive } from "@venore/plugin-sdk";
import { readMatchState, subscribeToMatch } from "../../../runtime/match-store";
import type { MatchState } from "../../../contracts/types";

// `export const dynamic` precisa ficar direto no arquivo de rota (Next não lê route segment
// config via reexport). O dispatcher genérico src/app/api/[plugin]/[[...slug]]/route.ts do core já
// declara `force-dynamic`; aqui é redundante mas explícito.
export const dynamic = "force-dynamic";
// A Vercel mata a função no teto de duração — o EventSource reconecta sozinho (retry abaixo) e o
// primeiro byte de cada conexão é um snapshot completo, então o corte é transparente. 300s pra
// não reconectar à toa quando roda em processo único (LAN).
export const maxDuration = 300;

const HEARTBEAT_INTERVAL_MS = 20_000;
// Multi-instância (Vercel): a escrita cai numa instância e o pub/sub em memória só alcança os SSE
// DELA. Este re-poll do banco a cada 1s é o que faz a mudança chegar nas telas conectadas às
// OUTRAS instâncias. Em processo único é só uma rede de segurança barata (um SELECT indexado/s).
const DB_POLL_INTERVAL_MS = 1_000;

// Stream do estado da partida. Sem PIN/sessão: o overlay é somente-leitura e roda numa fonte de
// navegador do OBS sem cookie. O gate de escrita fica todo nas Server Actions.
export async function GET(): Promise<Response> {
  if (!(await isPluginActive("erasto-league"))) {
    return NextResponse.json({ error: "O plugin Erasto League está desativado." }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let dbPoll: ReturnType<typeof setInterval> | null = null;
  let lastSentUpdatedAt = -1;
  let closed = false;

  const cleanup = () => {
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (dbPoll) clearInterval(dbPoll);
    unsubscribe?.();
    heartbeat = dbPoll = null;
    unsubscribe = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: MatchState) => {
        if (closed) return;
        if (payload.updatedAt === lastSentUpdatedAt) return;
        lastSentUpdatedAt = payload.updatedAt;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          cleanup();
        }
      };

      controller.enqueue(encoder.encode("retry: 3000\n\n"));

      try {
        send(await readMatchState());
      } catch {
        // se o primeiro SELECT falhar, o client reconecta pelo retry
      }

      // push instantâneo pra escrita atendida NESTA instância
      unsubscribe = subscribeToMatch((state) => send(state));

      // catch-up cross-instância
      dbPoll = setInterval(() => {
        if (closed) return;
        readMatchState()
          .then(send)
          .catch(() => {
            /* ignora tick com falha — o próximo tenta de novo */
          });
      }, DB_POLL_INTERVAL_MS);

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
