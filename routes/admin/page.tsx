import Link from "next/link";
import { Award, CalendarDays, ClipboardList, MonitorPlay, Radio, Shield, Smartphone, Tv, Upload, Users, Zap } from "lucide-react";
import { AdminAccessDenied, AdminPageHeader, AdminStatTile, Badge, Button } from "@venore/plugin-sdk/ui";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { resolveErastoLeagueConfig } from "../../shared/config";
import { formatClock } from "../../shared/clock";
import { getMatchState } from "../../runtime/match-actions";
import { listTeams } from "../../runtime/teams";
import { listPlayers } from "../../runtime/players";
import { listFinishedMatches } from "../../runtime/matches";
import { SettingsForm } from "./settings-form";

// Único ponto do plugin no admin (link criado no install via manifest.navigation). Visão geral
// (stats + status ao vivo) + atalhos pro cadastro/telas + config das settings.
export default async function ErastoLeagueAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [config, state, teams, players, finished] = await Promise.all([
    resolveErastoLeagueConfig(),
    getMatchState(),
    listTeams(),
    listPlayers(),
    listFinishedMatches(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Erasto League"
        description="Placar ao vivo pro OBS + controle pelo celular. Configure abaixo e abra as telas."
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        <AdminStatTile label="Times" value={teams.length} />
        <AdminStatTile label="Jogadores" value={players.length} />
        <AdminStatTile label="Partidas encerradas" value={finished.length} />
        <AdminStatTile
          label="Agora"
          value={
            state.currentMatchId ? (
              <span className="inline-flex items-center gap-1.5 text-base font-semibold text-destructive">
                <Radio className="size-4" /> Ao vivo
              </span>
            ) : (
              <span className="text-base font-semibold text-muted-foreground">Ociosa</span>
            )
          }
          hint={state.currentMatchId ? `${state.home.name} × ${state.away.name}` : undefined}
        />
      </div>

      <section className="rounded-panel border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Award className="size-4 text-muted-foreground" /> Cadastro
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Times e jogadores do campeonato — sempre cadastrados por um admin.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/erasto-league/teams">
              <Shield className="size-4" /> Times
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/erasto-league/players">
              <Users className="size-4" /> Jogadores
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/erasto-league/matches">
              <ClipboardList className="size-4" /> Súmulas
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/erasto-league/fixtures">
              <CalendarDays className="size-4" /> Tabela de jogos
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/erasto-league/power-boosts">
              <Zap className="size-4" /> Power boosts
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/erasto-league/import">
              <Upload className="size-4" /> Importar CSV
            </Link>
          </Button>
        </div>
      </section>

      <section className="rounded-panel border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MonitorPlay className="size-4 text-muted-foreground" /> Telas
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          O overlay é uma fonte de navegador no OBS (fundo transparente). O controle abre no
          celular e pede login (mesma permissão desta seção). A view de TV é feita pra abrir em
          tela cheia num projetor/TV do evento.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/ext/erasto-league/overlay" target="_blank" rel="noreferrer">
              <MonitorPlay className="size-4" /> Abrir overlay ↗
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/ext/erasto-league/control" target="_blank" rel="noreferrer">
              <Smartphone className="size-4" /> Abrir controle ↗
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/ext/erasto-league/tv" target="_blank" rel="noreferrer">
              <Tv className="size-4" /> Abrir view de TV ↗
            </a>
          </Button>
          {state.currentMatchId && (
            <Badge variant="destructive" className="gap-1">
              <Radio className="size-3" /> ao vivo agora
            </Badge>
          )}
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
