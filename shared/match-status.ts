import type { MatchStatus } from "../contracts/types";

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  in_progress: "Em andamento",
  finished: "Encerrada",
  cancelled: "Cancelada",
};
