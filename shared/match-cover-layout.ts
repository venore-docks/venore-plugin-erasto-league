// Capa 1280×720 do jogo — tamanho recomendado de miniatura do YouTube e 16:9 que o WhatsApp mostra
// como preview grande. Gerada em runtime/match-cover-image.tsx.
export const COVER_WIDTH = 1280;
export const COVER_HEIGHT = 720;

// URL (relativa) da capa de um jogo. ?v=<foto> em todo lugar que a exibe (súmula, página do jogo,
// og:image): trocar a foto muda a URL e fura cache de CDN/navegador/WhatsApp; mesma chave em todos
// os lugares = mesma entrada de cache na CDN.
export function matchCoverPath(matchId: string, coverMediaId: string | null): string {
  return `/api/erasto-league/matches/${matchId}/cover?v=${encodeURIComponent(coverMediaId ?? "sem-foto")}`;
}

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
