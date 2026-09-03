// Barrel público do plugin. Spike: só os tipos do placar. Ainda não há superfície de domínio
// (handler/service/store) — o overlay e o console falam com runtime/match-bus direto, porque o
// estado é 100% em memória e não cruza nenhum outro context.
export type { MatchState, Team, MatchSide } from "./contracts/types";
