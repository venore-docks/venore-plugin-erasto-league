import { NextResponse } from "next/server";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatchState, subscribeToMatch } from "../../../runtime/match-bus";
import type { MatchState } from "../../../contracts/types";

// `export const dynamic` precisa ficar direto no arquivo de rota (Next não lê route segment
// config via reexport). O dispatcher genérico src/app/api/[plugin]/[[...slug]]/route.ts do core
// já declara `force-dynamic` pra todo método/plugin — este aqui é redundante mas explícito, igual
// ao broadcast output-events.
export const dynamic = "force-dynamic";

// Heartbeat: um jogo pode ficar minutos sem gol. Sem nenhum byte no fio, um proxy/switch no meio
// de uma LAN corta a conexão ociosa e a reconexão do EventSource às vezes falha calada. Uma linha
// de comentário SSE (`:` inicial, o browser ignora) a cada 20s mantém o caminho vivo e faz o Node
// perceber cedo um socket morto.
const HEARTBEAT_INTERVAL_MS = 20_000;

// Stream do estado da partida. Sem PIN/sessão: o overlay é somente-leitura (só o placar, nada
// sensível) e roda numa fonte de navegador do OBS que não carrega cookie de PIN. O gate de
// escrita fica todo nas Server Actions do console (routes/control/actions.ts).
export async function GET(): Promise<Response> {
  if (!(await isPluginActive("erasto-league"))) {
    return NextResponse.json({ error: "O plugin Erasto League está desativado." }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const stopHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: MatchState) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      // Dica de reconexão no primeiro byte, e snapshot completo logo em seguida — inclusive numa
      // reconexão automática depois de horas, nunca só deltas.
      controller.enqueue(encoder.encode("retry: 5000\n\n"));
      send(getMatchState());

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          stopHeartbeat();
        }
      }, HEARTBEAT_INTERVAL_MS);

      unsubscribe = subscribeToMatch((state) => {
        send(state);
      });
    },
    cancel() {
      stopHeartbeat();
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Desliga o buffer de resposta de proxies reversos comuns (nginx) — sem isso o proxy segura
      // heartbeat e eventos até encher um bloco.
      "X-Accel-Buffering": "no",
    },
  });
}
