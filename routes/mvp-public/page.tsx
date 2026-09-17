import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { listTopMvps } from "../../runtime/stats";
import { MvpView } from "./mvp-view";

// Lista completa de MVPs (/erasto-league/mvps) — sem limite, complementa o bloco
// erasto-league.mvp-scorers (que só mostra os 5 primeiros + link "Ver mais" pra cá). Rota "public"
// (ver routes/route-table.ts): renderiza DENTRO da shell/tema do host, não mais em /ext/.
export default async function MvpPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const mvps = await listTopMvps();

  return <MvpView mvps={mvps} />;
}
