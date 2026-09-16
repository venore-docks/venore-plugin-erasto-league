"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Input, MediaPickerField, Textarea, useActionToast, type PickableMedia } from "@venore/plugin-sdk/ui";
import { savePlayerAction, type PlayerActionState } from "./actions";
import { PLAYER_GENDER_LABEL } from "../../../shared/player-gender";
import type { PlayerProfile, TeamProfile } from "../../../contracts/types";

const initialState: PlayerActionState = { error: null, playerId: null };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export function PlayerForm({
  player,
  teams,
  defaultTeamId,
  photoMedia,
}: {
  player: PlayerProfile | null;
  teams: TeamProfile[];
  defaultTeamId: string | null;
  photoMedia: PickableMedia | null;
}) {
  const [state, formAction, pending] = useActionState(savePlayerAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: player ? "Jogador atualizado." : "Jogador cadastrado." });

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-panel border border-border bg-card p-4">
      <input type="hidden" name="id" value={player?.id ?? "new"} />

      <Field label="Time">
        <select
          name="teamId"
          defaultValue={player?.teamId ?? defaultTeamId ?? ""}
          required
          className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
        >
          <option value="" disabled>
            Selecione um time
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field label="Nome do jogador">
          <Input name="name" defaultValue={player?.name} required maxLength={60} />
        </Field>
        <Field label="Número">
          <Input name="number" type="number" min={0} max={999} defaultValue={player?.number ?? ""} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Gênero (opcional)">
          <select
            name="gender"
            defaultValue={player?.gender ?? ""}
            className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">— não informado —</option>
            {Object.entries(PLAYER_GENDER_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-foreground">
          <input type="checkbox" name="isCaptain" defaultChecked={player?.isCaptain ?? false} className="size-4 rounded border-border" />
          Capitão do time
        </label>
      </div>

      <MediaPickerField name="photoMediaId" label="Foto (opcional)" initialMedia={photoMedia} />

      <Field label="Bio (opcional)">
        <Textarea name="bio" defaultValue={player?.bio ?? ""} rows={3} maxLength={1000} />
      </Field>

      <Button type="submit" disabled={pending || teams.length === 0}>
        {pending ? "Salvando…" : player ? "Salvar alterações" : "Cadastrar jogador"}
      </Button>
      {teams.length === 0 && <p className="text-xs text-muted-foreground">Cadastre um time antes de adicionar jogadores.</p>}
    </form>
  );
}
