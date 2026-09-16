import type { BlockDefinition } from "@venore/plugin-sdk/cms";
import { erastoLeagueHeroBlockDefinition } from "./hero";
import { erastoLeagueStandingsBlockDefinition } from "./standings";
import { erastoLeagueRecentResultsBlockDefinition } from "./recent-results";
import { erastoLeagueTopScorersBlockDefinition } from "./top-scorers";
import { erastoLeagueTeamSpotlightBlockDefinition } from "./team-spotlight";
import { erastoLeagueBracketBlockDefinition } from "./bracket";
import { erastoLeagueScheduleBlockDefinition } from "./schedule";

export const blockDefinitions: BlockDefinition[] = [
  erastoLeagueHeroBlockDefinition,
  erastoLeagueStandingsBlockDefinition,
  erastoLeagueRecentResultsBlockDefinition,
  erastoLeagueTopScorersBlockDefinition,
  erastoLeagueTeamSpotlightBlockDefinition,
  erastoLeagueBracketBlockDefinition,
  erastoLeagueScheduleBlockDefinition,
];
