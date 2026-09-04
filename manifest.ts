import type { PluginManifest } from "@venore/plugin-sdk";
import { ERASTO_LEAGUE_SETTINGS } from "./shared/settings";

// Faixa escrita à mão (não importada do CORE_VERSION corrente) — mesmo motivo do broadcastManifest:
// importar a versão atual tornaria a checagem de compatibilidade sempre trivialmente satisfeita.
//
// HOSPEDAGEM: o estado da partida agora é PERSISTIDO (erasto_league.match_state) e o SSE relê o
// banco a cada 1s, então multi-instância (Vercel) já não "zera" o placar. O que ainda pede
// processo único é latência: cada gol leva até ~1s pra propagar entre instâncias, e a função de
// SSE é cortada no teto de duração da Vercel (o EventSource reconecta sozinho + há fallback de
// polling). Pra placar de reação instantânea, rodar como processo único (LAN / next start).
export const erastoLeagueManifest: PluginManifest = {
  manifestVersion: "1.0.0",
  key: "erasto-league",
  name: "Erasto League",
  version: "0.3.0",
  description:
    "Placar de futebol ao vivo: overlay pro OBS + controle pelo celular, com relógio de jogo e atualização em tempo real. Semente do site Erasto League.",
  compatibility: { coreVersion: ">=2.0.0 <3.0.0" },

  // Schema próprio — aplicado no install (run-plugin-migrations.ts), nunca no vercel-build. O
  // default de migrationsSchema derivado da key ("erasto_league_migrations") já basta.
  migrationsPath: "./migrations",

  permissions: [
    { key: "erasto-league.manage", label: "Configurar o Erasto League e ver os atalhos das telas" },
  ],

  // Um link só na nav do admin — leva a /admin/erasto-league (config + atalhos pro overlay e
  // controle). Espelha AdminNavItemDefinition; agregado igual ao item de um context.
  navigation: [
    {
      key: "erasto-league.admin",
      label: "Erasto League",
      href: "/admin/erasto-league",
      icon: "award",
      groupKey: "plugins",
      groupLabel: "Plugins",
      groupOrder: 30,
      order: 40,
      requiredPermission: ["erasto-league.manage"],
    },
  ],

  settings: Object.values(ERASTO_LEAGUE_SETTINGS).map(({ key, defaultValue }) => ({ key, defaultValue })),
};
