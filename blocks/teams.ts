import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Grade de times — substitui a antiga rota standalone "/ext/erasto-league/teams" (pedido
// explícito: lista de times vira um BLOCO pro CMS, não uma página fixa do plugin — o admin
// decide em que página do site ela aparece). Mesma filosofia de standings.ts: sem campo de dado
// além do título, sempre lido do banco na hora de renderizar. Ver blocks/teams-block.tsx.
export const erastoLeagueTeamsBlockDefinition: BlockDefinition = {
  key: "erasto-league.teams",
  label: "Erasto League — Times",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Times",
  },
  editorFields: [{ name: "title", type: "text", label: "Título (opcional)" }],
};
