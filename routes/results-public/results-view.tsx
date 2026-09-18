import type { MatchSummary, TeamProfile } from "../../contracts/types";
import { MatchResultCard } from "../../blocks/match-result-card";

// Página cheia de resultados — mesmo cartão do bloco (blocks/match-result-card.tsx), só sem limite
// e sem botão "Ver mais". DENTRO da shell/tema do host (só tokens shadcn), mesmo princípio de
// team-profile-view.tsx/artillery-view.tsx.
export function ResultsView({
  matches,
  teamById,
  mvpNameById,
}: {
  matches: MatchSummary[];
  teamById: Map<string, TeamProfile>;
  mvpNameById: Map<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Resultados</h1>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma partida encerrada ainda.</p>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => (
            <MatchResultCard
              key={match.id}
              match={match}
              home={teamById.get(match.homeTeamId)}
              away={teamById.get(match.awayTeamId)}
              mvpName={match.mvpPlayerId ? (mvpNameById.get(match.mvpPlayerId) ?? null) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
