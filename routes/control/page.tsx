import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatchState } from "../../runtime/match-actions";
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

  return (
    <Console
      initialState={await getMatchState()}
      usingDefaultPin={usingDefaultPin}
      periodMs={config.periodMs}
      periodCount={config.periodCount}
    />
  );
}
