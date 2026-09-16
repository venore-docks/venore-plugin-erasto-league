"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Input, MediaPickerField, Textarea, useActionToast, type PickableMedia } from "@venore/plugin-sdk/ui";
import { saveTeamAction, type TeamActionState } from "./actions";
import type { TeamProfile } from "../../../contracts/types";

const initialState: TeamActionState = { error: null, teamId: null };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export function TeamForm({ team, crestMedia }: { team: TeamProfile | null; crestMedia: PickableMedia | null }) {
  const [state, formAction, pending] = useActionState(saveTeamAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: team ? "Time atualizado." : "Time cadastrado." });

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-panel border border-border bg-card p-4">
      <input type="hidden" name="id" value={team?.id ?? "new"} />

      <Field label="Nome do time">
        <Input name="name" defaultValue={team?.name} required maxLength={60} />
      </Field>

      <MediaPickerField name="crestMediaId" label="Brasão (opcional)" initialMedia={crestMedia} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cor primária">
          <input
            name="primaryColor"
            type="color"
            defaultValue={team?.primaryColor ?? "#22c55e"}
            className="h-9 w-full cursor-pointer rounded-md border border-border bg-card"
          />
        </Field>
        <Field label="Cor secundária">
          <input
            name="secondaryColor"
            type="color"
            defaultValue={team?.secondaryColor ?? "#0f172a"}
            className="h-9 w-full cursor-pointer rounded-md border border-border bg-card"
          />
        </Field>
      </div>

      <Field label="Data de fundação">
        <Input name="foundedDate" type="date" defaultValue={team?.foundedDate ?? ""} />
      </Field>

      <Field label="Descrição / história">
        <Textarea name="description" defaultValue={team?.description ?? ""} rows={4} maxLength={2000} />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : team ? "Salvar alterações" : "Cadastrar time"}
      </Button>
    </form>
  );
}
