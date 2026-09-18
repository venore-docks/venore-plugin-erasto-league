import { Zap } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, Button, EmptyState } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { listPowerBoosts } from "../../../runtime/power-boosts";
import { addPowerBoostFormAction, deletePowerBoostFormAction, updatePowerBoostFormAction } from "./actions";
import type { PowerBoost } from "../../../contracts/types";

const FIELD = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

function PowerBoostRow({ boost }: { boost: PowerBoost }) {
  return (
    <form
      action={updatePowerBoostFormAction}
      className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-card p-3"
    >
      <input type="hidden" name="id" value={boost.id} />
      <input name="emoji" defaultValue={boost.emoji} placeholder="🔥" maxLength={8} className={`${FIELD} w-14 text-center`} />
      <input name="label" defaultValue={boost.label} placeholder="Nome do boost" required className={`${FIELD} w-40 flex-1 min-w-32`} />
      <input
        name="description"
        defaultValue={boost.description}
        placeholder="Descrição (o que o boost faz)"
        className={`${FIELD} flex-[2] min-w-48`}
      />
      <Button type="submit" size="sm" variant="outline">
        Salvar
      </Button>
      <Button type="submit" formAction={deletePowerBoostFormAction} size="sm" variant="ghost" className="text-destructive">
        Excluir
      </Button>
    </form>
  );
}

// Catálogo de power play (/admin/erasto-league/power-boosts — rota/tabela/tipos internos mantêm o
// nome antigo "power boost", só o rótulo visível mudou) — antes mockado em shared/power-boosts.ts,
// agora uma tabela editável de verdade: acrescentar, editar (rótulo/emoji/descrição — a key interna
// segue o rótulo sozinha, ver runtime/power-boosts.ts) e remover. Consumido pelo controle ao vivo
// (routes/control) e pela súmula (routes/admin/matches).
export default async function PowerBoostsAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const powerBoosts = await listPowerBoosts();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Power play"
        description="Catálogo de reforços especiais que os times podem usar durante a partida, disponíveis no controle ao vivo e na súmula."
      />

      {powerBoosts.length === 0 ? (
        <EmptyState
          icon={<Zap className="size-8" strokeWidth={1.5} />}
          title="Nenhum power play cadastrado"
          description="Cadastre o primeiro boost pra ele aparecer no controle ao vivo."
        />
      ) : (
        <div className="space-y-2">
          {powerBoosts.map((boost) => (
            <PowerBoostRow key={boost.id} boost={boost} />
          ))}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Novo power play</h2>
        <form action={addPowerBoostFormAction} className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-card p-3">
          <input name="emoji" placeholder="🔥" maxLength={8} className={`${FIELD} w-14 text-center`} />
          <input name="label" placeholder="Nome do boost" required className={`${FIELD} w-40 flex-1 min-w-32`} />
          <input name="description" placeholder="Descrição (o que o boost faz)" className={`${FIELD} flex-[2] min-w-48`} />
          <Button type="submit">Adicionar</Button>
        </form>
      </section>
    </div>
  );
}
