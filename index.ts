// Barrel público do plugin. O estado da partida é persistido (erasto_league.match_state) e só o
// próprio plugin fala com ele — nenhum outro context consome nada daqui hoje, então o barrel
// exporta só os tipos e as constantes de settings (úteis pra quem quiser inspecionar as chaves).
export type { MatchState, Team, MatchSide, MatchClock, ClockCommand } from "./contracts/types";
export { ERASTO_LEAGUE_SETTINGS } from "./shared/settings";
export type { ErastoLeagueConfig, ErastoLeagueSettingField } from "./shared/settings";
