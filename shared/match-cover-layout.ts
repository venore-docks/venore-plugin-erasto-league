// Tamanho da fonte do nome do time na capa do jogo (runtime/match-cover-image.tsx) — uma linha só,
// então nome comprido encolhe em vez de quebrar/cortar. Barlow Condensed ExtraBold em caixa alta
// ocupa ~0,5em por caractere; cada lado da capa tem 480px.
const COVER_TEAM_NAME_MAX_WIDTH_PX = 460;
const COVER_TEAM_NAME_MAX_PX = 84;
const COVER_TEAM_NAME_MIN_PX = 36;
const AVERAGE_CHAR_EM = 0.5;

export function coverTeamNameFontSize(name: string): number {
  const length = Math.max(1, name.trim().length);
  const fitted = Math.floor(COVER_TEAM_NAME_MAX_WIDTH_PX / (length * AVERAGE_CHAR_EM));
  return Math.max(COVER_TEAM_NAME_MIN_PX, Math.min(COVER_TEAM_NAME_MAX_PX, fitted));
}
