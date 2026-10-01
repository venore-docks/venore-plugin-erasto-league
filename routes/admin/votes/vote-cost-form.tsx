"use client";

import { useActionState } from "react";
import { Button, Input, useActionToast } from "@venore/plugin-sdk/ui";
import type { VoteCostPolicy } from "../../../shared/fan-votes";
import { saveVoteCostAction, type VoteSettingsState } from "./actions";

const initialState: VoteSettingsState = { error: null, savedAt: null };

const FIELDS: { name: keyof VoteCostPolicy; label: string; max: number }[] = [
  { name: "baseSeconds", label: "Espera do 1º voto (s)", max: 600 },
  { name: "stepSeconds", label: "+ por voto da mesma rede (s)", max: 600 },
  { name: "maxSeconds", label: "Espera máxima (s)", max: 600 },
  { name: "maxPerNetwork", label: "Teto por rede (0 = sem)", max: 10_000 },
];

// Custo de cada voto (Jogador da Torcida e Time favorito): a espera e o teto por rede — ver
// shared/fan-votes.ts resolveVoteWaitSeconds.
export function VoteCostForm({ policy }: { policy: VoteCostPolicy }) {
  const [state, formAction, pending] = useActionState(saveVoteCostAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: "Custo do voto salvo." });

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {FIELDS.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label htmlFor={`vote-cost-${field.name}`} className="text-sm font-medium text-foreground">
              {field.label}
            </label>
            <Input
              id={`vote-cost-${field.name}`}
              name={field.name}
              type="number"
              min={0}
              max={field.max}
              defaultValue={policy[field.name]}
            />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
