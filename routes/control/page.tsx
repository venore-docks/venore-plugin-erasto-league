import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatchState } from "../../runtime/match-bus";
import { hasValidPin, pinIsDefault } from "../../shared/pin";
import { PinForm } from "./pin-form";
import { Console } from "./console";

// Controle no celular: rota standalone (fora da shell). Gate por PIN (cookie) antes do console.
export default async function ControlPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  if (!(await hasValidPin())) {
    return <PinForm usingDefaultPin={pinIsDefault()} />;
  }

  return <Console initialState={getMatchState()} usingDefaultPin={pinIsDefault()} />;
}
