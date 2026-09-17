import type { BlockDefinition } from "@venore/plugin-sdk/cms";
import { erastoLeagueHeroBlockDefinition } from "./hero";
import { erastoLeagueStandingsBlockDefinition } from "./standings";
import { erastoLeagueRecentResultsBlockDefinition } from "./recent-results";
import { erastoLeagueTopScorersBlockDefinition } from "./top-scorers";
import { erastoLeagueTeamSpotlightBlockDefinition } from "./team-spotlight";
import { erastoLeagueTeamsBlockDefinition } from "./teams";
import { erastoLeagueBracketBlockDefinition } from "./bracket";
import { erastoLeagueScheduleBlockDefinition } from "./schedule";
import { erastoLeagueNextGameAdBlockDefinition } from "./next-game-ad";

export const blockDefinitions: BlockDefinition[] = [
  erastoLeagueHeroBlockDefinition,
  erastoLeagueStandingsBlockDefinition,
  erastoLeagueRecentResultsBlockDefinition,
  erastoLeagueTopScorersBlockDefinition,
  erastoLeagueTeamSpotlightBlockDefinition,
  erastoLeagueTeamsBlockDefinition,
  erastoLeagueBracketBlockDefinition,
  erastoLeagueScheduleBlockDefinition,
  erastoLeagueNextGameAdBlockDefinition,
];
