import { notFound } from "next/navigation";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader, Button } from "@venore/plugin-sdk/ui";
import { getFixture } from "../../../runtime/fixtures";
import { listTeams } from "../../../runtime/teams";
import { FixtureForm } from "./fixture-form";
import { deleteFixtureFormAction } from "./actions";

// /admin/erasto-league/fixtures/:id — id "new" = confronto em branco (criar), qualquer outro
// valor é o uuid de um confronto existente (editar). Mesmo padrão de team-page.tsx.
export default async function FixtureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const isNew = id === "new";
  const fixture = isNew ? null : await getFixture(id);
  if (!isNew && !fixture) {
    notFound();
  }

  const teams = await listTeams();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isNew ? "Novo confronto" : "Editar confronto"}
        description="Fase, grupo, rodada, times e data — o mesmo confronto que alimenta os widgets e a view de TV."
        actions={
          fixture && (
            <form action={deleteFixtureFormAction}>
              <input type="hidden" name="fixtureId" value={fixture.id} />
              <Button type="submit" variant="outline" className="text-destructive">
                Excluir
              </Button>
            </form>
          )
        }
      />

      <FixtureForm fixture={fixture} teams={teams} />
    </div>
  );
}
