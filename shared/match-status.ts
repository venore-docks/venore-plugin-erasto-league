import type { MatchStatus } from "../contracts/types";

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  in_progress: "Em andamento",
  finished: "Encerrada",
  cancelled: "Cancelada",
};

// Variant do <Badge> de @venore/plugin-sdk/ui pra cada status — "destructive" em in_progress não é
// erro, é só o vermelho/pulso que a Badge shadcn já usa pra chamar atenção (mesmo uso de "ao vivo"
// em routes/admin/page.tsx).
export const MATCH_STATUS_BADGE_VARIANT: Record<MatchStatus, "destructive" | "secondary" | "outline"> = {
  in_progress: "destructive",
  finished: "secondary",
  cancelled: "outline",
};
