import { AdminAccessDenied, AdminPageHeader } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { formatClock } from "../../shared/clock";
import { SettingsForm } from "./settings-form";

// Único ponto do plugin no admin (link criado no install via manifest.navigation). Config das
// settings + atalhos pras telas standalone (overlay do OBS, controle do celular).
export default async function ErastoLeagueAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const config = await resolveErastoLeagueConfig();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Erasto League"
        description="Placar ao vivo pro OBS + controle pelo celular. Configure abaixo e abra as telas."
      />

      <section className="rounded-panel border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Telas</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          O overlay é uma fonte de navegador no OBS (fundo transparente). O controle abre no
          celular e pede o PIN.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="/ext/erasto-league/overlay"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/14"
          >
            Abrir overlay ↗
          </a>
          <a
            href="/ext/erasto-league/control"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/14"
          >
            Abrir controle ↗
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tempo total configurado: <strong>{formatClock(config.periodMs * config.periodCount)}</strong>{" "}
          ({config.periodCount} × {formatClock(config.periodMs)}).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Configurações</h2>
        <SettingsForm config={config} />
      </section>
    </div>
  );
}
