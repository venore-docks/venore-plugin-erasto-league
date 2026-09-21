export type MatchSide = "home" | "away";

// Fase 2 — partida como entidade viva. "cancelled" nunca é mais escrito (runtime/match-actions.ts
// cancelMatch apaga a partida de vez, ver hardDeleteMatchCascade em runtime/matches.ts — pedido
// explícito: cancelar não deve deixar registro na súmula) — o valor só continua no union por
// compatibilidade com partidas cancelled de antes dessa mudança que ainda possam existir no banco.
export type MatchStatus = "in_progress" | "finished" | "cancelled";
export type EventKind = "goal" | "yellow_card" | "red_card" | "foul";

// Identificador estável de um power boost do catálogo (power_boosts.key) — segue o rótulo na
// criação, não muda com edições de rótulo depois (ver runtime/power-boosts.ts).
export type PowerBoostKey = string;

// Catálogo de power boosts, editável pelo admin (/admin/erasto-league/power-boosts,
// runtime/power-boosts.ts) — antes era uma lista mockada de 5 exemplos.
export type PowerBoost = {
  id: string;
  key: PowerBoostKey;
  label: string;
  emoji: string;
  description: string;
};

export type PowerBoostUse = {
  id: string;
  matchId: string;
  side: MatchSide;
  boostKey: PowerBoostKey;
  minuteMs: number | null;
  createdAt: number;
};

// Marcadores da partida ao vivo (MatchState.goals/cards/boosts abaixo) — versão "pronta pra
// exibir" dos match_events/match_boosts da partida atual: nome do jogador e rótulo/emoji do
// catálogo já resolvidos, pra nem o overlay (sem sessão, não pode chamar as mesmas queries que o
// controle) nem o controle precisarem resolver isso sozinhos. Sempre recalculados na hora (ver
// runtime/match-store.ts), nunca persistidos como tal.
export type GoalMarker = {
  id: string;
  side: MatchSide;
  playerId: string | null;
  playerName: string | null;
  // 1 (gol) ou 0.5 (meio gol) — nunca negativo aqui (correção −1/−0,5 não entra na lista, ver
  // runtime/match-store.ts).
  amount: number;
  occurredAt: number;
};

export type CardMarker = {
  id: string;
  side: MatchSide;
  kind: "yellow_card" | "red_card";
  playerId: string | null;
  playerName: string | null;
};

export type BoostMarker = {
  id: string;
  side: MatchSide;
  boostKey: PowerBoostKey;
  label: string;
  emoji: string;
};

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
  // null = nenhuma partida em andamento (overlay ocioso; controle pede escolher os times).
  currentMatchId: string | null;
  // Id do time cadastrado (Fase 1) de cada lado — null junto com currentMatchId. O controle usa
  // isso pra buscar o elenco (seletor "quem fez?" de gol/cartão/falta); mantido em MatchState (não
  // só em prop estática de page load) pra continuar certo numa aba que não foi quem deu startMatch.
  homeTeamId: string | null;
  awayTeamId: string | null;
  home: Team;
  away: Team;
  // Texto curto opcional exibido no overlay ("1º TEMPO", "INTERVALO"…). "" = sem etiqueta.
  label: string;
  // Teaser opcional do overlay ocioso ("Em breve: Time A x Time B") — só faz sentido junto com
  // currentMatchId null; o controle liga/desliga na tela de escolher times. null = overlay fica
  // transparente sem nada, como sempre foi.
  preMatchMessage: string | null;
  clock: MatchClock;
  // Marcadores da partida atual, sempre os da partida referenciada por currentMatchId (recalculados
  // do zero a cada leitura, ver runtime/match-store.ts) — [] quando currentMatchId é null. goals é
  // usado pelo overlay só pro "flash" de 10s de quem fez o último gol (o mais recente do array);
  // cards/boosts ficam visíveis o tempo todo (acima do nome do time), ver routes/overlay/scoreboard.tsx.
  goals: GoalMarker[];
  cards: CardMarker[];
  boosts: BoostMarker[];
  // Epoch ms da última alteração — o SSE usa pra decidir se empurra um snapshot novo.
  updatedAt: number;
};

// Evento de partida (Fase 2) — um gol/cartão/falta. playerId null = ainda não atribuído (corrigível
// na súmula, ver runtime/match-events.ts).
export type MatchEvent = {
  id: string;
  matchId: string;
  kind: EventKind;
  side: MatchSide;
  playerId: string | null;
  amount: number;
  minuteMs: number | null;
  createdAt: number;
};

// Classificação (Fase 5) — agregada de matches finalizadas, semeada com todo time cadastrado
// (aparece com 0 jogos antes da primeira partida).
export type TeamStanding = {
  teamId: string;
  slug: string;
  name: string;
  crestUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  yellowCards: number;
  redCards: number;
};

// Ficha de uma partida (súmula/histórico) — Fases 3/5.
export type MatchSummary = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  label: string;
  status: MatchStatus;
  startedAt: number;
  finishedAt: number | null;
  // MVP da partida — escolhido manualmente (súmula ou controle), nunca calculado. Ver
  // runtime/matches.ts::setMatchMvp.
  mvpPlayerId: string | null;
  mvpNote: string | null;
  // Link da transmissão/gravação no YouTube deste jogo — colado manualmente na súmula (súmula
  // sempre existe primeiro; todo jogo é transmitido, mas o link só existe depois de gravado/ao
  // vivo). null = página pública do jogo mostra "transmissão não disponível". Ver
  // runtime/matches.ts::setMatchYoutubeUrl e routes/match-public.
  youtubeUrl: string | null;
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

export type PlayerGender = "male" | "female";

// Posição de jogo (futsal/society) — nullable como gender: não trava cadastro de quem já existe
// sem essa info. Ver shared/player-position.ts pros rótulos.
export type PlayerPosition = "goleiro" | "fixo" | "ala" | "pivo";

export type PlayerProfile = {
  id: string;
  slug: string;
  teamId: string;
  name: string;
  number: number | null;
  gender: PlayerGender | null;
  position: PlayerPosition | null;
  isCaptain: boolean;
  photoMediaId: string | null;
  photoUrl: string | null;
  bio: string | null;
};

// Fase 6 — copa (grupos + eliminatórias). Um "fixture" é um CONFRONTO agendado — pode existir
// antes de qualquer partida ter sido jogada (importado via CSV), e opcionalmente aponta pra uma
// `matches` row (Fase 2) quando o jogo já rolou. Times "TBD" (ex: quartas antes das quartas
// existirem de verdade) usam homeLabel/awayLabel ("Vencedor Grupo A") em vez de homeTeamId/
// awayTeamId — o widget de chaveamento (erasto-league.bracket) sabe mostrar os dois casos.
export type FixturePhase = "group" | "quarterfinal" | "semifinal" | "final";

export type Fixture = {
  id: string;
  phase: FixturePhase;
  // Só faz sentido em phase "group" — "A"/"B"/"C"...
  groupName: string | null;
  // Rótulo livre da rodada dentro da fase de grupos (ex: "1ª Rodada") — informativo, não
  // participa de nenhum cálculo.
  roundLabel: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string | null;
  awayLabel: string | null;
  // Data e hora SEPARADAS (não um timestamp combinado) — ver shared/timezone.ts pro motivo.
  // "YYYY-MM-DD". null = "a definir".
  scheduledDate: string | null;
  // "HH:mm" (sem segundos, mesmo formato de <input type="time">). Só faz sentido com
  // scheduledDate preenchido; null = "dia marcado, horário a definir".
  scheduledTime: string | null;
  // Preenchido quando o confronto já foi jogado — vínculo manual (tela de fixtures do admin),
  // não automático.
  matchId: string | null;
  // Posição de exibição dentro da fase (ex: QF1..QF4) — controla a ordem nas colunas do
  // chaveamento.
  sortOrder: number;
};

// Ações que o controle (celular) e a tela admin podem disparar. Os dois são protegidos pela mesma
// permissão ("erasto-league.manage", via getPluginAdminPageData) — convergem nos mutators de
// runtime/match-actions.ts.
export type ClockCommand =
  | { kind: "start" }
  | { kind: "pause" }
  | { kind: "reset" }
  | { kind: "set"; ms: number }
  | { kind: "adjust"; deltaMs: number };
