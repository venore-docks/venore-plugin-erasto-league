import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { resolveVoteCallout } from "../../runtime/fan-votes";
import { resolveRequestOrigin, VOTE_HUB_PATH } from "../../runtime/request-origin";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { buildQrSvg } from "../../shared/qr";
import { VoteQrOverlay, type VoteOverlayPosition } from "./vote-qr-overlay";

const POSITIONS: VoteOverlayPosition[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

// /ext/erasto-league/vote-overlay — fonte de navegador SEPARADA do placar no OBS (pedido explícito:
// quem controla os gols não controla o QR — o operador do OBS liga/desliga esta fonte quando
// quiser). Fundo transparente; com votação de jogo aberta mostra o QR do Jogador da Torcida, sem
// ela o do Time favorito (se aberto), e sem nenhuma das duas fica vazio — esquecer a fonte ligada
// não quebra nada. ?pos=top-left|top-right|bottom-left|bottom-right (padrão top-right: o placar
// ocupa o rodapé central e o relógio fica à direita dele).
export default async function VoteOverlayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const query = await searchParams;
  const rawPos = typeof query.pos === "string" ? query.pos : "";
  const position = POSITIONS.includes(rawPos as VoteOverlayPosition) ? (rawPos as VoteOverlayPosition) : "top-right";

  const [config, { origin, host }] = await Promise.all([resolveErastoLeagueConfig(), resolveRequestOrigin()]);
  const initialCallout = await resolveVoteCallout(config.fanVoteWindowHours, config.favoriteTeamVotingOpen);

  return (
    <VoteQrOverlay
      initialCallout={initialCallout}
      qr={buildQrSvg(`${origin}${VOTE_HUB_PATH}`)}
      displayUrl={`${host}${VOTE_HUB_PATH}`}
      accentColor={config.accentColor}
      position={position}
    />
  );
}
