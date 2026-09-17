import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Ranking de MVPs — espelha erasto-league.top-scorers (blocks/top-scorers.ts), mesma filosofia: sem
// campo de dado além do título/limite, sempre lido do banco na hora de renderizar. Ver
// blocks/mvp-scorers-block.tsx.
export const erastoLeagueMvpScorersBlockDefinition: BlockDefinition = {
  key: "erasto-league.mvp-scorers",
  label: "Erasto League — MVPs",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "MVPs",
    limit: 10,
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    { name: "limit", type: "number", label: "Quantidade de jogadores" },
  ],
};
