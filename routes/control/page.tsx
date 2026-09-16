import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatchState } from "../../runtime/match-actions";
import { listTeams } from "../../runtime/teams";
import { resolveErastoLeagueConfig, pinIsDefaultFor } from "../../shared/config";
import { hasValidPin } from "../../shared/pin";
import { PinForm } from "./pin-form";
import { Console } from "./console";

// Controle no celular: rota standalone (fora da shell). Gate por PIN (cookie) antes do console.
export default async function ControlPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const config = await resolveErastoLeagueConfig();
  const usingDefaultPin = pinIsDefaultFor(config);

  if (!(await hasValidPin())) {
    return <PinForm usingDefaultPin={usingDefaultPin} />;
  }

  const [initialState, teams] = await Promise.all([getMatchState(), listTeams()]);

  return (
    <Console
      initialState={initialState}
      teams={teams}
      accentColor={config.accentColor}
      usingDefaultPin={usingDefaultPin}
      periodMs={config.periodMs}
      periodCount={config.periodCount}
    />
  );
}
