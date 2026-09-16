import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getBracketView } from "../../runtime/bracket";
import { computeStandings } from "../../runtime/standings";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { TvCanvas } from "./tv-canvas";

export const dynamic = "force-dynamic";

// View pra TV/projetor com as tabelas do campeonato (classificação por grupo ou geral, + chaveamento
// de eliminatórias) — mesma técnica de palco escalável de venore-plugin-scoreboard, ver
// shared/tv-stage.ts. Rota standalone (fora de (platform)), sem PIN/sessão: mesma filosofia do
// overlay (só leitura, feita pra abrir em tela cheia numa TV/projetor do evento).
export default async function TvPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const [bracket, standings, config] = await Promise.all([getBracketView(), computeStandings(), resolveErastoLeagueConfig()]);

  return <TvCanvas initialData={{ bracket, standings }} accentColor={config.accentColor} />;
}
