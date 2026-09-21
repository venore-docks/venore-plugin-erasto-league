"use client";

import { useActionState } from "react";
import { Button, Input, useActionToast } from "@venore/plugin-sdk/ui";
import { setMatchYoutubeUrlFormAction, type SetMatchYoutubeUrlActionState } from "./actions";

const initialState: SetMatchYoutubeUrlActionState = { error: null };

// Link da transmissão/gravação no YouTube deste jogo — alimenta a página pública do jogo
// (routes/match-public). Componente próprio (não inline em match-page.tsx, diferente da seção de
// MVP) porque precisa de useActionState pra mostrar o erro de link inválido (setMatchYoutubeUrlFormAction).
export function YoutubeUrlForm({ matchId, youtubeUrl }: { matchId: string; youtubeUrl: string | null }) {
  const [state, formAction, pending] = useActionState(setMatchYoutubeUrlFormAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: "Link salvo." });

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-card p-3">
      <input type="hidden" name="matchId" value={matchId} />
      <Input
        name="youtubeUrl"
        type="url"
        placeholder="https://www.youtube.com/watch?v=..."
        defaultValue={youtubeUrl ?? ""}
        className="min-w-0 flex-1"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar link"}
      </Button>
    </form>
  );
}
