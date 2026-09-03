import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatchState } from "../../runtime/match-bus";
import { Scoreboard } from "./scoreboard";

// Overlay pro OBS: rota standalone (fora de (platform), sem header/nav/footer). Fundo transparente
// — o Scoreboard injeta o CSS global que zera o background do <html>/<body> pra a fonte de
// navegador do OBS "chromakey" o resto.
export default async function OverlayPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }
  return <Scoreboard initialState={getMatchState()} />;
}
