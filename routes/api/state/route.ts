import { NextResponse } from "next/server";
import { isPluginActive } from "@venore/plugin-sdk";
import { readMatchState } from "../../../runtime/match-store";

export const dynamic = "force-dynamic";

// Snapshot JSON do estado atual. Usado como fallback do overlay/console quando o EventSource cai
// (a Vercel corta a função no teto de duração) — enquanto o SSE está fora, o client faz polling
// aqui a cada ~2s. Somente-leitura, sem PIN, igual ao stream.
export async function GET(): Promise<Response> {
  if (!(await isPluginActive("erasto-league"))) {
    return NextResponse.json({ error: "O plugin Erasto League está desativado." }, { status: 404 });
  }
  try {
    return NextResponse.json(await readMatchState(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Falha ao ler o estado da partida." }, { status: 500 });
  }
}
