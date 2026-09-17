import type { MvpEntry } from "../../runtime/stats";
import { ScorerRow } from "../../blocks/scorer-row";

// Página cheia de MVPs — mesma linha de ranking do bloco (blocks/scorer-row.tsx), só sem limite e
// sem botão "Ver mais". DENTRO da shell/tema do host (só tokens shadcn), mesmo princípio de
// routes/artillery-public/artillery-view.tsx.
export function MvpView({ mvps }: { mvps: MvpEntry[] }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">MVPs</h1>
      </div>

      {mvps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum MVP escolhido ainda.</p>
      ) : (
        <ol className="space-y-2">
          {mvps.map((mvp, index) => (
            <ScorerRow
              key={mvp.playerId}
              rank={index}
              name={mvp.name}
              slug={mvp.slug}
              photoUrl={mvp.photoUrl}
              teamName={mvp.teamName}
              teamSlug={mvp.teamSlug}
              value={String(mvp.mvpCount)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
