import { sql } from "drizzle-orm";
import { db } from "@venore/plugin-sdk";
import { favoriteTeamVotes as favoriteTeamVotesTable, fixtures as fixturesTable, matches as matchesTable } from "../database/schema";

// Fingerprint barato pra TV saber se precisa recalcular chaveamento/classificação/artilheiros/time
// da torcida (getTvDataAction, bem mais caro) — três eventos de fato mexem nessas telas: uma partida
// encerrar (matches.finished_at), o campeonato importar/reordenar fixtures (fixtures.updated_at), ou
// um voto novo/trocado de time favorito (favorite_team_votes.updated_at). Três MAX() indexados em
// vez do Promise.all inteiro — é essa diferença de custo que faz dar pra pollar isto com frequência e
// o resto só quando muda (ver routes/tv/tv-canvas.tsx).
export async function getTvDataVersion(): Promise<number> {
  const [[matchRow], [fixtureRow], [favoriteRow]] = await Promise.all([
    db.select({ at: sql<string | null>`max(${matchesTable.finishedAt})` }).from(matchesTable),
    db.select({ at: sql<string | null>`max(${fixturesTable.updatedAt})` }).from(fixturesTable),
    db.select({ at: sql<string | null>`max(${favoriteTeamVotesTable.updatedAt})` }).from(favoriteTeamVotesTable),
  ]);

  const matchAt = matchRow?.at ? new Date(matchRow.at).getTime() : 0;
  const fixtureAt = fixtureRow?.at ? new Date(fixtureRow.at).getTime() : 0;
  const favoriteAt = favoriteRow?.at ? new Date(favoriteRow.at).getTime() : 0;
  return Math.max(matchAt, fixtureAt, favoriteAt);
}
