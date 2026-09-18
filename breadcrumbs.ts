import { cache } from "react";
import type { BreadcrumbSegmentDefinition } from "@venore/plugin-sdk";
import { staticBreadcrumbSegment, dynamicBreadcrumbSegment } from "@venore/plugin-sdk";
import { getTeamBySlug } from "./runtime/teams";
import { getPlayerBySlug } from "./runtime/players";

// Mesmo padrão de venore-plugin-academy/breadcrumbs.ts: cache() por slug pra reuso real dentro do
// request (embora hoje só o resolver de breadcrumb chame estas duas — as páginas públicas
// (routes/teams-public, routes/players-public) ainda chamam os runtime/* crus).
export const getCachedTeamBySlug = cache((slug: string) => getTeamBySlug(slug));
export const getCachedPlayerBySlug = cache((slug: string) => getPlayerBySlug(slug));

// "erasto-league" sozinho não tem página própria — é 100% CMS (o admin decide em que página o
// bloco de times/resultados aparece, ver routes/route-table.ts). Por isso href: null aqui: rótulo
// de contexto na trilha, não um link pra rota que ainda não existe. Se um dia existir uma página
// fixa de índice, troque para href: "/erasto-league" (ou remova este registro e deixe o CMS
// resolver o próprio rótulo daquele nível).
export const erastoLeagueBreadcrumbSegments: BreadcrumbSegmentDefinition[] = [
  staticBreadcrumbSegment({ key: "erasto-league.public.home", segments: ["erasto-league"], label: "Erasto League", href: null }),
  dynamicBreadcrumbSegment({
    key: "erasto-league.public.team",
    segments: ["erasto-league", "teams", ":slug"],
    paramName: "slug",
    resolveLabel: async (slug) => {
      const team = await getCachedTeamBySlug(slug);
      return team ? team.name : null;
    },
  }),
  dynamicBreadcrumbSegment({
    key: "erasto-league.public.player",
    segments: ["erasto-league", "players", ":slug"],
    paramName: "slug",
    resolveLabel: async (slug) => {
      const player = await getCachedPlayerBySlug(slug);
      return player ? player.name : null;
    },
  }),
  staticBreadcrumbSegment({ key: "erasto-league.public.artilharia", segments: ["erasto-league", "artilharia"], label: "Artilharia" }),
  staticBreadcrumbSegment({ key: "erasto-league.public.mvps", segments: ["erasto-league", "mvps"], label: "MVPs" }),
  staticBreadcrumbSegment({ key: "erasto-league.public.resultados", segments: ["erasto-league", "resultados"], label: "Resultados" }),
];
