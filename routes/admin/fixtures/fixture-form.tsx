"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Input, useActionToast } from "@venore/plugin-sdk/ui";
import { saveFixtureFormAction, type FixtureActionState } from "./actions";
import { FIXTURE_PHASE_LABEL, FIXTURE_PHASE_ORDER } from "../../../shared/fixture-phase";
import type { Fixture, TeamProfile } from "../../../contracts/types";

const initialState: FixtureActionState = { error: null, fixtureId: null };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

export function FixtureForm({ fixture, teams }: { fixture: Fixture | null; teams: TeamProfile[] }) {
  const [state, formAction, pending] = useActionState(saveFixtureFormAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: fixture ? "Confronto atualizado." : "Confronto criado." });

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-panel border border-border bg-card p-4">
      <input type="hidden" name="id" value={fixture?.id ?? "new"} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fase">
          <select
            name="phase"
            defaultValue={fixture?.phase ?? "group"}
            className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            {FIXTURE_PHASE_ORDER.map((phase) => (
              <option key={phase} value={phase}>
                {FIXTURE_PHASE_LABEL[phase]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grupo" hint='Só relevante na fase de grupos — ex: "A".'>
          <Input name="groupName" defaultValue={fixture?.groupName ?? ""} maxLength={4} placeholder="A" />
        </Field>
      </div>

      <Field label="Rodada" hint='Aparece em destaque nos widgets e na view de TV — ex: "1ª Rodada".'>
        <Input name="roundLabel" defaultValue={fixture?.roundLabel ?? ""} maxLength={40} placeholder="1ª Rodada" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time da casa">
          <select
            name="homeTeamId"
            defaultValue={fixture?.homeTeamId ?? ""}
            className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">— usar texto abaixo —</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ou rótulo (time a definir)" hint='Usado só quando "Time da casa" está em branco — ex: "Vencedor Grupo A".'>
          <Input name="homeLabel" defaultValue={fixture?.homeLabel ?? ""} maxLength={40} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time visitante">
          <select
            name="awayTeamId"
            defaultValue={fixture?.awayTeamId ?? ""}
            className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">— usar texto abaixo —</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ou rótulo (time a definir)" hint='Usado só quando "Time visitante" está em branco.'>
          <Input name="awayLabel" defaultValue={fixture?.awayLabel ?? ""} maxLength={40} />
        </Field>
      </div>

      {/* Dois campos independentes (não um <input type="datetime-local"> só) — pedido explícito:
          o datetime-local só aceita o valor quando AS DUAS partes estão preenchidas, então editar
          só a hora de um confronto sem data ficava "preso" esperando uma data. Com dois <input>
          separados dá pra marcar o dia sem hora ainda definida, ou ajustar só a hora sem mexer no
          dia. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Data" hint="Em branco = a definir.">
          <Input name="scheduledDate" type="date" defaultValue={fixture?.scheduledDate ?? ""} />
        </Field>
        <Field label="Hora" hint="Opcional — dá pra marcar o dia sem hora ainda.">
          <Input name="scheduledTime" type="time" defaultValue={fixture?.scheduledTime ?? ""} />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : fixture ? "Salvar alterações" : "Criar confronto"}
      </Button>
    </form>
  );
}
