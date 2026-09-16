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
  Input,
} from "@venore/plugin-sdk/ui";
import { deleteTeamAction, getTeamDeleteImpactAction } from "./actions";
import type { TeamDeleteImpact } from "../../../runtime/teams";

// Exclusão segura: bloqueada de verdade (sem burlar) se o time tem qualquer partida — ver
// runtime/teams.ts deleteTeam. Quando permitido, exige digitar o nome do time pra confirmar,
// porque isso apaga os jogadores do time junto (sempre seguro nesse caso: time sem partida ->
// jogadores sem evento, ver comentário em deleteTeam).
export function DeleteTeamControl({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<TeamDeleteImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !impact && !loading) {
      setLoading(true);
      getTeamDeleteImpactAction(teamId)
        .then((result) => {
          if (result.ok) setImpact(result.data);
          else setLoadError(result.error);
        })
        .finally(() => setLoading(false));
    }
    if (!next) {
      setDeleteError(null);
      setConfirmInput("");
    }
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteTeamAction(teamId);
      if (!result.ok) {
        setDeleteError(result.error ?? "Falha ao excluir.");
      }
    });
  }

  const blocked = Boolean(impact && impact.matchCount > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" /> Excluir time
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {teamName}?</DialogTitle>
          <DialogDescription>
            {loading && "Verificando o que será afetado…"}
            {loadError && loadError}
            {impact && blocked && (
              <>
                Este time tem {impact.matchCount} partida{impact.matchCount === 1 ? "" : "s"} registrada
                {impact.matchCount === 1 ? "" : "s"} — excluir apagaria esse histórico da súmula e da classificação.
                Não é permitido.
              </>
            )}
            {impact && !blocked && (
              <>
                Este time não tem nenhuma partida registrada.{" "}
                {impact.playerCount > 0
                  ? `Os ${impact.playerCount} jogador${impact.playerCount === 1 ? "" : "es"} cadastrados nele também serão excluídos.`
                  : "Não tem jogadores cadastrados."}{" "}
                Isso não pode ser desfeito.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {impact && !blocked && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Digite <span className="font-semibold">{teamName}</span> pra confirmar
            </label>
            <Input value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} autoComplete="off" />
          </div>
        )}

        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          {impact && !blocked && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending || loading || confirmInput.trim() !== teamName}
              onClick={confirmDelete}
            >
              {pending ? "Excluindo…" : "Excluir definitivamente"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
