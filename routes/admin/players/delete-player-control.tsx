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
import { deletePlayerAction, getPlayerDeleteImpactAction } from "./actions";
import type { PlayerDeleteImpact } from "../../../runtime/players";

// Exclusão segura: mostra o impacto (quantos eventos ficariam sem jogador atribuído) antes de
// confirmar. deletePlayerAction() nunca apaga eventos, só desatribui — ver runtime/players.ts.
export function DeletePlayerControl({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<PlayerDeleteImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !impact && !loading) {
      setLoading(true);
      getPlayerDeleteImpactAction(playerId)
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
      const result = await deletePlayerAction(playerId);
      if (!result.ok) {
        setDeleteError(result.error ?? "Falha ao excluir.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" /> Excluir jogador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {playerName}?</DialogTitle>
          <DialogDescription>
            {loading && "Verificando o que será afetado…"}
            {loadError && loadError}
            {impact &&
              (impact.eventCount > 0
                ? `Este jogador tem ${impact.eventCount} evento(s) (gol/cartão/falta) registrado(s). Excluir NÃO apaga esses eventos nem mexe no placar das partidas — eles só ficam sem jogador atribuído (dá pra corrigir depois na súmula).`
                : "Este jogador não tem nenhum evento registrado — pode excluir sem afetar nenhuma partida.")}
          </DialogDescription>
        </DialogHeader>
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={pending || loading} onClick={confirmDelete}>
            {pending ? "Excluindo…" : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
