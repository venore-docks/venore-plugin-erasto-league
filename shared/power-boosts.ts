import type { PowerBoostKey } from "../contracts/types";

// MOCK — 5 exemplos pra já ter o controlador de jogo funcionando (pedido explícito: "pode criar
// com uns 5 mockups"). Troca pela lista real assim que o campeonato mandar (só editar este
// catálogo — matchId/side/boostKey já estão no banco, nenhuma migration nova precisa disso).
export const POWER_BOOST_CATALOG: { key: PowerBoostKey; label: string; emoji: string; description: string }[] = [
  { key: "double_goal", label: "Gol em Dobro", emoji: "🔥", description: "O próximo gol do time vale em dobro." },
  { key: "extra_sub", label: "Substituição Extra", emoji: "🔄", description: "Time pode trocar um jogador a mais que o normal." },
  { key: "iron_wall", label: "Muralha", emoji: "🛡️", description: "Anula o próximo gol sofrido." },
  { key: "time_freeze", label: "Tempo Congelado", emoji: "⏱️", description: "Ganha 30s extras de pausa tática." },
  { key: "wildcard", label: "Carta Coringa", emoji: "🃏", description: "Efeito especial definido pelo árbitro na hora." },
];

export const POWER_BOOST_BY_KEY = new Map(POWER_BOOST_CATALOG.map((boost) => [boost.key, boost]));
