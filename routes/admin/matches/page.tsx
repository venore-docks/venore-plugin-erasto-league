import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, Badge, Button, EmptyState } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { listMatches } from "../../../runtime/matches";
import { listTeams } from "../../../runtime/teams";
import { formatScore } from "../../../shared/score";
import { MATCH_STATUS_BADGE_VARIANT, MATCH_STATUS_LABEL } from "../../../shared/match-status";

function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
}

// Súmula: lista de partidas (/admin/erasto-league/matches), mais recente primeiro. Cada linha
// abre /admin/erasto-league/matches/:id pra completar/corrigir os eventos.
export default async function MatchesAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [matches, teams] = await Promise.all([listMatches(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Súmulas"
        description="Partidas registradas — corrija ou complete quem fez cada gol/cartão/falta."
        actions={
          <Button asChild>
            <Link href="/admin/erasto-league/matches/new">
              <Plus className="size-4" /> Nova súmula
            </Link>
          </Button>
        }
      />

      {matches.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" strokeWidth={1.5} />}
          title="Nenhuma partida ainda"
          description="Inicie uma partida no controle (/ext/erasto-league/control) ou crie uma súmula manual pra um jogo que já aconteceu."
        />
      ) : (
        <ul className="divide-y divide-border rounded-panel border border-border bg-card">
          {matches.map((match) => {
            const home = teamById.get(match.homeTeamId);
            const away = teamById.get(match.awayTeamId);
            return (
              <li key={match.id}>
                <Link
                  href={`/admin/erasto-league/matches/${match.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-accent/14"
                >
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <span className="size-2 rounded-full" style={{ background: home?.primaryColor ?? "#334155" }} />
                    {home?.name ?? "—"}
                    <span className="font-bold">
                      {formatScore(match.homeScore)} × {formatScore(match.awayScore)}
                    </span>
                    {away?.name ?? "—"}
                    <span className="size-2 rounded-full" style={{ background: away?.primaryColor ?? "#334155" }} />
                  </span>
                  <span className="text-xs text-muted-foreground">{formatMatchDate(match.startedAt)}</span>
                  <Badge variant={MATCH_STATUS_BADGE_VARIANT[match.status]} className="ml-auto">
                    {MATCH_STATUS_LABEL[match.status]}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
