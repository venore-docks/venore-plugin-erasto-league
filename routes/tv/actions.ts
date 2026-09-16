"use server";

import { getBracketView, type BracketView } from "../../runtime/bracket";
import { computeStandings } from "../../runtime/standings";
import type { TeamStanding } from "../../contracts/types";

export type TvData = { bracket: BracketView; standings: TeamStanding[] };

// Poll simples (sem SSE) — a tabela só muda quando uma partida encerra ou o campeonato importa
// fixtures novas, bem mais raro que o placar ao vivo. Sem PIN/sessão: mesma filosofia do overlay
// (tela pra TV/projetor, não escreve nada).
export async function getTvDataAction(): Promise<TvData> {
  const [bracket, standings] = await Promise.all([getBracketView(), computeStandings()]);
  return { bracket, standings };
}
