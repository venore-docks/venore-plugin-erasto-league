import type { BlockRendererComponent } from "@venore/plugin-sdk";
import { ErastoLeagueHeroBlock } from "./hero-block";
import { ErastoLeagueStandingsBlock } from "./standings-block";
import { ErastoLeagueRecentResultsBlock } from "./recent-results-block";
import { ErastoLeagueTopScorersBlock } from "./top-scorers-block";
import { ErastoLeagueTeamSpotlightBlock } from "./team-spotlight-block";
import { ErastoLeagueBracketBlock } from "./bracket-block";
import { ErastoLeagueScheduleBlock } from "./schedule-block";

export const blockRenderers: Record<string, BlockRendererComponent> = {
  "erasto-league.hero": ErastoLeagueHeroBlock,
  "erasto-league.standings": ErastoLeagueStandingsBlock,
  "erasto-league.recent-results": ErastoLeagueRecentResultsBlock,
  "erasto-league.top-scorers": ErastoLeagueTopScorersBlock,
  "erasto-league.team-spotlight": ErastoLeagueTeamSpotlightBlock,
  "erasto-league.bracket": ErastoLeagueBracketBlock,
  "erasto-league.schedule": ErastoLeagueScheduleBlock,
};
