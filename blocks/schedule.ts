import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Agenda de jogos — todos os confrontos em ordem cronológica, com brasão de cada time (ao
// contrário do bloco de fases, que não mostra mais data nenhuma). "limit" é o único ajuste real
// que o editor tem. Ver blocks/schedule-block.tsx e runtime/bracket.ts (getScheduleView).
export const erastoLeagueScheduleBlockDefinition: BlockDefinition = {
  key: "erasto-league.schedule",
  label: "Erasto League — Agenda de jogos",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Agenda de jogos",
    limit: 0,
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    { name: "limit", type: "number", label: "Quantidade de jogos (0 = todos)" },
  ],
};
