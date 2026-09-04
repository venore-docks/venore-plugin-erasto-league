import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatchState } from "../../runtime/match-actions";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { Scoreboard } from "./scoreboard";

// Overlay pro OBS: rota standalone (fora de (platform), sem header/nav/footer). Fundo transparente
// — o Scoreboard injeta o CSS global que zera o background do <html>/<body> pra a fonte de
// navegador do OBS "chromakey" o resto.
export default async function OverlayPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const [initialState, config] = await Promise.all([getMatchState(), resolveErastoLeagueConfig()]);

  return (
    <Scoreboard
      initialState={initialState}
      accentColor={config.accentColor}
      logoUrl={config.logoUrl}
    />
  );
}
