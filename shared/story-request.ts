// Qual story gerar (runtime/story.ts) — codificado na query de /api/erasto-league/story. Montado
// pelas páginas (botão Instagram, blocks/share-bar.tsx) e lido pela rota (routes/api/story).
export type StoryRequest =
  | { kind: "match"; matchId: string; vote: boolean }
  | { kind: "player"; slug: string }
  | { kind: "vote-hub" }
  | { kind: "favorite-team" };

export const STORY_PATH = "/api/erasto-league/story";

export function storyPath(request: StoryRequest): string {
  const params = new URLSearchParams();
  if (request.kind === "match") {
    params.set("tipo", "jogo");
    params.set("id", request.matchId);
    if (request.vote) params.set("votar", "1");
  } else if (request.kind === "player") {
    params.set("tipo", "jogador");
    params.set("slug", request.slug);
  } else if (request.kind === "vote-hub") {
    params.set("tipo", "votacao");
  } else {
    params.set("tipo", "time-favorito");
  }
  return `${STORY_PATH}?${params.toString()}`;
}

export function parseStoryRequest(params: URLSearchParams): StoryRequest | null {
  const kind = params.get("tipo");
  if (kind === "jogo") {
    const matchId = params.get("id");
    return matchId ? { kind: "match", matchId, vote: params.get("votar") === "1" } : null;
  }
  if (kind === "jogador") {
    const slug = params.get("slug");
    return slug ? { kind: "player", slug } : null;
  }
  if (kind === "votacao") return { kind: "vote-hub" };
  if (kind === "time-favorito") return { kind: "favorite-team" };
  return null;
}
