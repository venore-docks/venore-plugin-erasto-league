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

// Silhueta genérica — usada quando o jogador não tem foto cadastrada ainda, em vez de iniciais
// (pedido explícito: "avatar placeholder", não texto).
function PlayerAvatarPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6 text-muted-foreground/70">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
    </svg>
  );
}

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
        <ol className="space-y-2">
          {scorers.map((scorer, index) => (
            <li
              key={scorer.playerId}
              className={`flex items-center gap-3 rounded-panel border bg-card px-4 py-3 shadow-sm transition hover:border-primary/40 ${
                index < 3 ? "border-primary/30" : "border-border"
              }`}
            >
              <span className="w-7 shrink-0 text-center text-lg" aria-hidden="true">
                {RANK_MEDAL[index] ?? <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>}
              </span>
              {scorer.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={scorer.photoUrl} alt="" className="size-11 shrink-0 rounded-full border border-border/60 object-cover shadow-sm" />
              ) : (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
                  <PlayerAvatarPlaceholder />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/ext/erasto-league/players/${scorer.slug}`} className="block truncate text-sm font-semibold text-foreground hover:underline">
                  {scorer.name}
                </Link>
                <Link href={`/ext/erasto-league/teams/${scorer.teamSlug}`} className="block truncate text-xs text-muted-foreground hover:underline">
                  {scorer.teamName}
                </Link>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-lg font-bold tabular-nums text-primary">
                {formatScore(scorer.goals)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
