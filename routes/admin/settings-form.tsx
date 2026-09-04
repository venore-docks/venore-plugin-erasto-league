"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Input, useActionToast } from "@venore/plugin-sdk/ui";
import { saveErastoLeagueSettingsAction, type ErastoLeagueSettingsState } from "./actions";
import type { ErastoLeagueConfig } from "../../shared/settings";

const initialState: ErastoLeagueSettingsState = { error: null, savedAt: null };

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

export function SettingsForm({ config }: { config: ErastoLeagueConfig }) {
  const [state, formAction, pending] = useActionState(saveErastoLeagueSettingsAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: "Configurações salvas." });

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-panel border border-border bg-card p-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time da casa (padrão)" hint="Usado ao começar uma nova partida.">
          <Input name="defaultHomeName" defaultValue={config.defaultHomeName} maxLength={40} />
        </Field>
        <Field label="Time visitante (padrão)">
          <Input name="defaultAwayName" defaultValue={config.defaultAwayName} maxLength={40} />
        </Field>

        <Field label="Duração de um tempo (min)" hint="Jogos de 20min = 2 tempos de 10.">
          <Input name="periodMinutes" type="number" min={1} max={90} defaultValue={config.periodMs / 60000} />
        </Field>
        <Field label="Número de tempos">
          <Input name="periodCount" type="number" min={1} max={4} defaultValue={config.periodCount} />
        </Field>

        <Field label="PIN do controle" hint="Vazio = usa a env ERASTO_LEAGUE_PIN, ou 1234.">
          <Input name="pin" defaultValue={config.pin === "1234" ? "" : config.pin} placeholder="ex: 4820" />
        </Field>
        <Field label="Cor de destaque" hint="Placa do placar, halo e relógio.">
          <input
            name="accentColor"
            type="color"
            defaultValue={config.accentColor}
            className="h-9 w-full cursor-pointer rounded-md border border-border bg-card"
          />
        </Field>
      </div>

      <Field label="Logo da liga" hint="Caminho no site (ex: /erasto_league.png) ou URL. Vazio = monograma EL.">
        <Input name="logoUrl" defaultValue={config.logoUrl} placeholder="/erasto_league.png" />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar configurações"}
      </Button>
    </form>
  );
}
