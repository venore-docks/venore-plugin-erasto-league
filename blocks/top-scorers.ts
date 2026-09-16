import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Artilharia — mesma filosofia de standings.ts (sem campo de dado além do título/limite, sempre
// lido do banco na hora de renderizar). Ver blocks/top-scorers-block.tsx.
export const erastoLeagueTopScorersBlockDefinition: BlockDefinition = {
  key: "erasto-league.top-scorers",
  label: "Erasto League — Artilharia",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Artilharia",
    limit: 10,
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    { name: "limit", type: "number", label: "Quantidade de jogadores" },
  ],
};
