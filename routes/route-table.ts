import { asPluginApiHandler, asPluginPage, type PluginRouteTable } from "@venore/plugin-sdk";
import AdminPage from "./admin/page";
import TeamsAdminPage from "./admin/teams/page";
import TeamDetailPage from "./admin/teams/team-page";
import PlayersAdminPage from "./admin/players/page";
import PlayerDetailPage from "./admin/players/player-page";
import MatchesAdminPage from "./admin/matches/page";
import MatchDetailPage from "./admin/matches/match-page";
import FixturesAdminPage from "./admin/fixtures/page";
import FixtureDetailPage from "./admin/fixtures/fixture-page";
import PowerBoostsAdminPage from "./admin/power-boosts/page";
import ImportAdminPage from "./admin/import/page";
import VotesAdminPage from "./admin/votes/page";
import OverlayPage from "./overlay/page";
import ControlPage from "./control/page";
import TvPage from "./tv/page";
import TeamProfilePage from "./teams-public/page";
import PlayerProfilePage from "./players-public/page";
import ArtilleryPage from "./artillery-public/page";
import MvpPage from "./mvp-public/page";
import ResultsPage from "./results-public/page";
import MatchPublicPage from "./match-public/page";
import VoteHubPage from "./vote-public/page";
import MatchVotePage from "./vote-public/match-page";
import FavoriteTeamVotePage from "./vote-public/favorite-team-page";
import VoteOverlayPage from "./vote-overlay/page";
import VoteTvPage from "./vote-tv/page";
import { GET as eventsGET } from "./api/events/route";
import { GET as stateGET } from "./api/state/route";
import { GET as matchCoverGET } from "./api/match-cover/route";

// - admin      -> /admin/erasto-league          (config + atalhos; link vem do manifest.navigation)
//                 /admin/erasto-league/teams(/:id), /players(/:id) — cadastro (admin-only)
// - overlay    -> /ext/erasto-league/overlay    (fonte de navegador do OBS, sem shell — mesmo
//                 motivo de sempre: precisa de fundo transparente pro OBS)
// - control    -> /ext/erasto-league/control    (celular, gate por login/permissão de admin)
// - tv         -> /ext/erasto-league/tv         (view pra TV/projetor com as tabelas)
// - perfis     -> /erasto-league/teams/:slug, /players/:slug — DENTRO da shell/tema do host
//                 (rota "public", casada pelo catch-all do CMS — não mais /ext/, que tirava a
//                 shell). Lista de todos os times não é mais uma rota fixa: virou o bloco
//                 "erasto-league.teams" pro CMS (blocks/teams-block.tsx), o admin decide em que
//                 página ele aparece. Por isso /erasto-league/teams (sem slug) e /erasto-league
//                 sozinho dão 404 hoje — não há nenhuma "page" de CMS cadastrada nesses slugs, e
//                 não é bug de roteamento (confirmado em resolve-public-route.ts do venore-docks:
//                 sem colisão de padrão, cai no catch-all normal do CMS). Cabe ao admin criar essas
//                 páginas se quiser um índice fixo ali.
// - jogo       -> /erasto-league/jogos/:id      (súmula pública + transmissão, ver
//                 routes/match-public) — linkada pelos widgets de resultado (últimos resultados,
//                 agenda, fases de grupos) quando o confronto já tem partida vinculada.
// - resultados -> /erasto-league/resultados     ("Ver mais" do bloco erasto-league.recent-results)
// - votação    -> /erasto-league/votar          (hub da votação da torcida — destino do QR; ver
//                 routes/vote-public), /votar/jogo/:id (Jogador da Torcida de um jogo),
//                 /votar/time-favorito (Time favorito da temporada). Admin em
//                 /admin/erasto-league/votes (auditoria + abrir/fechar).
// - QR no OBS  -> /ext/erasto-league/vote-overlay (fonte SEPARADA do placar, ligada/desligada pelo
//                 operador do OBS — routes/vote-overlay)
// - TV votação -> /ext/erasto-league/vote-tv    (parcial pra TV/projetor — routes/vote-tv)
// - eventos    -> /api/erasto-league/events     (SSE)
// - estado     -> /api/erasto-league/state      (snapshot JSON — fallback do SSE)
// - capa       -> /api/erasto-league/matches/:id/cover (capa 1280×720 do jogo, gerada da foto da
//                 súmula — routes/api/match-cover)
export const erastoLeagueRouteTable: PluginRouteTable = {
  admin: [
    { pattern: "", Component: asPluginPage(AdminPage) },
    { pattern: "teams", Component: asPluginPage(TeamsAdminPage) },
    { pattern: "teams/:id", Component: asPluginPage(TeamDetailPage) },
    { pattern: "players", Component: asPluginPage(PlayersAdminPage) },
    { pattern: "players/:id", Component: asPluginPage(PlayerDetailPage) },
    { pattern: "matches", Component: asPluginPage(MatchesAdminPage) },
    { pattern: "matches/:id", Component: asPluginPage(MatchDetailPage) },
    { pattern: "fixtures", Component: asPluginPage(FixturesAdminPage) },
    { pattern: "fixtures/:id", Component: asPluginPage(FixtureDetailPage) },
    { pattern: "power-boosts", Component: asPluginPage(PowerBoostsAdminPage) },
    { pattern: "import", Component: asPluginPage(ImportAdminPage) },
    { pattern: "votes", Component: asPluginPage(VotesAdminPage) },
  ],
  public: [
    { pattern: "erasto-league/teams/:slug", Component: asPluginPage(TeamProfilePage) },
    { pattern: "erasto-league/players/:slug", Component: asPluginPage(PlayerProfilePage) },
    { pattern: "erasto-league/jogos/:id", Component: asPluginPage(MatchPublicPage) },
    { pattern: "erasto-league/artilharia", Component: asPluginPage(ArtilleryPage) },
    { pattern: "erasto-league/mvps", Component: asPluginPage(MvpPage) },
    { pattern: "erasto-league/resultados", Component: asPluginPage(ResultsPage) },
    { pattern: "erasto-league/votar", Component: asPluginPage(VoteHubPage) },
    { pattern: "erasto-league/votar/time-favorito", Component: asPluginPage(FavoriteTeamVotePage) },
    { pattern: "erasto-league/votar/jogo/:id", Component: asPluginPage(MatchVotePage) },
  ],
  standalone: [
    { pattern: "erasto-league/overlay", Component: asPluginPage(OverlayPage) },
    { pattern: "erasto-league/control", Component: asPluginPage(ControlPage) },
    { pattern: "erasto-league/tv", Component: asPluginPage(TvPage) },
    { pattern: "erasto-league/vote-overlay", Component: asPluginPage(VoteOverlayPage) },
    { pattern: "erasto-league/vote-tv", Component: asPluginPage(VoteTvPage) },
  ],
  api: [
    { pattern: "events", handlers: { GET: asPluginApiHandler(eventsGET) } },
    { pattern: "state", handlers: { GET: asPluginApiHandler(stateGET) } },
    { pattern: "matches/:id/cover", handlers: { GET: asPluginApiHandler(matchCoverGET) } },
  ],
};
