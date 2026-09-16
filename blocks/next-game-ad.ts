import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// "Ad" 16:9 do próximo jogo — card promocional (times + rodada + data), pensado pra ir tanto na
// página inicial quanto (mesmo dado, ver runtime/bracket.ts getNextFixture) na view de TV. Ver
// blocks/next-game-ad-block.tsx.
export const erastoLeagueNextGameAdBlockDefinition: BlockDefinition = {
  key: "erasto-league.next-game-ad",
  label: "Erasto League — Próximo jogo (ad 16:9)",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Próximo jogo",
  },
  editorFields: [{ name: "title", type: "text", label: "Selo/etiqueta (opcional)" }],
};
