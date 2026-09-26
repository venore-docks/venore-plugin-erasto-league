import { NextResponse } from "next/server";
import { isPluginActive } from "@venore/plugin-sdk";
import { loadFixtureCalendarEvents } from "../../../runtime/calendar";
import { toIcs } from "../../../shared/calendar";

// GET /api/erasto-league/fixtures/:id/calendar — arquivo .ics de UM jogo ("Adicionar à agenda" →
// iPhone/Outlook). O Google Agenda usa o link direto (shared/calendar.ts googleCalendarUrl).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
  }

  const { id } = await params;
  const events = await loadFixtureCalendarEvents(new URL(request.url).origin, id);
  if (events.length === 0) {
    return NextResponse.json({ error: "Jogo não encontrado ou ainda sem data." }, { status: 404 });
  }

  return new Response(toIcs(events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="erasto-league-jogo.ics"`,
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
