import { NextResponse } from "next/server";
import { isPluginActive } from "@venore/plugin-sdk";
import { loadStoryData } from "../../../runtime/story";
import { renderStory } from "../../../runtime/story-image";
import { parseStoryRequest } from "../../../shared/story-request";

// GET /api/erasto-league/story?tipo=jogo|jogador|votacao|time-favorito — story 1080×1920 pro
// Instagram (runtime/story-image.tsx). Só é gerado quando alguém toca em "Instagram"
// (blocks/share-bar.tsx), nunca no carregamento da página; cache curto na CDN pra o mesmo story
// compartilhado por várias pessoas não ser gerado de novo a cada vez.
export async function GET(request: Request) {
  if (!(await isPluginActive("erasto-league"))) {
    return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
  }

  const url = new URL(request.url);
  const storyRequest = parseStoryRequest(url.searchParams);
  if (!storyRequest) {
    return NextResponse.json({ error: "Story inválido." }, { status: 400 });
  }

  const data = await loadStoryData(storyRequest, url.host);
  if (!data) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  let image;
  try {
    image = await renderStory(data, url.origin);
  } catch (error) {
    console.error("[erasto-league] falha ao gerar o story", error);
    return NextResponse.json({ error: "Não foi possível gerar a imagem." }, { status: 500 });
  }

  return new Response(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Disposition": `inline; filename="erasto-league-story.${image.contentType === "image/jpeg" ? "jpg" : "png"}"`,
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
