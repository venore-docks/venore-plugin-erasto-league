import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { Button } from "@venore/plugin-sdk/ui";
import { listFanVoteRanking } from "../runtime/fan-votes";
import { readFanVoteWindowHours } from "../shared/config";
import { rankPositions } from "../shared/ranking";
import { ScorerRow } from "./scorer-row";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

// Mesma regra de "ver mais" dos MVPs (blocks/mvp-scorers-block.tsx) — 5 primeiros aqui, lista cheia
// em /erasto-league/jogador-da-torcida (routes/fan-vote-ranking-public).
const VISIBLE_LIMIT = 5;

export async function ErastoLeagueFanVoteRankingBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Jogador da Torcida");
  const limit = readNumber(block.data, "limit", 10);
  const ranking = await listFanVoteRanking(await readFanVoteWindowHours(), limit);
  const visible = ranking.slice(0, VISIBLE_LIMIT);
  const positions = rankPositions(visible.map((entry) => entry.wins));

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {ranking.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma votação encerrada ainda.</p>
      ) : (
        <>
          <ol className="space-y-2">
            {visible.map((entry, index) => (
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

          {ranking.length > VISIBLE_LIMIT && (
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/erasto-league/jogador-da-torcida">Ver mais</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
