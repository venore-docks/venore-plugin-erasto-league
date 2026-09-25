import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getBrandConfig } from "@venore/plugin-sdk/brand";
import { getFanVotesVersion } from "../../runtime/fan-votes";
import { loadVoteTvData } from "../../runtime/vote-tv";
import { resolveRequestOrigin, VOTE_HUB_PATH } from "../../runtime/request-origin";
import { readFavoriteTeamVotingOpenFresh, resolveErastoLeagueConfig } from "../../shared/config";
import { buildQrSvg } from "../../shared/qr";
import { VoteTvCanvas, type VoteTvPin } from "./vote-tv-canvas";

// /ext/erasto-league/vote-tv — parcial da votação da torcida pra TV/projetor (pedido: parcial no
// site E num modelo pra ext/TV). Mesma técnica de palco escalável de routes/tv (shared/tv-stage.ts),
// rodízio entre Jogador da Torcida e Time favorito, QR code fixo na lateral. Sem PIN/sessão, só
// leitura. ?pagina=jogador|time fixa uma das duas páginas (sem rodízio).
export default async function VoteTvPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const query = await searchParams;
  const pin: VoteTvPin = query.pagina === "jogador" ? "match" : query.pagina === "time" ? "favorite" : null;

  const [config, favoriteOpen, brand, { origin, host }, version] = await Promise.all([
    resolveErastoLeagueConfig(),
    readFavoriteTeamVotingOpenFresh(),
    getBrandConfig("png"),
    resolveRequestOrigin(),
    getFanVotesVersion(),
  ]);
  const initialData = await loadVoteTvData(config.fanVoteWindowHours, favoriteOpen);

  return (
    <VoteTvCanvas
      initialData={initialData}
      initialVersion={`${version}|${favoriteOpen ? 1 : 0}`}
      accentColor={config.accentColor}
      brandLogoUrl={brand.logoUrl || null}
      qr={buildQrSvg(`${origin}${VOTE_HUB_PATH}`)}
      displayUrl={`${host}${VOTE_HUB_PATH}`}
      pin={pin}
    />
  );
}
