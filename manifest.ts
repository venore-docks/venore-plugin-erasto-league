import type { PluginManifest } from "@venore/plugin-sdk";

// Faixa escrita à mão (não importada do CORE_VERSION corrente) — mesmo motivo do
// broadcastManifest: importar a versão atual tornaria a checagem de compatibilidade sempre
// trivialmente satisfeita.
//
// HOSPEDAGEM: como o broadcast, este plugin exige um único processo Node de longa duração
// (servidor local / uma instância). O placar e o barramento de eventos SSE são um pub/sub em
// memória guardado em globalThis (runtime/match-bus.ts) — não sobrevive a restart nem a
// multi-instância. Trocar por Postgres + Redis pub/sub é pré-requisito pra virar o site
// "Erasto League" de verdade (ver README, seção "Limites do spike").
export const erastoLeagueManifest: PluginManifest = {
  manifestVersion: "1.0.0",
  key: "erasto-league",
  name: "Erasto League",
  version: "0.1.0",
  description:
    "Placar de futebol ao vivo: overlay transparente pro OBS + controle pelo celular, com atualização em tempo real. Semente do site Erasto League.",
  compatibility: { coreVersion: ">=2.0.0 <3.0.0" },
  // Spike: sem schema, sem permission própria, sem item de navegação admin. As duas telas são
  // acessadas por URL direta (/ext/erasto-league/overlay e /ext/erasto-league/control) e o
  // controle é gateado por PIN (env ERASTO_LEAGUE_PIN), não por RBAC.
};
