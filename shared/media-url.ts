import { getMediaAsset, pickMediaVariantUrl } from "@venore/plugin-sdk/media";

// URL de foto/brasão/logo pra EXIBIR — a cópia redimensionada do sistema de mídia do host
// (variantes WebP), não o original. Antes cada <img> baixava a foto de celular inteira (2–8 MB)
// pra mostrar num círculo de 48px, e a cota de transferência do Blob estourou.
//
// Largura padrão = o maior lugar em que foto/brasão aparece no site e na TV (avatar do perfil,
// size-24 = 96px; TV 84px). Com a densidade 2x do host, isso cai na variante de 480px (dezenas de
// KB). Upload antigo ainda sem variante (antes do backfill em /admin/media) devolve o original.
export const DISPLAY_IMAGE_WIDTH = 96;

// Imagens geradas no servidor (capa 1280×720, story 1080×1920) pedem a largura em pixel real:
// pixelDensity 1.
export async function resolveMediaImageUrl(
  mediaId: string | null,
  displayWidth = DISPLAY_IMAGE_WIDTH,
  pixelDensity?: number,
): Promise<string | null> {
  if (!mediaId) return null;
  const result = await getMediaAsset({ id: mediaId });
  return result.success && result.data ? pickMediaVariantUrl(result.data, displayWidth, pixelDensity) : null;
}
