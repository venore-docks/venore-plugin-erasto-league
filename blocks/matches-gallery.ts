import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Todos os jogos já salvos (súmulas) em grade de cards com a miniatura da transmissão — cada card
// leva pra página pública do jogo (vídeo embutido + súmula). Diferente de "Últimos resultados" (5
// encerrados, em linha) e da "Agenda" (confrontos futuros e passados da tabela): aqui é o acervo
// de jogos/transmissões inteiro, sempre lido do banco na hora. Ver blocks/matches-gallery-block.tsx.
export const erastoLeagueMatchesGalleryBlockDefinition: BlockDefinition = {
  key: "erasto-league.matches-gallery",
  label: "Erasto League — Jogos e transmissões",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Jogos",
    filter: "all",
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    {
      name: "filter",
      type: "select",
      label: "Quais jogos",
      options: [
        { value: "all", label: "Todos os jogos salvos" },
        { value: "broadcast", label: "Só os que têm transmissão (link do YouTube)" },
      ],
    },
  ],
};
