"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import { Button, MediaPickerField, useActionToast, type PickableMedia } from "@venore/plugin-sdk/ui";
import { setMatchCoverFormAction, type SetMatchCoverActionState } from "./actions";
import { matchCoverPath } from "../../../shared/match-cover-layout";

const initialState: SetMatchCoverActionState = { error: null, savedAt: null };

// Foto do jogo → capa 1280×720 gerada no servidor (/api/erasto-league/matches/:id/cover). A prévia
// e o download funcionam mesmo sem foto (fundo nas cores dos times — útil como miniatura da live
// antes do jogo); a capa só aparece na página pública do jogo depois que uma foto é salva.
export function MatchCoverForm({
  matchId,
  coverMedia,
  coverVersion,
}: {
  matchId: string;
  coverMedia: PickableMedia | null;
  // coverMediaId salvo — vai na URL da imagem (?v=) pra furar cache quando a foto muda.
  coverVersion: string | null;
}) {
  const [state, formAction, pending] = useActionState(setMatchCoverFormAction, initialState);
  useActionToast({ pending, error: state.error, successMessage: "Foto salva — capa atualizada." });

  const coverUrl = matchCoverPath(matchId, coverVersion);

  return (
    <div className="space-y-3 rounded-panel border border-border bg-card p-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="matchId" value={matchId} />
        <div className="min-w-0 flex-1">
          <MediaPickerField name="coverMediaId" label="Foto do jogo" initialMedia={coverMedia} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar foto"}
        </Button>
      </form>

      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={coverUrl}
          src={coverUrl}
          alt="Prévia da capa do jogo"
          className="aspect-video w-full max-w-xl rounded-panel border border-border bg-muted object-cover"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`${coverUrl}&download=1`} download>
              <Download className="size-4" /> Baixar capa (1280×720)
            </a>
          </Button>
          {!coverVersion && <span className="text-xs text-muted-foreground">Sem foto: fundo com as cores dos times.</span>}
        </div>
      </div>
    </div>
  );
}
