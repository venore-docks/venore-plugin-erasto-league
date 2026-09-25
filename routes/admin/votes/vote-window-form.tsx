"use client";

import { useActionState } from "react";
import { Button, Input, useActionToast } from "@venore/plugin-sdk/ui";
import { saveVoteWindowAction, type VoteSettingsState } from "./actions";

const initialState: VoteSettingsState = { error: null, savedAt: null };

export function VoteWindowForm({ hours }: { hours: number }) {
  const [state, formAction, pending] = useActionState(saveVoteWindowAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: "Janela salva." });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <label htmlFor="fanVoteWindowHours" className="text-sm font-medium text-foreground">
          Fica aberta por quantas horas depois do jogo
        </label>
        <Input id="fanVoteWindowHours" name="fanVoteWindowHours" type="number" min={1} max={720} defaultValue={hours} className="w-32" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
