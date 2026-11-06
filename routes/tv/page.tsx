import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getBrandConfig } from "@venore/plugin-sdk/brand";
import { getBracketView, getNextFixture } from "../../runtime/bracket";
import { getFavoriteTeamResults, getFinalMatchPoll, getMatchWinnerVoteResults, type FanVoteResults } from "../../runtime/fan-votes";
import { computeStandings } from "../../runtime/standings";
import { listTopScorers } from "../../runtime/stats";
import { getTvDataVersion } from "../../runtime/tv-version";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { TvCanvas } from "./tv-canvas";

export const dynamic = "force-dynamic";

// Mesmo teto de routes/tv/actions.ts getTvDataAction (duplicado, não importado: aquele arquivo é
// "use server" e só pode exportar funções async).
const TV_SCORERS_LIMIT = 10;
const TV_FAVORITE_TEAM_LIMIT = 5;

const EMPTY_FAN_VOTE_RESULTS: FanVoteResults = { totalVotes: 0, entries: [], leaders: [] };

// Mesma lógica de routes/tv/actions.ts getFinalWinnerResultsForTv (duplicada pelo mesmo motivo do
// comentário acima).
async function getFinalWinnerResultsForTv(windowHours: number): Promise<FanVoteResults> {
  const poll = await getFinalMatchPoll(windowHours);
  if (!poll) return EMPTY_FAN_VOTE_RESULTS;
  return getMatchWinnerVoteResults(poll.match.id, TV_FAVORITE_TEAM_LIMIT);
}

// View pra TV/projetor com as tabelas do campeonato (ad do próximo jogo + classificação por grupo
// ou geral + artilheiros + chaveamento de eliminatórias) — mesma técnica de palco escalável de
// venore-plugin-scoreboard, ver shared/tv-stage.ts. Rota standalone (fora de (platform)), sem
// PIN/sessão: mesma filosofia do overlay (só leitura, feita pra abrir em tela cheia numa TV do evento).
export default async function TvPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const config = await resolveErastoLeagueConfig();
  const [bracket, standings, nextGame, scorers, favoriteTeam, finalWinner, brand, version] = await Promise.all([
    getBracketView(),
    computeStandings(),
    getNextFixture(),
    listTopScorers(TV_SCORERS_LIMIT),
    getFavoriteTeamResults(TV_FAVORITE_TEAM_LIMIT),
    getFinalWinnerResultsForTv(config.fanVoteWindowHours),
    getBrandConfig("png"),
    getTvDataVersion(),
  ]);

  return (
    <TvCanvas
      initialData={{
        bracket,
        standings,
        nextGame,
        scorers,
        favoriteTeam,
        finalWinner,
        options: { groupStageClosed: config.groupStageClosed, visibility: config.tvPageVisibility },
      }}
      initialVersion={version}
      accentColor={config.accentColor}
      brandLogoUrl={brand.logoUrl || null}
    />
  );
}
