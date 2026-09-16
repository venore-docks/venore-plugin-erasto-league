import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { listTopScorers } from "../runtime/stats";
import { formatScore } from "../shared/score";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

const RANK_MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

// Artilharia ao vivo — sempre recalculada na hora de renderizar (runtime/stats.ts).
export async function ErastoLeagueTopScorersBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Artilharia");
  const limit = readNumber(block.data, "limit", 10);
  const scorers = await listTopScorers(limit);

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {scorers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum gol registrado ainda.</p>
      ) : (
        <ol className="divide-y divide-border rounded-panel border border-border bg-card">
          {scorers.map((scorer, index) => (
            <li key={scorer.playerId} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                {RANK_MEDAL[index] ?? index + 1}
              </span>
              {scorer.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={scorer.photoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                  {scorer.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/ext/erasto-league/players/${scorer.slug}`} className="block truncate text-sm font-medium text-foreground hover:underline">
                  {scorer.name}
                </Link>
                <Link href={`/ext/erasto-league/teams/${scorer.teamSlug}`} className="block truncate text-xs text-muted-foreground hover:underline">
                  {scorer.teamName}
                </Link>
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">{formatScore(scorer.goals)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
