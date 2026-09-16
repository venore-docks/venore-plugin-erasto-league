import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { getMatchState } from "../../runtime/match-actions";
import { listTeams } from "../../runtime/teams";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { ControlAccessDenied } from "./access-denied";
import { Console } from "./console";

// Controle no celular: rota standalone (fora da shell, pra caber inteiro numa tela de celular sem
// header/nav do admin) mas gateada por LOGIN — mesma permissão ("erasto-league.manage") de
// qualquer outra tela admin do plugin, não mais por PIN de cookie. Alcançável pela superfície do
// admin ("Abrir controle ↗" em /admin/erasto-league) por quem já está logado.
export default async function ControlPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <ControlAccessDenied message="Faça login com uma conta autorizada pra abrir o controle do Erasto League." />;
  }

  const config = await resolveErastoLeagueConfig();
  const [initialState, teams] = await Promise.all([getMatchState(), listTeams()]);

  return (
    <Console
      initialState={initialState}
      teams={teams}
      accentColor={config.accentColor}
      periodMs={config.periodMs}
      periodCount={config.periodCount}
    />
  );
}
