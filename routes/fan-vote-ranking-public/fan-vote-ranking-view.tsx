import Link from "next/link";
import type { FanVoteRankingEntry } from "../../runtime/fan-votes";
import { rankPositions } from "../../shared/ranking";
import { ScorerRow } from "../../blocks/scorer-row";

// Página cheia do ranking do Jogador da Torcida — mesma linha de ranking do bloco
// (blocks/scorer-row.tsx), sem limite. DENTRO da shell/tema do host (só tokens shadcn), mesmo
// princípio de routes/mvp-public/mvp-view.tsx.
export function FanVoteRankingView({ ranking }: { ranking: FanVoteRankingEntry[] }) {
  const positions = rankPositions(ranking.map((entry) => entry.wins));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Jogador da Torcida</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Quantas vezes cada jogador foi o mais votado pela torcida depois de encerrada a votação do jogo. Empate no topo conta para
          todos os empatados.{" "}
          <Link href="/erasto-league/votar" className="font-semibold text-primary hover:underline">
            Votar agora →
          </Link>
        </p>
      </div>

      {ranking.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma votação encerrada ainda.</p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((entry, index) => (
            <ScorerRow
              key={entry.playerId}
              rank={positions[index] - 1}
              name={entry.name}
              slug={entry.slug}
              photoUrl={entry.photoUrl}
              teamName={entry.teamName}
              teamSlug={entry.teamSlug}
              value={String(entry.wins)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
