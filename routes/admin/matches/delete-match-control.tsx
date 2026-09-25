"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@venore/plugin-sdk/ui";
import { deleteMatchAction, getMatchDeleteImpactAction } from "./actions";
import type { MatchDeleteImpact } from "../../../runtime/matches";

// Exclusão de súmula — mesmo padrão de confirmação com impacto de delete-team-control.tsx/
// delete-player-control.tsx, mas sem digitar nome pra confirmar (não há um "nome" natural de
// partida pra pedir de volta, e o placar no título do diálogo já serve de confirmação visual).
// Bloqueada só se a partida estiver em andamento (ver runtime/matches.ts deleteMatch).
export function DeleteMatchControl({ matchId, matchLabel }: { matchId: string; matchLabel: string }) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<MatchDeleteImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !impact && !loading) {
      setLoading(true);
      getMatchDeleteImpactAction(matchId)
        .then((result) => {
          if (result.ok) setImpact(result.data);
          else setLoadError(result.error);
        })
        .finally(() => setLoading(false));
    }
    if (!next) {
      setDeleteError(null);
    }
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteMatchAction(matchId);
      if (!result.ok) {
        setDeleteError(result.error ?? "Falha ao excluir.");
      }
    });
  }

  const blocked = Boolean(impact?.isLive);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" /> Excluir súmula
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {matchLabel}?</DialogTitle>
          <DialogDescription>
            {loading && "Verificando o que será afetado…"}
            {loadError && loadError}
            {impact && blocked && "Esta partida está em andamento — encerre ou cancele no controle ao vivo antes de excluir."}
            {impact && !blocked && (
              <>
                Isso apaga {impact.eventCount} evento{impact.eventCount === 1 ? "" : "s"} (gol/cartão/falta)
                {impact.boostCount > 0 ? ` e ${impact.boostCount} uso${impact.boostCount === 1 ? "" : "s"} de power play` : ""} desta
                partida, some da súmula/classificação/artilharia, e não pode ser desfeito.
                {impact.fixtureCount > 0
                  ? ` O confronto vinculado na tabela de jogos volta a ficar sem resultado (não é excluído).`
                  : ""}
                {impact.fanVoteCount > 0
                  ? ` Os ${impact.fanVoteCount} voto${impact.fanVoteCount === 1 ? "" : "s"} do Jogador da Torcida deste jogo também são apagados.`
                  : ""}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          {impact && !blocked && (
            <Button type="button" variant="destructive" size="sm" disabled={pending || loading} onClick={confirmDelete}>
              {pending ? "Excluindo…" : "Excluir definitivamente"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
