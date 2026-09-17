import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { Button } from "@venore/plugin-sdk/ui";
import { listTopScorers } from "../runtime/stats";
import { formatScore } from "../shared/score";
import { ScorerRow } from "./scorer-row";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

// Quantos aparecem no bloco antes do "Ver mais" — a lista completa mora em /erasto-league/artilharia
// (routes/artillery-public), pra não lotar a composição da página com dezenas de jogadores.
const VISIBLE_LIMIT = 5;

// Artilharia ao vivo — sempre recalculada na hora de renderizar (runtime/stats.ts).
export async function ErastoLeagueTopScorersBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Artilharia");
  const limit = readNumber(block.data, "limit", 10);
  const scorers = await listTopScorers(limit);
  const visible = scorers.slice(0, VISIBLE_LIMIT);

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {scorers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum gol registrado ainda.</p>
      ) : (
        <>
          <ol className="space-y-2">
            {visible.map((scorer, index) => (
              <ScorerRow
                key={scorer.playerId}
                rank={index}
                name={scorer.name}
                slug={scorer.slug}
                photoUrl={scorer.photoUrl}
                teamName={scorer.teamName}
                teamSlug={scorer.teamSlug}
                value={formatScore(scorer.goals)}
              />
            ))}
          </ol>

          {scorers.length > VISIBLE_LIMIT && (
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/erasto-league/artilharia">Ver mais</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
