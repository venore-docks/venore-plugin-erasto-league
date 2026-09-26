import type { BlockDefinition } from "@venore/plugin-sdk/cms";
import { erastoLeagueHeroBlockDefinition } from "./hero";
import { erastoLeagueStandingsBlockDefinition } from "./standings";
import { erastoLeagueRecentResultsBlockDefinition } from "./recent-results";
import { erastoLeagueTopScorersBlockDefinition } from "./top-scorers";
import { erastoLeagueMvpScorersBlockDefinition } from "./mvp-scorers";
import { erastoLeagueTeamSpotlightBlockDefinition } from "./team-spotlight";
import { erastoLeagueTeamsBlockDefinition } from "./teams";
import { erastoLeaguePlayersBlockDefinition } from "./players";
import { erastoLeagueBracketBlockDefinition } from "./bracket";
import { erastoLeagueScheduleBlockDefinition } from "./schedule";
import { erastoLeagueNextGameAdBlockDefinition } from "./next-game-ad";
import { erastoLeagueBroadcastBlockDefinition } from "./broadcast";
import { erastoLeagueFanVotesBlockDefinition } from "./fan-votes";
import { erastoLeagueMatchesGalleryBlockDefinition } from "./matches-gallery";

export const blockDefinitions: BlockDefinition[] = [
  erastoLeagueHeroBlockDefinition,
  erastoLeagueStandingsBlockDefinition,
  erastoLeagueRecentResultsBlockDefinition,
  erastoLeagueTopScorersBlockDefinition,
  erastoLeagueMvpScorersBlockDefinition,
  erastoLeagueTeamSpotlightBlockDefinition,
  erastoLeagueTeamsBlockDefinition,
  erastoLeaguePlayersBlockDefinition,
  erastoLeagueBracketBlockDefinition,
  erastoLeagueScheduleBlockDefinition,
  erastoLeagueNextGameAdBlockDefinition,
  erastoLeagueBroadcastBlockDefinition,
  erastoLeagueFanVotesBlockDefinition,
  erastoLeagueMatchesGalleryBlockDefinition,
];
