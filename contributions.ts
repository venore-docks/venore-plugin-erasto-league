import type { PluginContributions } from "@venore/plugin-sdk";
import { blockDefinitions } from "./blocks/definitions";
import { erastoLeagueBreadcrumbSegments } from "./breadcrumbs";

// O que o Erasto League contribui pro core (docs/plugins-repos-separados-plano.md). Blocos de
// page-builder pra montar a home do campeonato (capa, classificação, últimos resultados) via CMS —
// `blockDefinitions` é dado puro e entra direto; `blockRenderers` é um loader preguiçoso (a árvore
// de render sobe até runtime/* -> db), mesmo padrão do venore-plugin-donation.
export const erastoLeagueContributions: PluginContributions = {
  blockDefinitions,
  blockRenderers: async () => (await import("./blocks/renderers")).blockRenderers,
  breadcrumbSegments: erastoLeagueBreadcrumbSegments,
};
