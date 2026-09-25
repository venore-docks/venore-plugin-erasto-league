import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { Badge, Button } from "@venore/plugin-sdk/ui";
import { getFavoriteTeamResults, getFeaturedMatchPoll, getMatchFanVoteResults } from "../runtime/fan-votes";
import { getTeam } from "../runtime/teams";
import { resolveErastoLeagueConfig } from "../shared/config";
import { VoteResultsList } from "./vote-results-list";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value > 0 ? Math.min(20, Math.round(value)) : fallback;
}

async function MatchPollPanel({ windowHours, limit }: { windowHours: number; limit: number }) {
  const poll = await getFeaturedMatchPoll(windowHours);
  if (!poll) {
    return (
      <div className="space-y-2 rounded-panel border border-border bg-card p-4">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">⭐ Jogador da Torcida</p>
        <p className="text-sm text-muted-foreground">A votação abre no apito inicial de cada jogo.</p>
      </div>
    );
  }

  const [homeTeam, awayTeam, results] = await Promise.all([
    getTeam(poll.match.homeTeamId),
    getTeam(poll.match.awayTeamId),
    getMatchFanVoteResults(poll.match.id, limit),
  ]);

  return (
    <div className="space-y-3 rounded-panel border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">⭐ Jogador da Torcida</p>
          <p className="truncate text-base font-bold text-foreground">
            {homeTeam?.name ?? "—"} × {awayTeam?.name ?? "—"}
          </p>
        </div>
        <Badge variant={poll.isOpen ? "default" : "secondary"}>{poll.isOpen ? "Parcial" : "Resultado final"}</Badge>
      </div>
      <VoteResultsList results={results} />
      {poll.isOpen && (
        <Button asChild size="sm">
          <Link href={`/erasto-league/votar/jogo/${poll.match.id}`}>Votar agora</Link>
        </Button>
      )}
    </div>
  );
}

async function FavoriteTeamPanel({ isOpen, limit }: { isOpen: boolean; limit: number }) {
  const results = await getFavoriteTeamResults(limit);
  return (
    <div className="space-y-3 rounded-panel border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">💚 Time favorito</p>
        <Badge variant={isOpen ? "default" : "secondary"}>{isOpen ? "Parcial" : "Resultado"}</Badge>
      </div>
      <VoteResultsList results={results} />
      {isOpen && (
        <Button asChild size="sm" variant="outline">
          <Link href="/erasto-league/votar/time-favorito">Votar no seu time</Link>
        </Button>
      )}
    </div>
  );
}

// Parcial da votação da torcida (pedido: parcial visível no site, não só no fim). Sem destaque de
// "seu voto" aqui de propósito — o bloco pode estar em qualquer página do CMS, e ler o cookie do
// aparelho só faz sentido nas páginas de voto (routes/vote-public).
export async function ErastoLeagueFanVotesBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Votação da torcida");
  const mode = readString(block.data, "mode", "both");
  const limit = readNumber(block.data, "limit", 5);
  const config = await resolveErastoLeagueConfig();

  const showMatch = mode !== "favorite";
  const showFavorite = mode !== "match";

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}
      <div className={`grid gap-4 ${showMatch && showFavorite ? "lg:grid-cols-2" : ""}`}>
        {showMatch && <MatchPollPanel windowHours={config.fanVoteWindowHours} limit={limit} />}
        {showFavorite && <FavoriteTeamPanel isOpen={config.favoriteTeamVotingOpen} limit={limit} />}
      </div>
    </div>
  );
}
