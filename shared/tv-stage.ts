// "Palco" de composição da tela de TV — mesma técnica de venore-plugin-scoreboard (shared/
// tv-stage.ts): compõe contra uma LARGURA DE REFERÊNCIA FIXA em CSS px e escala uniformemente pro
// viewport real via `transform: scale(...)`, então qualquer TV/projetor (1280x720, 1920x1080, 4K,
// ou dentro de um item "página web" de uma playlist do Broadcast Studio) renderiza o MESMO layout,
// só em tamanhos diferentes.
export const TV_STAGE_WIDTH_PX = 1920;
export const TV_STAGE_FALLBACK_HEIGHT_PX = 1080; // 16:9 — o "padrão" quando o viewport ainda não foi medido.

export type TvStageTransform = {
  scale: number;
  stageWidthPx: number;
  stageHeightPx: number;
};

const FALLBACK: TvStageTransform = { scale: 1, stageWidthPx: TV_STAGE_WIDTH_PX, stageHeightPx: TV_STAGE_FALLBACK_HEIGHT_PX };

// Entradas degeneradas (0, negativo, NaN — SSR e o primeiro render antes de medir) caem no palco
// 16:9 sem escala: a view aparece composta e legível, nunca em branco.
export function resolveTvStageTransform(viewportWidth: number, viewportHeight: number): TvStageTransform {
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) return FALLBACK;

  const scale = viewportWidth / TV_STAGE_WIDTH_PX;
  const stageHeightPx = viewportHeight / scale;

  return { scale, stageWidthPx: TV_STAGE_WIDTH_PX, stageHeightPx };
}
