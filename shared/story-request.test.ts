import { describe, expect, it } from "vitest";
import { parseStoryRequest, storyPath, type StoryRequest } from "./story-request";

describe("storyPath / parseStoryRequest", () => {
  it("ida e volta de todos os tipos", () => {
    const requests: StoryRequest[] = [
      { kind: "match", matchId: "abc", vote: false },
      { kind: "match", matchId: "abc", vote: true },
      { kind: "player", slug: "rafa" },
      { kind: "vote-hub" },
      { kind: "favorite-team" },
    ];
    for (const request of requests) {
      const url = new URL(storyPath(request), "https://exemplo.com");
      expect(url.pathname).toBe("/api/erasto-league/story");
      expect(parseStoryRequest(url.searchParams)).toEqual(request);
    }
  });

  it("query incompleta ou desconhecida não gera story", () => {
    expect(parseStoryRequest(new URLSearchParams("tipo=jogo"))).toBeNull();
    expect(parseStoryRequest(new URLSearchParams("tipo=jogador"))).toBeNull();
    expect(parseStoryRequest(new URLSearchParams("tipo=outro"))).toBeNull();
    expect(parseStoryRequest(new URLSearchParams(""))).toBeNull();
  });
});
