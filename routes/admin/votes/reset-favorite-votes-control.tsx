"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
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
import { resetFavoriteVotesAction } from "./actions";

// "Nova temporada" do Time favorito — apaga TODOS os votos (não é anulação: não dá pra restaurar).
// Mesmo padrão de confirmação de routes/admin/matches/delete-match-control.tsx.
export function ResetFavoriteVotesControl({ totalVotes }: { totalVotes: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmReset() {
    startTransition(async () => {
      const result = await resetFavoriteVotesAction();
      if (result.ok) {
        setOpen(false);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={totalVotes === 0}>
          <RotateCcw className="size-4" /> Zerar votos (nova temporada)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zerar a votação do Time favorito?</DialogTitle>
          <DialogDescription>
            Apaga os {totalVotes} voto{totalVotes === 1 ? "" : "s"} registrado{totalVotes === 1 ? "" : "s"} (inclusive os anulados) —
            todo aparelho volta a poder votar do zero. Não pode ser desfeito.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={confirmReset}>
            {pending ? "Zerando…" : "Zerar votos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
