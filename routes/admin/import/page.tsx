import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader } from "@venore/plugin-sdk/ui";
import { CsvImportForm } from "./import-form";
import { importFixturesCsvAction, importTeamsCsvAction } from "./actions";

// Import em massa via CSV (Fase 6 — copa): times e confrontos agendados (grupos + eliminatórias).
// Cada planilha reaproveita os mutators normais (upsertTeamByName, createFixture) — nada de
// caminho paralelo escrevendo direto no banco.
export default async function ImportPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Importar CSV"
        description="Cadastro em massa de times e da tabela de jogos (grupos, quartas, semi, final)."
      />

      <CsvImportForm
        action={importTeamsCsvAction}
        title="Times"
        description={
          'Uma linha por time. Só "name" é obrigatória — o resto fica em branco se a coluna faltar. "id" (uuid) é opcional mas recomendado: se você mesmo gerar um id pra cada time na planilha, pode referenciar esse mesmo id em fixtures.csv sem depender do nome. Id que já existe → atualiza; id que ainda não existe → cria o time com aquele id exato; sem id nenhum → casa/atualiza pelo nome. Grupo não é campo de time — isso fica só na planilha de confrontos, abaixo.'
        }
        columns="id (opcional, uuid), name, primaryColor, secondaryColor, foundedDate, description"
      />

      <CsvImportForm
        action={importFixturesCsvAction}
        title="Tabela de jogos"
        description={
          'Uma linha por confronto. Recomendado usar homeTeamId/awayTeamId (uuid, copie da página do time ou do que você mesmo gerou em teams.csv) em vez de homeTeam/awayTeam (nome) — assim o vínculo não depende do time nunca ser renomeado ou digitado igualzinho. Deixe id e nome em branco (usando homeLabel/awayLabel, ex: "Vencedor Grupo A") pra confrontos de eliminatória ainda sem time definido.'
        }
        columns="phase, group, round, homeTeamId, awayTeamId, homeLabel, awayLabel, date, time, order (homeTeam/awayTeam por nome também funcionam, se preferir)"
        showReplaceAll
      />
    </div>
  );
}
