import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { listTopScorers } from "../../runtime/stats";
import { ArtilleryView } from "./artillery-view";

// Lista completa de artilheiros (/erasto-league/artilharia) — sem limite, complementa o bloco
// erasto-league.top-scorers (que só mostra os 5 primeiros + link "Ver mais" pra cá). Rota "public"
// (ver routes/route-table.ts): renderiza DENTRO da shell/tema do host, não mais em /ext/.
export default async function ArtilleryPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const scorers = await listTopScorers();

  return <ArtilleryView scorers={scorers} />;
}
