import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Classificação ao vivo — sem campo de dado além do título: a tabela em si vem sempre de
// runtime/standings.ts na hora de renderizar (nunca do que foi salvo na composição), pra nunca
// ficar desatualizada. Ver blocks/standings-block.tsx.
export const erastoLeagueStandingsBlockDefinition: BlockDefinition = {
  key: "erasto-league.standings",
  label: "Erasto League — Classificação",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Classificação",
  },
  editorFields: [{ name: "title", type: "text", label: "Título (opcional)" }],
};
