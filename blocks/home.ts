import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Página inicial completa num bloco só — a distribuição fica pronta (capa com o jogo ao vivo ou o
// próximo jogo; coluna principal com últimos jogos, classificação e próximos jogos; coluna lateral
// com votação, destaques e times, fazendo o papel de barra lateral) em vez do admin empilhar ~8
// blocos de largura inteira. Os blocos avulsos continuam existindo pra outras páginas. Ver
// blocks/home-block.tsx.
export const erastoLeagueHomeBlockDefinition: BlockDefinition = {
  key: "erasto-league.home",
  label: "Erasto League — Página inicial completa",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    title: "Erasto League",
    subtitle: "O campeonato interno do Colégio Erasto Gaertner, todas as segundas, quartas e sextas às 10h30.",
    ctaLabel: "Assista ao vivo",
    ctaHref: "",
    scheduleHref: "",
  },
  editorFields: [
    { name: "title", type: "text", label: "Título" },
    { name: "subtitle", type: "textarea", label: "Subtítulo" },
    { name: "ctaLabel", type: "text", label: "Texto do botão (opcional)" },
    { name: "ctaHref", type: "url", label: "Link do botão (opcional — ex: página da transmissão)" },
    { name: "scheduleHref", type: "url", label: "Link da página com a agenda completa (opcional)" },
  ],
};
