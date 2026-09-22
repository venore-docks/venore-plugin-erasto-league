import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Capa da página do campeonato — título/subtítulo/CTA editáveis pelo builder; cor de destaque vem
// do TEMA do site (var(--primary)), não das settings do plugin (aquela é só a identidade visual de
// overlay/controle/TV, telas fora do tema). Ver blocks/hero-block.tsx.
export const erastoLeagueHeroBlockDefinition: BlockDefinition = {
  key: "erasto-league.hero",
  label: "Erasto League — Capa",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Erasto League",
    subtitle: "O campeonato interno do colégio, ao vivo.",
    ctaLabel: "",
    ctaHref: "",
  },
  editorFields: [
    { name: "title", type: "text", label: "Título" },
    { name: "subtitle", type: "textarea", label: "Subtítulo" },
    { name: "ctaLabel", type: "text", label: "Texto do botão (opcional)" },
    { name: "ctaHref", type: "url", label: "Link do botão (opcional)" },
  ],
};
