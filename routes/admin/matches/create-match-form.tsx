"use client";

import { useActionState } from "react";
import { Button, Input, useActionToast } from "@venore/plugin-sdk/ui";
import { createMatchFormAction, type CreateMatchActionState } from "./actions";
import type { TeamProfile } from "../../../contracts/types";

const initialState: CreateMatchActionState = { error: null };

export function CreateMatchForm({ teams }: { teams: TeamProfile[] }) {
  const [state, formAction, pending] = useActionState(createMatchFormAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: "Súmula criada." });

  return (
    <form action={formAction} className="max-w-xl space-y-5 rounded-panel border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Time da casa</label>
          <select name="homeTeamId" required className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground">
            <option value="">— selecione —</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Time visitante</label>
          <select name="awayTeamId" required className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground">
            <option value="">— selecione —</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Gols do time da casa</label>
          <Input name="homeScore" type="number" min={0} step={1} defaultValue={0} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Gols do time visitante</label>
          <Input name="awayScore" type="number" min={0} step={1} defaultValue={0} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Data do jogo</label>
        <Input name="playedOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      <p className="text-xs text-muted-foreground">
        Cria a partida já encerrada, com o placar contando na classificação. Depois de criada, abra a súmula pra atribuir os gols a
        jogadores específicos e adicionar cartão/falta.
      </p>

      <Button type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar súmula"}
      </Button>
    </form>
  );
}
