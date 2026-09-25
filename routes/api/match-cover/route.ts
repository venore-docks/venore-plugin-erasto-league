import { NextResponse } from "next/server";
import { isPluginActive } from "@venore/plugin-sdk";
import { loadMatchCoverData } from "../../../runtime/match-cover";
import { renderMatchCover } from "../../../runtime/match-cover-image";
import { slugify } from "../../../shared/slug";

// GET /api/erasto-league/matches/:id/cover — capa 1280×720 do jogo (runtime/match-cover-image.tsx).
// Pública (é a imagem de capa da página pública do jogo). ?download=1 devolve como anexo, pro admin
// baixar e subir no YouTube. Quem exibe passa ?v=<coverMediaId> na URL: trocar a foto muda a URL e
// fura o cache de CDN/navegador; o resto (brasão, nome, rodada) pode levar até o max-age pra
// aparecer.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
  }

  const { id } = await params;
  const data = await loadMatchCoverData(id);
  if (!data) {
    return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 });
  }

  const url = new URL(request.url);
  let cover;
  try {
    cover = await renderMatchCover(data, url.origin);
  } catch (error) {
    console.error("[erasto-league] falha ao gerar a capa do jogo", error);
    return NextResponse.json({ error: "Não foi possível gerar a capa." }, { status: 500 });
  }

  const headers = new Headers({
    "Content-Type": cover.contentType,
    "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
  });
  if (url.searchParams.get("download") === "1") {
    const extension = cover.contentType === "image/jpeg" ? "jpg" : "png";
    headers.set("Content-Disposition", `attachment; filename="capa-${slugify(data.homeName)}-x-${slugify(data.awayName)}.${extension}"`);
  }

  return new Response(new Uint8Array(cover.body), { status: 200, headers });
}
