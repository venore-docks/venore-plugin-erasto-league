export type MatchSide = "home" | "away";

export type Team = {
  name: string;
  // Múltiplo de 0,5 — o placar aceita meio gol (+0,5). Ver shared/score.ts.
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

// Cadastro de times/jogadores (Fase 1) — sempre mantido por um admin. crestUrl/photoUrl já vêm
// resolvidos (getMediaAsset em @venore/plugin-sdk/media) pras páginas de perfil não precisarem
// saber de media id.
export type TeamProfile = {
  id: string;
  slug: string;
  name: string;
  // crestMediaId: bruto (pro MediaPickerField do form de edição). crestUrl: já resolvido, pra
  // exibir sem outra ida ao sistema de mídia (listagem, perfil público).
  crestMediaId: string | null;
  crestUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  description: string | null;
  // ISO date (yyyy-mm-dd), sem hora — exibida logo abaixo do nome do time.
  foundedDate: string | null;
};

export type PlayerProfile = {
  id: string;
  slug: string;
  teamId: string;
  name: string;
  number: number | null;
  photoMediaId: string | null;
  photoUrl: string | null;
  bio: string | null;
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
