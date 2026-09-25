import type { Metadata } from "next";
import { loadMatchShareInfo, type MatchShareInfo } from "./match-cover";
import { listOpenMatchPolls } from "./fan-votes";
import { resolveRequestOrigin, VOTE_HUB_PATH } from "./request-origin";
import { readFanVoteWindowHours } from "../shared/config";
import { COVER_HEIGHT, COVER_WIDTH, matchCoverPath } from "../shared/match-cover-layout";

// <head> das páginas públicas do jogo e da votação — o que o WhatsApp (e redes sociais) mostram ao
// colar o link: título, descrição e a capa 1280×720 do jogo (a mesma que vai pro YouTube, SEM
// placar) como imagem. Ligado na route-table (generateMetadata das entradas "public"); o core chama
// pelo generateMetadata do catch-all do CMS. og:image precisa de URL absoluta e o host não declara
// metadataBase — a origem vem do próprio request (runtime/request-origin.ts).

function matchTitle(info: MatchShareInfo): string {
  return `${info.homeName} × ${info.awayName}`;
}

function contextLine(info: MatchShareInfo): string {
  return [info.stageLabel, info.dateLabel].filter(Boolean).join(" · ");
}

function shareMetadata({
  title,
  ogTitle,
  description,
  url,
  image,
}: {
  title: string;
  ogTitle: string;
  description: string;
  url: string;
  image: { url: string; alt: string } | null;
}): Metadata {
  const images = image ? [{ url: image.url, width: COVER_WIDTH, height: COVER_HEIGHT, alt: image.alt }] : undefined;
  return {
    title,
    description,
    openGraph: { type: "website", locale: "pt_BR", title: ogTitle, description, url, images },
    twitter: { card: image ? "summary_large_image" : "summary", title: ogTitle, description, images: image ? [image.url] : undefined },
  };
}

// /erasto-league/jogos/:id
export async function buildMatchPageMetadata(matchId: string): Promise<Metadata> {
  const info = await loadMatchShareInfo(matchId);
  if (!info) return {};
  const { origin } = await resolveRequestOrigin();
  const title = matchTitle(info);
  const context = contextLine(info);
  return shareMetadata({
    title,
    ogTitle: `${title} · Erasto League`,
    description: `${context ? `${context} — ` : ""}transmissão, lances e votação do Jogador da Torcida.`,
    url: `${origin}/erasto-league/jogos/${matchId}`,
    image: { url: `${origin}${matchCoverPath(matchId, info.coverMediaId)}`, alt: title },
  });
}

// /erasto-league/votar/jogo/:id
export async function buildMatchVoteMetadata(matchId: string): Promise<Metadata> {
  const info = await loadMatchShareInfo(matchId);
  if (!info) return {};
  const { origin } = await resolveRequestOrigin();
  const title = `Jogador da Torcida: ${matchTitle(info)}`;
  return shareMetadata({
    title,
    ogTitle: `Vote no Jogador da Torcida — ${matchTitle(info)}`,
    description: "Escolha o craque do jogo. Sem cadastro: cada aparelho vota uma vez.",
    url: `${origin}/erasto-league/votar/jogo/${matchId}`,
    image: { url: `${origin}${matchCoverPath(matchId, info.coverMediaId)}`, alt: matchTitle(info) },
  });
}

// /erasto-league/votar — o link que circula (QR, descrição do YouTube, grupo de WhatsApp). Com um
// jogo em votação, a capa dele vira a imagem; sem nenhum, fica só o texto.
export async function buildVoteHubMetadata(): Promise<Metadata> {
  const windowHours = await readFanVoteWindowHours();
  const [openPolls, { origin }] = await Promise.all([listOpenMatchPolls(windowHours), resolveRequestOrigin()]);
  const featured = openPolls[0] ? await loadMatchShareInfo(openPolls[0].match.id) : null;
  return shareMetadata({
    title: "Votação da torcida",
    ogTitle: featured ? `Vote no Jogador da Torcida — ${matchTitle(featured)}` : "Votação da torcida · Erasto League",
    description: "Escolha o Jogador da Torcida de cada jogo e o seu time favorito da temporada. Sem cadastro: cada aparelho vota uma vez.",
    url: `${origin}${VOTE_HUB_PATH}`,
    image: featured ? { url: `${origin}${matchCoverPath(featured.matchId, featured.coverMediaId)}`, alt: matchTitle(featured) } : null,
  });
}
