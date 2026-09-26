import type { BlockRendererProps } from "@venore/plugin-sdk";
import { listOpenMatchPolls } from "../runtime/fan-votes";
import { resolveRequestOrigin } from "../runtime/request-origin";
import { resolveErastoLeagueConfig } from "../shared/config";
import { CALENDAR_FEED_PATH, calendarSubscriptionUrls, matchDurationMinutes } from "../shared/calendar";
import { ErastoLeagueBracketBlock } from "./bracket-block";
import { FavoriteTeamPanel, MatchPollPanel } from "./fan-votes-block";
import { SubscribeCalendar } from "./add-to-calendar";
import { embedBlockProps } from "./embed-block";
import { HomeHero } from "./home/hero";
import { HomeLatestMatches } from "./home/latest-matches";
import { HomeRankings } from "./home/rankings";
import { HomeSection } from "./home/section";
import { HomeTeamsWall } from "./home/teams-wall";
import { HomeUpcoming } from "./home/upcoming";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Página inicial completa (erasto-league.home). A barra contextual do site (@sidebarContextual do
// core) só mostra conteúdo declarado por rota de plugin ou um Menu Contextual de links — não
// blocos, e nunca na raiz "/" — então a coluna lateral mora aqui dentro:
// - desktop largo (xl): capa em cima; embaixo, coluna principal (últimos jogos, classificação,
//   próximos jogos) + coluna lateral de 21rem (votação, destaques, times). Só a partir de xl porque
//   com a sidebar de navegação do tema aberta, em lg a lateral ficaria estreita demais.
// - abaixo disso: uma coluna só, na ordem de prioridade — as duas colunas viram `display: contents`
//   e cada seção ganha um `order`. A votação sobe pro topo quando tem jogo com votação aberta
//   (é quando ela importa) e desce quando só mostra resultado antigo.
export async function ErastoLeagueHomeBlock({ block }: BlockRendererProps) {
  const [config, { origin }] = await Promise.all([resolveErastoLeagueConfig(), resolveRequestOrigin()]);
  const openPolls = await listOpenMatchPolls(config.fanVoteWindowHours);
  const hasOpenPoll = openPolls.length > 0;
  const durationMinutes = matchDurationMinutes(config.periodMs, config.periodCount);
  const scheduleHref = readString(block.data, "scheduleHref").trim();

  return (
    <div className="space-y-8">
      <HomeHero
        title={readString(block.data, "title", "Erasto League")}
        subtitle={readString(block.data, "subtitle")}
        ctaLabel={readString(block.data, "ctaLabel")}
        ctaHref={readString(block.data, "ctaHref").trim()}
        hasOpenPoll={hasOpenPoll}
        durationMinutes={durationMinutes}
        origin={origin}
      />

      <div className="flex flex-col gap-10 xl:grid xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start xl:gap-8">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-10">
          <HomeSection title="Últimos jogos" href="/erasto-league/jogos" hrefLabel="Todos os jogos" className="order-2 xl:order-none">
            <HomeLatestMatches />
          </HomeSection>

          <HomeSection title="Classificação" className="order-3 xl:order-none">
            <ErastoLeagueBracketBlock {...embedBlockProps("erasto-league.bracket", { title: "" })} />
          </HomeSection>

          <HomeSection
            title="Próximos jogos"
            action={<SubscribeCalendar urls={calendarSubscriptionUrls(`${origin}${CALENDAR_FEED_PATH}`)} />}
            href={scheduleHref || undefined}
            hrefLabel="Agenda completa"
            className="order-6 xl:order-none"
          >
            <HomeUpcoming durationMinutes={durationMinutes} origin={origin} />
          </HomeSection>
        </div>

        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-10">
          <HomeSection
            compact
            title="Votação da torcida"
            href="/erasto-league/votar"
            hrefLabel="Votar"
            className={`${hasOpenPoll ? "order-1" : "order-5"} xl:order-none`}
          >
            <div className="space-y-3">
              <MatchPollPanel windowHours={config.fanVoteWindowHours} limit={3} />
              <FavoriteTeamPanel isOpen={config.favoriteTeamVotingOpen} limit={3} />
            </div>
          </HomeSection>

          <HomeSection compact title="Destaques" className="order-4 xl:order-none">
            <HomeRankings windowHours={config.fanVoteWindowHours} />
          </HomeSection>

          <HomeSection compact title="Times" className="order-7 xl:order-none">
            <HomeTeamsWall />
          </HomeSection>
        </div>
      </div>
    </div>
  );
}
