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
          'Uma linha por time. Só "name" é obrigatória — o resto fica em branco se a coluna faltar. Reimportar atualiza times já cadastrados (casados pelo nome) em vez de duplicar.'
        }
        columns="name, group, primaryColor, secondaryColor, foundedDate, description"
      />

      <CsvImportForm
        action={importFixturesCsvAction}
        title="Tabela de jogos"
        description={
          'Uma linha por confronto. Cadastre/importe os times primeiro — homeTeam/awayTeam precisam bater com o nome exato de um time já existente. Deixe homeTeam/awayTeam em branco (usando homeLabel/awayLabel, ex: "Vencedor Grupo A") pra confrontos de eliminatória ainda sem time definido.'
        }
        columns="phase, group, round, homeTeam, awayTeam, homeLabel, awayLabel, date, time, order"
        showReplaceAll
      />
    </div>
  );
}
