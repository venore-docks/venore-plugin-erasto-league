import type { ScorerEntry } from "../../runtime/stats";
import { formatScore } from "../../shared/score";
import { ScorerRow } from "../../blocks/scorer-row";

// Página cheia da artilharia — mesma linha de ranking do bloco (blocks/scorer-row.tsx), só sem
// limite e sem botão "Ver mais". DENTRO da shell/tema do host (só tokens shadcn), mesmo princípio
// de team-profile-view.tsx/player-profile-view.tsx.
export function ArtilleryView({ scorers }: { scorers: ScorerEntry[] }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Artilharia</h1>
      </div>

      {scorers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum gol registrado ainda.</p>
      ) : (
        <ol className="space-y-2">
          {scorers.map((scorer, index) => (
            <ScorerRow
              key={scorer.playerId}
              rank={index}
              name={scorer.name}
              slug={scorer.slug}
              photoUrl={scorer.photoUrl}
              teamName={scorer.teamName}
              teamSlug={scorer.teamSlug}
              value={formatScore(scorer.goals)}
              unit={scorer.goals === 1 ? "gol" : "gols"}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
