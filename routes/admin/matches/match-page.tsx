import { notFound } from "next/navigation";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader, Badge, Button } from "@venore/plugin-sdk/ui";
import { getMatch } from "../../../runtime/matches";
import { getTeam, listTeams } from "../../../runtime/teams";
import { listPlayersByTeam } from "../../../runtime/players";
import { listEventsByMatch } from "../../../runtime/match-events";
import { listBoostsByMatch } from "../../../runtime/match-boosts";
import { listPowerBoosts } from "../../../runtime/power-boosts";
import { formatScore } from "../../../shared/score";
import { MATCH_STATUS_BADGE_VARIANT, MATCH_STATUS_LABEL } from "../../../shared/match-status";
import {
  addBoostFormAction,
  addEventFormAction,
  deleteBoostFormAction,
  deleteEventFormAction,
  setMatchMvpFormAction,
  updateEventFormAction,
} from "./actions";
import { CreateMatchForm } from "./create-match-form";
import type { EventKind, MatchEvent, PlayerProfile, TeamProfile } from "../../../contracts/types";

const EVENT_LABEL: Record<EventKind, string> = {
  goal: "Gol",
  yellow_card: "Cartão amarelo",
  red_card: "Cartão vermelho",
  foul: "Falta",
};

function PlayerOptions({ homeTeam, homeRoster, awayTeam, awayRoster }: {
  homeTeam: TeamProfile | null;
  homeRoster: PlayerProfile[];
  awayTeam: TeamProfile | null;
  awayRoster: PlayerProfile[];
}) {
  return (
    <>
      <option value="">— sem jogador —</option>
      <optgroup label={homeTeam?.name ?? "Casa"}>
        {homeRoster.map((player) => (
          <option key={player.id} value={player.id}>
            {player.number != null ? `#${player.number} ` : ""}
            {player.name}
          </option>
        ))}
      </optgroup>
      <optgroup label={awayTeam?.name ?? "Visitante"}>
        {awayRoster.map((player) => (
          <option key={player.id} value={player.id}>
            {player.number != null ? `#${player.number} ` : ""}
            {player.name}
          </option>
        ))}
      </optgroup>
    </>
  );
}

function EventRow({
  event,
  matchId,
  homeTeam,
  awayTeam,
  homeRoster,
  awayRoster,
  playerById,
}: {
  event: MatchEvent;
  matchId: string;
  homeTeam: TeamProfile | null;
  awayTeam: TeamProfile | null;
  homeRoster: PlayerProfile[];
  awayRoster: PlayerProfile[];
  playerById: Map<string, PlayerProfile>;
}) {
  const player = event.playerId ? playerById.get(event.playerId) : null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-panel border border-border bg-card p-3">
      <form action={updateEventFormAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="matchId" value={matchId} />
        <select name="kind" defaultValue={event.kind} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
          {Object.entries(EVENT_LABEL).map(([kind, label]) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
        <select name="side" defaultValue={event.side} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
          <option value="home">{homeTeam?.name ?? "Casa"}</option>
          <option value="away">{awayTeam?.name ?? "Visitante"}</option>
        </select>
        <select name="playerId" defaultValue={event.playerId ?? ""} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
          <PlayerOptions homeTeam={homeTeam} homeRoster={homeRoster} awayTeam={awayTeam} awayRoster={awayRoster} />
        </select>
        {event.kind === "goal" && (
          <input
            name="amount"
            type="number"
            step={0.5}
            defaultValue={event.amount}
            className="h-8 w-16 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          />
        )}
        <Button type="submit" size="sm" variant="outline">
          Salvar
        </Button>
      </form>
      <form action={deleteEventFormAction}>
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="matchId" value={matchId} />
        <Button type="submit" size="sm" variant="ghost" className="text-destructive">
          Excluir
        </Button>
      </form>
      {!event.playerId && <span className="text-xs text-amber-500">sem jogador atribuído</span>}
      {player && <span className="ml-auto text-xs text-muted-foreground">{player.name}</span>}
    </div>
  );
}

// id "new" = criar súmula sem controle ao vivo (ver create-match-form.tsx); qualquer outro valor é
// o uuid de uma partida existente.
export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  if (id === "new") {
    const teams = await listTeams();
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Nova súmula" description="Registra uma partida que já aconteceu, sem passar pelo controle ao vivo." />
        <CreateMatchForm teams={teams} />
      </div>
    );
  }

  const match = await getMatch(id);
  if (!match) {
    notFound();
  }

  const [homeTeam, awayTeam, events, homeRoster, awayRoster, boosts, powerBoosts] = await Promise.all([
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    listEventsByMatch(id),
    listPlayersByTeam(match.homeTeamId),
    listPlayersByTeam(match.awayTeamId),
    listBoostsByMatch(id),
    listPowerBoosts(),
  ]);
  const playerById = new Map([...homeRoster, ...awayRoster].map((player) => [player.id, player]));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${homeTeam?.name ?? "—"} ${formatScore(match.homeScore)} × ${formatScore(match.awayScore)} ${awayTeam?.name ?? "—"}`}
        description={
          <Badge variant={MATCH_STATUS_BADGE_VARIANT[match.status]}>{MATCH_STATUS_LABEL[match.status]}</Badge>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">MVP da partida</h2>
        {match.mvpPlayerId && (
          <p className="text-xs text-muted-foreground">
            Atual: <span className="font-semibold text-foreground">{playerById.get(match.mvpPlayerId)?.name ?? "—"}</span>
            {match.mvpNote ? ` — "${match.mvpNote}"` : ""}
          </p>
        )}
        <form action={setMatchMvpFormAction} className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-card p-3">
          <input type="hidden" name="matchId" value={id} />
          <select
            name="mvpPlayerId"
            defaultValue={match.mvpPlayerId ?? ""}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <PlayerOptions homeTeam={homeTeam} homeRoster={homeRoster} awayTeam={awayTeam} awayRoster={awayRoster} />
          </select>
          <input
            name="mvpNote"
            defaultValue={match.mvpNote ?? ""}
            placeholder="Descrição (opcional)"
            maxLength={140}
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          />
          <Button type="submit">Salvar MVP</Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Eventos</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                matchId={id}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                homeRoster={homeRoster}
                awayRoster={awayRoster}
                playerById={playerById}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Adicionar evento</h2>
        <form action={addEventFormAction} className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-card p-3">
          <input type="hidden" name="matchId" value={id} />
          <select name="kind" defaultValue="goal" className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
            {Object.entries(EVENT_LABEL).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
          <select name="side" defaultValue="home" className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
            <option value="home">{homeTeam?.name ?? "Casa"}</option>
            <option value="away">{awayTeam?.name ?? "Visitante"}</option>
          </select>
          <select name="playerId" defaultValue="" className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
            <PlayerOptions homeTeam={homeTeam} homeRoster={homeRoster} awayTeam={awayTeam} awayRoster={awayRoster} />
          </select>
          <input
            name="amount"
            type="number"
            step={0.5}
            defaultValue={1}
            className="h-9 w-20 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          />
          <Button type="submit">Adicionar</Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Power boosts</h2>
        {boosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum boost usado nesta partida.</p>
        ) : (
          <div className="space-y-2">
            {boosts.map((boost) => {
              const catalogEntry = powerBoosts.find((entry) => entry.key === boost.boostKey);
              const side = boost.side === "home" ? homeTeam : awayTeam;
              return (
                <div key={boost.id} className="flex flex-wrap items-center gap-3 rounded-panel border border-border bg-card p-3">
                  <span className="text-sm text-foreground">
                    {catalogEntry?.emoji} {catalogEntry?.label ?? boost.boostKey}
                  </span>
                  <span className="text-xs text-muted-foreground">{side?.name ?? "—"}</span>
                  <form action={deleteBoostFormAction} className="ml-auto">
                    <input type="hidden" name="boostId" value={boost.id} />
                    <input type="hidden" name="matchId" value={id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      Excluir
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        {powerBoosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum power boost cadastrado ainda —{" "}
            <a href="/admin/erasto-league/power-boosts" className="underline">
              cadastre o catálogo
            </a>{" "}
            antes de registrar um uso.
          </p>
        ) : (
          <form action={addBoostFormAction} className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-card p-3">
            <input type="hidden" name="matchId" value={id} />
            <select name="side" defaultValue="home" className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
              <option value="home">{homeTeam?.name ?? "Casa"}</option>
              <option value="away">{awayTeam?.name ?? "Visitante"}</option>
            </select>
            <select name="boostKey" defaultValue={powerBoosts[0].key} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
              {powerBoosts.map((boost) => (
                <option key={boost.key} value={boost.key}>
                  {boost.emoji} {boost.label}
                </option>
              ))}
            </select>
            <Button type="submit">Adicionar</Button>
          </form>
        )}
      </section>
    </div>
  );
}
