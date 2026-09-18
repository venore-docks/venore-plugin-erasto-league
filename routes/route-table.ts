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
import OverlayPage from "./overlay/page";
import ControlPage from "./control/page";
import TvPage from "./tv/page";
import TeamProfilePage from "./teams-public/page";
import PlayerProfilePage from "./players-public/page";
import ArtilleryPage from "./artillery-public/page";
import MvpPage from "./mvp-public/page";
import ResultsPage from "./results-public/page";
import { GET as eventsGET } from "./api/events/route";
import { GET as stateGET } from "./api/state/route";

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
// - resultados -> /erasto-league/resultados     ("Ver mais" do bloco erasto-league.recent-results)
// - eventos    -> /api/erasto-league/events     (SSE)
// - estado     -> /api/erasto-league/state      (snapshot JSON — fallback do SSE)
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
  ],
  public: [
    { pattern: "erasto-league/teams/:slug", Component: asPluginPage(TeamProfilePage) },
    { pattern: "erasto-league/players/:slug", Component: asPluginPage(PlayerProfilePage) },
    { pattern: "erasto-league/artilharia", Component: asPluginPage(ArtilleryPage) },
    { pattern: "erasto-league/mvps", Component: asPluginPage(MvpPage) },
    { pattern: "erasto-league/resultados", Component: asPluginPage(ResultsPage) },
  ],
  standalone: [
    { pattern: "erasto-league/overlay", Component: asPluginPage(OverlayPage) },
    { pattern: "erasto-league/control", Component: asPluginPage(ControlPage) },
    { pattern: "erasto-league/tv", Component: asPluginPage(TvPage) },
  ],
  api: [
    { pattern: "events", handlers: { GET: asPluginApiHandler(eventsGET) } },
    { pattern: "state", handlers: { GET: asPluginApiHandler(stateGET) } },
  ],
};
