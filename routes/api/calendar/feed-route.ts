import { NextResponse } from "next/server";
import { isPluginActive } from "@venore/plugin-sdk";
import { loadFixtureCalendarEvents } from "../../../runtime/calendar";
import { toIcs } from "../../../shared/calendar";

// GET /api/erasto-league/agenda — feed de assinatura com TODOS os jogos com data (webcal:// no
// iPhone/Outlook, "adicionar por URL" no Google). Os apps de agenda rebuscam de tempos em tempos
// (REFRESH-INTERVAL de 6h no próprio .ics): jogo remarcado ou novo aparece sozinho na agenda de
// quem assinou. Cache curto na CDN — um feed por visita de app de agenda, não por pessoa.
export async function GET(request: Request) {
  if (!(await isPluginActive("erasto-league"))) {
    return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
  }

  const events = await loadFixtureCalendarEvents(new URL(request.url).origin);
  return new Response(toIcs(events, { feed: true }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="erasto-league.ics"`,
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
