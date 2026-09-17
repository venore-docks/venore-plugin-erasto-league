"use client";

import { useActionState, type ReactNode } from "react";
import { Clock3, Palette, Radio, Trophy, type LucideIcon } from "lucide-react";
import { Button, Input, MediaPickerField, useActionToast, type PickableMedia } from "@venore/plugin-sdk/ui";
import { saveErastoLeagueSettingsAction, type ErastoLeagueSettingsState } from "./actions";
import { formatClock } from "../../shared/clock";
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

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3.5" /> {title}
    </h3>
  );
}

export function SettingsForm({ config, logoMedia }: { config: ErastoLeagueConfig; logoMedia: PickableMedia | null }) {
  const [state, formAction, pending] = useActionState(saveErastoLeagueSettingsAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: "Configurações salvas." });

  return (
    <form action={formAction} className="max-w-3xl space-y-6 rounded-panel border border-border bg-card p-5">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-panel border border-border/60 bg-background/40 p-4">
          <SectionHeading icon={Trophy} title="Identidade" />
          <MediaPickerField name="logoMediaId" label="Logo da liga" initialMedia={logoMedia} />
          <p className="text-xs text-muted-foreground">Exibida no medalhão do placar. Sem logo, cai no monograma "EL".</p>
        </div>

        <div className="space-y-3 rounded-panel border border-border/60 bg-background/40 p-4">
          <SectionHeading icon={Palette} title="Cor de destaque" />
          <div className="flex items-center gap-3">
            <input
              name="accentColor"
              type="color"
              defaultValue={config.accentColor}
              className="h-12 w-16 shrink-0 cursor-pointer rounded-md border border-border bg-card"
            />
            <p className="text-xs text-muted-foreground">Placa do placar, halo do relógio e etiquetas do overlay/controle.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-panel border border-border/60 bg-background/40 p-4">
        <SectionHeading icon={Clock3} title="Duração da partida" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Duração de um tempo (min)">
            <Input name="periodMinutes" type="number" min={1} max={90} defaultValue={config.periodMs / 60000} />
          </Field>
          <Field label="Número de tempos">
            <Input name="periodCount" type="number" min={1} max={4} defaultValue={config.periodCount} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Tempo total configurado agora: <strong className="text-foreground">{formatClock(config.periodMs * config.periodCount)}</strong>
        </p>
      </div>

      <div className="space-y-3 rounded-panel border border-border/60 bg-background/40 p-4">
        <SectionHeading icon={Radio} title="Transmissão" />
        <Field label="Id do canal do YouTube" hint="O bloco de transmissão embeda automaticamente a live atual desse canal, sem precisar colar link por jogo.">
          <Input name="youtubeChannelId" defaultValue={config.youtubeChannelId} placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" />
        </Field>
      </div>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Salvando…" : "Salvar configurações"}
      </Button>
    </form>
  );
}
