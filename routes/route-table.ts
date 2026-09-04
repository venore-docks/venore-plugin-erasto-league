import { asPluginApiHandler, asPluginPage, type PluginRouteTable } from "@venore/plugin-sdk";
import AdminPage from "./admin/page";
import OverlayPage from "./overlay/page";
import ControlPage from "./control/page";
import { GET as eventsGET } from "./api/events/route";
import { GET as stateGET } from "./api/state/route";

// - admin      -> /admin/erasto-league          (config + atalhos; link vem do manifest.navigation)
// - overlay    -> /ext/erasto-league/overlay    (fonte de navegador do OBS)
// - control    -> /ext/erasto-league/control    (celular, gate por PIN)
// - eventos    -> /api/erasto-league/events     (SSE)
// - estado     -> /api/erasto-league/state      (snapshot JSON — fallback do SSE)
export const erastoLeagueRouteTable: PluginRouteTable = {
  admin: [{ pattern: "", Component: asPluginPage(AdminPage) }],
  standalone: [
    { pattern: "erasto-league/overlay", Component: asPluginPage(OverlayPage) },
    { pattern: "erasto-league/control", Component: asPluginPage(ControlPage) },
  ],
  api: [
    { pattern: "events", handlers: { GET: asPluginApiHandler(eventsGET) } },
    { pattern: "state", handlers: { GET: asPluginApiHandler(stateGET) } },
  ],
};
