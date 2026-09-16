import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getBrandConfig } from "@venore/plugin-sdk/brand";
import { getBracketView, getNextFixture } from "../../runtime/bracket";
import { computeStandings } from "../../runtime/standings";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { TvCanvas } from "./tv-canvas";

export const dynamic = "force-dynamic";

// View pra TV/projetor com as tabelas do campeonato (ad do próximo jogo + classificação por grupo
// ou geral + chaveamento de eliminatórias) — mesma técnica de palco escalável de
// venore-plugin-scoreboard, ver shared/tv-stage.ts. Rota standalone (fora de (platform)), sem
// PIN/sessão: mesma filosofia do overlay (só leitura, feita pra abrir em tela cheia numa TV do evento).
export default async function TvPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const [bracket, standings, nextGame, config, brand] = await Promise.all([
    getBracketView(),
    computeStandings(),
    getNextFixture(),
    resolveErastoLeagueConfig(),
    getBrandConfig("png"),
  ]);

  return (
    <TvCanvas
      initialData={{ bracket, standings, nextGame }}
      accentColor={config.accentColor}
      brandLogoUrl={brand.logoUrl || null}
    />
  );
}
