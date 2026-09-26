import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { listFanVoteRanking } from "../../runtime/fan-votes";
import { readFanVoteWindowHours } from "../../shared/config";
import { FanVoteRankingView } from "./fan-vote-ranking-view";

// Ranking completo do Jogador da Torcida (/erasto-league/jogador-da-torcida) — sem limite,
// complementa o bloco erasto-league.fan-vote-ranking (5 primeiros + "Ver mais" pra cá). Mesmo
// princípio de routes/mvp-public.
export default async function FanVoteRankingPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const ranking = await listFanVoteRanking(await readFanVoteWindowHours());

  return <FanVoteRankingView ranking={ranking} />;
}
