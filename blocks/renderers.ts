import type { BlockRendererComponent } from "@venore/plugin-sdk";
import { ErastoLeagueHeroBlock } from "./hero-block";
import { ErastoLeagueStandingsBlock } from "./standings-block";
import { ErastoLeagueRecentResultsBlock } from "./recent-results-block";

export const blockRenderers: Record<string, BlockRendererComponent> = {
  "erasto-league.hero": ErastoLeagueHeroBlock,
  "erasto-league.standings": ErastoLeagueStandingsBlock,
  "erasto-league.recent-results": ErastoLeagueRecentResultsBlock,
};
