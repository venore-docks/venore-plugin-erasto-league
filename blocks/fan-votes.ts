import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Parcial/resultado da votação da torcida — Jogador da Torcida (jogo em votação agora; sem nenhum
// aberto, o último que teve voto) e/ou Time favorito da temporada. Sempre lido do banco na hora de
// renderizar (nada do resultado é salvo na composição). Ver blocks/fan-votes-block.tsx.
export const erastoLeagueFanVotesBlockDefinition: BlockDefinition = {
  key: "erasto-league.fan-votes",
  label: "Erasto League — Votação da torcida",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Votação da torcida",
    mode: "both",
    limit: 5,
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    {
      name: "mode",
      type: "select",
      label: "O que mostrar",
      options: [
        { value: "both", label: "Jogador da Torcida + Time favorito" },
        { value: "match", label: "Só o Jogador da Torcida" },
        { value: "favorite", label: "Só o Time favorito" },
      ],
    },
    { name: "limit", type: "number", label: "Quantos colocados em cada ranking" },
  ],
};
