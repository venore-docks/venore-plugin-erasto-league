import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Últimas partidas encerradas — mesma lógica de standings.ts (dado sempre lido na hora de
// renderizar). "limit" é o único ajuste real que o editor tem. Ver blocks/recent-results-block.tsx.
export const erastoLeagueRecentResultsBlockDefinition: BlockDefinition = {
  key: "erasto-league.recent-results",
  label: "Erasto League — Últimos resultados",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Últimos resultados",
    limit: 5,
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    { name: "limit", type: "number", label: "Quantidade de partidas" },
  ],
};
