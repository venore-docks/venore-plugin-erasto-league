import type { BlockRendererComponent } from "@venore/plugin-sdk";
import { ErastoLeagueHeroBlock } from "./hero-block";
import { ErastoLeagueStandingsBlock } from "./standings-block";
import { ErastoLeagueRecentResultsBlock } from "./recent-results-block";
import { ErastoLeagueTopScorersBlock } from "./top-scorers-block";
import { ErastoLeagueMvpScorersBlock } from "./mvp-scorers-block";
import { ErastoLeagueTeamSpotlightBlock } from "./team-spotlight-block";
import { ErastoLeagueTeamsBlock } from "./teams-block";
import { ErastoLeaguePlayersBlock } from "./players-block";
import { ErastoLeagueBracketBlock } from "./bracket-block";
import { ErastoLeagueScheduleBlock } from "./schedule-block";
import { ErastoLeagueNextGameAdBlock } from "./next-game-ad-block";
import { ErastoLeagueBroadcastBlock } from "./broadcast-block";

export const blockRenderers: Record<string, BlockRendererComponent> = {
  "erasto-league.hero": ErastoLeagueHeroBlock,
  "erasto-league.standings": ErastoLeagueStandingsBlock,
  "erasto-league.recent-results": ErastoLeagueRecentResultsBlock,
  "erasto-league.top-scorers": ErastoLeagueTopScorersBlock,
  "erasto-league.mvp-scorers": ErastoLeagueMvpScorersBlock,
  "erasto-league.team-spotlight": ErastoLeagueTeamSpotlightBlock,
  "erasto-league.teams": ErastoLeagueTeamsBlock,
  "erasto-league.players": ErastoLeaguePlayersBlock,
  "erasto-league.bracket": ErastoLeagueBracketBlock,
  "erasto-league.schedule": ErastoLeagueScheduleBlock,
  "erasto-league.next-game-ad": ErastoLeagueNextGameAdBlock,
  "erasto-league.broadcast": ErastoLeagueBroadcastBlock,
};
