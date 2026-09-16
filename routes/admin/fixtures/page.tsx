import Link from "next/link";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader, Badge, Button, EmptyState } from "@venore/plugin-sdk/ui";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import { listFixtures } from "../../../runtime/fixtures";
import { listTeams } from "../../../runtime/teams";
import { listMatchesBetweenTeams } from "../../../runtime/matches";
import { FIXTURE_PHASE_LABEL, FIXTURE_PHASE_ORDER } from "../../../shared/fixture-phase";
import { formatScore } from "../../../shared/score";
import { linkFixtureFormAction, deleteFixtureFormAction } from "./actions";
import type { Fixture, FixturePhase, TeamProfile } from "../../../contracts/types";

function formatDate(epochMs: number | null): string {
  if (!epochMs) return "Data a definir";
  return new Date(epochMs).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Linha de um confronto — async porque busca as partidas candidatas pra vincular (só quando os
// dois times são conhecidos; confrontos "a definir" de eliminatória não têm o que vincular ainda).
async function FixtureRow({ fixture, teamById }: { fixture: Fixture; teamById: Map<string, TeamProfile> }) {
  const home = fixture.homeTeamId ? teamById.get(fixture.homeTeamId) : null;
  const away = fixture.awayTeamId ? teamById.get(fixture.awayTeamId) : null;
  const candidates = fixture.homeTeamId && fixture.awayTeamId ? await listMatchesBetweenTeams(fixture.homeTeamId, fixture.awayTeamId) : [];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-panel border border-border bg-card p-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground">
        <span className="truncate font-medium">{home?.name ?? fixture.homeLabel ?? "A definir"}</span>
        <span className="text-muted-foreground">×</span>
        <span className="truncate font-medium">{away?.name ?? fixture.awayLabel ?? "A definir"}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(fixture.scheduledAt)}</span>
      {fixture.roundLabel && (
        <Badge className="shrink-0 bg-primary/15 font-bold text-primary hover:bg-primary/15">{fixture.roundLabel}</Badge>
      )}

      <Button asChild size="sm" variant="ghost">
        <Link href={`/admin/erasto-league/fixtures/${fixture.id}`}>
          <Pencil className="size-3.5" /> Editar
        </Link>
      </Button>

      {candidates.length > 0 && (
        <form action={linkFixtureFormAction} className="flex shrink-0 items-center gap-1.5">
          <input type="hidden" name="fixtureId" value={fixture.id} />
          <select
            name="matchId"
            defaultValue={fixture.matchId ?? ""}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          >
            <option value="">— não vinculado —</option>
            {candidates.map((match) => (
              <option key={match.id} value={match.id}>
                {formatScore(match.homeScore)} × {formatScore(match.awayScore)} ({match.status})
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">
            Vincular
          </Button>
        </form>
      )}
      {fixture.matchId && candidates.length === 0 && <Badge>Vinculado</Badge>}

      <form action={deleteFixtureFormAction} className="shrink-0">
        <input type="hidden" name="fixtureId" value={fixture.id} />
        <Button type="submit" size="sm" variant="ghost" className="text-destructive">
          Excluir
        </Button>
      </form>
    </div>
  );
}

export default async function FixturesAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [fixtures, teams] = await Promise.all([listFixtures(), listTeams()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const byPhase = new Map<FixturePhase, Fixture[]>();
  for (const phase of FIXTURE_PHASE_ORDER) byPhase.set(phase, []);
  for (const fixture of fixtures) {
    byPhase.get(fixture.phase)?.push(fixture);
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Tabela de jogos"
        description="Confrontos agendados (grupos + eliminatórias) — importados via CSV, vinculados à partida real quando jogados."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/erasto-league/import">Importar CSV</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/erasto-league/fixtures/new">
                <Plus className="size-4" /> Novo confronto
              </Link>
            </Button>
          </>
        }
      />

      {fixtures.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-8" strokeWidth={1.5} />}
          title="Nenhum confronto cadastrado"
          description="Importe a tabela de jogos via CSV pra começar."
          action={
            <Button asChild>
              <Link href="/admin/erasto-league/import">Importar CSV</Link>
            </Button>
          }
        />
      ) : (
        FIXTURE_PHASE_ORDER.map((phase) => {
          const phaseFixtures = byPhase.get(phase) ?? [];
          if (phaseFixtures.length === 0) return null;

          const groups = new Map<string, Fixture[]>();
          for (const fixture of phaseFixtures) {
            const key = fixture.groupName ?? "";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(fixture);
          }

          return (
            <section key={phase} className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">{FIXTURE_PHASE_LABEL[phase]}</h2>
              {[...groups.entries()].map(([groupName, groupFixtures]) => (
                <div key={groupName || "sem-grupo"} className="space-y-2">
                  {groupName && <h3 className="text-sm font-medium text-muted-foreground">Grupo {groupName}</h3>}
                  <div className="space-y-2">
                    {groupFixtures.map((fixture) => (
                      <FixtureRow key={fixture.id} fixture={fixture} teamById={teamById} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
