import type { PlayerPosition } from "../contracts/types";

// Nomenclatura de futsal/society (modalidade da Erasto League) — mesmo padrão de
// shared/player-gender.ts. "Ala" cobre os dois lados (não há esquerda/direita separada, o cadastro
// já é simples o bastante sem essa granularidade).
export const PLAYER_POSITION_LABEL: Record<PlayerPosition, string> = {
  goleiro: "Goleiro",
  fixo: "Fixo",
  ala: "Ala",
  pivo: "Pivô",
};
