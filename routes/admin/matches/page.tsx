import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, EmptyState } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { listMatches } from "../../../runtime/matches";
import { listTeams } from "../../../runtime/teams";
import { formatScore } from "../../../shared/score";
import { MATCH_STATUS_LABEL } from "../../../shared/match-status";

// Súmula: lista de partidas (/admin/erasto-league/matches), mais recente primeiro. Cada linha
// abre /admin/erasto-league/matches/:id pra completar/corrigir os eventos.
export default async function MatchesAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [matches, teams] = await Promise.all([listMatches(), listTeams()]);
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Súmulas" description="Partidas registradas — corrija ou complete quem fez cada gol/cartão/falta." />

      {matches.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" strokeWidth={1.5} />}
          title="Nenhuma partida ainda"
          description="Inicie uma partida no controle (/ext/erasto-league/control) pra ela aparecer aqui."
        />
      ) : (
        <ul className="divide-y divide-border rounded-panel border border-border bg-card">
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                href={`/admin/erasto-league/matches/${match.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/14"
              >
                <span className="text-sm text-foreground">
                  {teamNameById.get(match.homeTeamId) ?? "—"} {formatScore(match.homeScore)} × {formatScore(match.awayScore)}{" "}
                  {teamNameById.get(match.awayTeamId) ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">{MATCH_STATUS_LABEL[match.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
