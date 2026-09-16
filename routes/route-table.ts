import { asPluginApiHandler, asPluginPage, type PluginRouteTable } from "@venore/plugin-sdk";
import AdminPage from "./admin/page";
import TeamsAdminPage from "./admin/teams/page";
import TeamDetailPage from "./admin/teams/team-page";
import PlayersAdminPage from "./admin/players/page";
import PlayerDetailPage from "./admin/players/player-page";
import MatchesAdminPage from "./admin/matches/page";
import MatchDetailPage from "./admin/matches/match-page";
import FixturesAdminPage from "./admin/fixtures/page";
import ImportAdminPage from "./admin/import/page";
import OverlayPage from "./overlay/page";
import ControlPage from "./control/page";
import TvPage from "./tv/page";
import TeamProfilePage from "./teams-public/page";
import PlayerProfilePage from "./players-public/page";
import { GET as eventsGET } from "./api/events/route";
import { GET as stateGET } from "./api/state/route";

// - admin      -> /admin/erasto-league          (config + atalhos; link vem do manifest.navigation)
//                 /admin/erasto-league/teams(/:id), /players(/:id) — cadastro (admin-only)
// - overlay    -> /ext/erasto-league/overlay    (fonte de navegador do OBS)
// - control    -> /ext/erasto-league/control    (celular, gate por login/permissão de admin)
// - tv         -> /ext/erasto-league/tv         (view pra TV/projetor com as tabelas)
// - perfis     -> /ext/erasto-league/teams/:slug, /players/:slug (público, só leitura)
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
    { pattern: "import", Component: asPluginPage(ImportAdminPage) },
  ],
  standalone: [
    { pattern: "erasto-league/overlay", Component: asPluginPage(OverlayPage) },
    { pattern: "erasto-league/control", Component: asPluginPage(ControlPage) },
    { pattern: "erasto-league/tv", Component: asPluginPage(TvPage) },
    { pattern: "erasto-league/teams/:slug", Component: asPluginPage(TeamProfilePage) },
    { pattern: "erasto-league/players/:slug", Component: asPluginPage(PlayerProfilePage) },
  ],
  api: [
    { pattern: "events", handlers: { GET: asPluginApiHandler(eventsGET) } },
    { pattern: "state", handlers: { GET: asPluginApiHandler(stateGET) } },
  ],
};
