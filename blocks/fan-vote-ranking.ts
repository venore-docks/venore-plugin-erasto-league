import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Ranking do Jogador da Torcida — espelha erasto-league.mvp-scorers (blocks/mvp-scorers.ts): quantas
// vezes cada jogador foi o mais votado pela torcida (votação encerrada; empate conta pra todos).
// Sempre lido do banco na hora de renderizar. Ver blocks/fan-vote-ranking-block.tsx.
export const erastoLeagueFanVoteRankingBlockDefinition: BlockDefinition = {
  key: "erasto-league.fan-vote-ranking",
  label: "Erasto League — Ranking do Jogador da Torcida",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Jogador da Torcida",
    limit: 10,
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    { name: "limit", type: "number", label: "Quantidade de jogadores" },
  ],
};
