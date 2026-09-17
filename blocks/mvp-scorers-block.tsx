import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { Button } from "@venore/plugin-sdk/ui";
import { listTopMvps } from "../runtime/stats";
import { ScorerRow } from "./scorer-row";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

// Mesma regra de "ver mais" da artilharia (blocks/top-scorers-block.tsx) — 5 primeiros aqui, lista
// cheia em /erasto-league/mvps (routes/mvp-public).
const VISIBLE_LIMIT = 5;

// Ranking de MVPs — sempre recalculado na hora de renderizar (runtime/stats.ts::listTopMvps).
export async function ErastoLeagueMvpScorersBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "MVPs");
  const limit = readNumber(block.data, "limit", 10);
  const mvps = await listTopMvps(limit);
  const visible = mvps.slice(0, VISIBLE_LIMIT);

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {mvps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum MVP escolhido ainda.</p>
      ) : (
        <>
          <ol className="space-y-2">
            {visible.map((mvp, index) => (
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

          {mvps.length > VISIBLE_LIMIT && (
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/erasto-league/mvps">Ver mais</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
