import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Últimas partidas encerradas — mesma lógica de standings.ts (dado sempre lido na hora de
// renderizar). Sempre mostra as 5 mais recentes + "Ver mais" pra /erasto-league/resultados — sem
// campo de quantidade (a diferença pro "limit" de blocks/top-scorers.ts é que lá ele também
// controla a profundidade do ranking buscado no banco; aqui a lista de partidas não tem essa
// noção, então o corte de exibição é sempre fixo). Ver blocks/recent-results-block.tsx.
export const erastoLeagueRecentResultsBlockDefinition: BlockDefinition = {
  key: "erasto-league.recent-results",
  label: "Erasto League — Últimos resultados",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Últimos resultados",
  },
  editorFields: [{ name: "title", type: "text", label: "Título (opcional)" }],
};
