export type MatchSide = "home" | "away";

export type Team = {
  name: string;
  score: number;
};

// Relógio de jogo. O overlay NÃO recebe tique a tique — recebe estes três campos e calcula o
// tempo decorrido localmente (shared/clock.ts → computeElapsedMs), então o cronômetro corre
// suave mesmo entre syncs / durante uma reconexão do SSE.
//   elapsedMs = accumulatedMs + (running ? Date.now() - anchorMs : 0)
export type MatchClock = {
  running: boolean;
  // Epoch ms do último "iniciar"/"retomar". null enquanto o relógio nunca rodou.
  anchorMs: number | null;
  // Ms acumulados antes do segmento em curso (somados nas pausas).
  accumulatedMs: number;
};

// Estado completo da partida ao vivo. É o payload que trafega no SSE (snapshot inteiro a cada
// mudança — nunca delta) e o que o console/overlay renderizam. Persistido em
// erasto_league.match_state (linha única "singleton").
export type MatchState = {
  home: Team;
  away: Team;
  // Texto curto opcional exibido no overlay ("1º TEMPO", "INTERVALO"…). "" = sem etiqueta.
  label: string;
  clock: MatchClock;
  // Epoch ms da última alteração — o SSE usa pra decidir se empurra um snapshot novo.
  updatedAt: number;
};

// Ações que o controle (celular) e a tela admin podem disparar. PIN protege o controle;
// authorizeActor("erasto-league.manage") protege a tela admin. As duas convergem nos mutators de
// runtime/match-actions.ts.
export type ClockCommand =
  | { kind: "start" }
  | { kind: "pause" }
  | { kind: "reset" }
  | { kind: "set"; ms: number }
  | { kind: "adjust"; deltaMs: number };
