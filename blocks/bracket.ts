import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Fases do campeonato (grupos + oitavas/quartas/semi/final) — sem campo de dado: tudo vem de
// runtime/bracket.ts na hora de renderizar (fixtures importados via CSV ou cadastrados pela tela
// de admin/fixtures). Ver blocks/bracket-block.tsx.
export const erastoLeagueBracketBlockDefinition: BlockDefinition = {
  key: "erasto-league.bracket",
  label: "Erasto League — Fases (grupos + eliminatórias)",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Fases do campeonato",
    variant: "full",
  },
  editorFields: [
    { name: "title", type: "text", label: "Título (opcional)" },
    {
      name: "variant",
      type: "select",
      label: "Conteúdo",
      options: [
        { value: "full", label: "Grupos + eliminatórias" },
        { value: "knockout", label: "Só a chave (oitavas, quartas, semi e final)" },
      ],
    },
  ],
};
