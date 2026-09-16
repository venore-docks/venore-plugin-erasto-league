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
          'Uma linha por time. Só "name" é obrigatória — o resto fica em branco se a coluna faltar. Sem "id": casa/atualiza pelo nome (import do zero). Com "id" preenchido (copie da página do time): atualiza aquele time específico, mesmo se o nome mudar. Grupo não é campo de time — isso fica só na planilha de confrontos, abaixo.'
        }
        columns="name, primaryColor, secondaryColor, foundedDate, description, id (opcional)"
      />

      <CsvImportForm
        action={importFixturesCsvAction}
        title="Tabela de jogos"
        description={
          'Uma linha por confronto. homeTeamId/awayTeamId (copie da página do time) têm prioridade sobre homeTeam/awayTeam (nome) — use o nome no primeiro import (times ainda sem id conhecido) e o id numa correção depois. Deixe os dois em branco (usando homeLabel/awayLabel, ex: "Vencedor Grupo A") pra confrontos de eliminatória ainda sem time definido.'
        }
        columns="phase, group, round, homeTeamId, homeTeam, awayTeamId, awayTeam, homeLabel, awayLabel, date, time, order"
        showReplaceAll
      />
    </div>
  );
}
