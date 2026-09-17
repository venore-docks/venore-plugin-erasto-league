import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Transmissão ao vivo — sem campo de dado além do título: o canal é configuração da liga (uma
// única transmissão pro campeonato inteiro, ver shared/settings.ts youtubeChannelId), não algo que
// o admin escolhe por bloco. Ver blocks/broadcast-block.tsx.
export const erastoLeagueBroadcastBlockDefinition: BlockDefinition = {
  key: "erasto-league.broadcast",
  label: "Erasto League — Transmissão",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Transmissão ao vivo",
  },
  editorFields: [{ name: "title", type: "text", label: "Título (opcional)" }],
};
