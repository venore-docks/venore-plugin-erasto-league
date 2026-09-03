export type MatchSide = "home" | "away";

export type Team = {
  name: string;
  score: number;
};

// Estado completo da partida ao vivo. É o payload que trafega no SSE (snapshot inteiro a cada
// mudança — nunca delta) e o que o console/overlay renderizam.
export type MatchState = {
  home: Team;
  away: Team;
  // Texto curto opcional exibido no overlay ("1º TEMPO", "INTERVALO", "AO VIVO"...). "" = sem chip.
  label: string;
  // Epoch ms da última alteração — só pra debug/telemetria por enquanto.
  updatedAt: number;
};
