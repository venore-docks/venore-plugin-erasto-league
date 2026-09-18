import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { Button } from "@venore/plugin-sdk/ui";
import { listFinishedMatches } from "../runtime/matches";
import { listTeams } from "../runtime/teams";
import { getPlayer } from "../runtime/players";
import { MatchResultCard } from "./match-result-card";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Quantos aparecem no bloco antes do "Ver mais" — a lista completa mora em /erasto-league/resultados
// (routes/results-public), mesma regra de blocks/top-scorers-block.tsx pra artilharia.
const VISIBLE_LIMIT = 5;

// Últimos resultados — mesma filosofia de standings-block.tsx (sempre lido na hora, nunca salvo na
// composição). Visual em linha com a agenda de jogos (schedule-block.tsx) — cartão com placar em
// destaque no centro, brasão dos dois lados (blocks/match-result-card.tsx).
export async function ErastoLeagueRecentResultsBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Últimos resultados");

  const [matches, teams] = await Promise.all([listFinishedMatches(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const recent = matches.slice(0, VISIBLE_LIMIT);

  // Nome do MVP resolvido só pros jogos exibidos (não a lista inteira de partidas encerradas) — o
  // mesmo custo baixo de resolveMediaUrl-por-item já usado em listTopScorers.
  const mvpIds = [...new Set(recent.map((match) => match.mvpPlayerId).filter((id): id is string => Boolean(id)))];
  const mvpPlayers = await Promise.all(mvpIds.map((id) => getPlayer(id)));
  const mvpNameById = new Map(mvpPlayers.filter((player) => player).map((player) => [player!.id, player!.name]));

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma partida encerrada ainda.</p>
      ) : (
        <>
          <div className="space-y-2">
            {recent.map((match) => (
              <MatchResultCard
                key={match.id}
                match={match}
                home={teamById.get(match.homeTeamId)}
                away={teamById.get(match.awayTeamId)}
                mvpName={match.mvpPlayerId ? (mvpNameById.get(match.mvpPlayerId) ?? null) : null}
              />
            ))}
          </div>

          {matches.length > VISIBLE_LIMIT && (
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/erasto-league/resultados">Ver mais</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
