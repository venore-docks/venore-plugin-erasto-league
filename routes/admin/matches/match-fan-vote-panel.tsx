import { Badge, Button } from "@venore/plugin-sdk/ui";
import { getMatchFanVoteResults, getMatchVoteAudit, toMatchVotePoll } from "../../../runtime/fan-votes";
import { readFanVoteWindowHours } from "../../../shared/config";
import { VoteResultsList } from "../../../blocks/vote-results-list";
import { VoteAuditGroups } from "../votes/audit-groups";
import type { MatchSummary } from "../../../contracts/types";

function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Jogador da Torcida deste jogo na súmula — resultado + auditoria (anular/restaurar por IP). É
// separado do MVP oficial (matches.mvp_player_id, escolhido pelo admin logo acima): os dois
// prêmios convivem.
export async function MatchFanVotePanel({ match }: { match: MatchSummary }) {
  const windowHours = await readFanVoteWindowHours();
  const poll = toMatchVotePoll(match, windowHours);
  const [results, audit] = await Promise.all([getMatchFanVoteResults(match.id), getMatchVoteAudit(match.id)]);

  const status = !poll.window
    ? "Sem votação (partida cancelada)."
    : poll.window.closesAt === null
      ? `Aberta — fecha ${windowHours}h depois de encerrar a partida.`
      : poll.isOpen
        ? `Aberta até ${formatDateTime(poll.window.closesAt)}.`
        : `Encerrada em ${formatDateTime(poll.window.closesAt)}.`;

  return (
    <div className="space-y-4 rounded-panel border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={poll.isOpen ? "default" : "secondary"}>{poll.isOpen ? "Votação aberta" : "Votação encerrada"}</Badge>
        <span className="text-xs text-muted-foreground">{status}</span>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <a href={`/erasto-league/votar/jogo/${match.id}`} target="_blank" rel="noreferrer">
            Página de votação ↗
          </a>
        </Button>
      </div>
      <VoteResultsList results={results} emptyMessage="Nenhum voto ainda." />
      <h3 className="pt-2 text-sm font-semibold text-foreground">Auditoria</h3>
      <VoteAuditGroups audit={audit} scope="match" matchId={match.id} />
    </div>
  );
}
