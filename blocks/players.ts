import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Grade de jogadores — espelha erasto-league.teams (blocks/teams.ts), mesma filosofia: sem campo de
// dado além do título, sempre lido do banco na hora de renderizar. Ver blocks/players-block.tsx.
export const erastoLeaguePlayersBlockDefinition: BlockDefinition = {
  key: "erasto-league.players",
  label: "Erasto League — Jogadores",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Jogadores",
  },
  editorFields: [{ name: "title", type: "text", label: "Título (opcional)" }],
};
