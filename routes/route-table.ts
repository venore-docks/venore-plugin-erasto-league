import { asPluginApiHandler, asPluginPage, type PluginRouteTable } from "@venore/plugin-sdk";
import OverlayPage from "./overlay/page";
import ControlPage from "./control/page";
import { GET as eventsGET } from "./api/events/route";

// As duas telas fogem por completo da shell do (platform) — área `standalone`, casada pelo
// dispatcher genérico src/app/ext/[...slug]/ do core. O pattern é o caminho DEPOIS de /ext/ (mesmo
// vocabulário de `public`), então precisa incluir o próprio prefixo do plugin.
//   overlay  -> /ext/erasto-league/overlay   (fonte de navegador do OBS)
//   control  -> /ext/erasto-league/control   (celular)
//   eventos  -> /api/erasto-league/events    (SSE; prefixo /api/<key> vem do dispatcher)
export const erastoLeagueRouteTable: PluginRouteTable = {
  standalone: [
    { pattern: "erasto-league/overlay", Component: asPluginPage(OverlayPage) },
    { pattern: "erasto-league/control", Component: asPluginPage(ControlPage) },
  ],
  api: [{ pattern: "events", handlers: { GET: asPluginApiHandler(eventsGET) } }],
};
