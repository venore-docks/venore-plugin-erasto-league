"use client";

import { useState, useTransition } from "react";
import { Button } from "@venore/plugin-sdk/ui";
import { autoLinkFixturesAction } from "./actions";

// Não usa useActionState/useActionToast (padrão do resto do admin) porque não é uma <form>: o
// resultado é {linked, skipped}, não {error} — vira uma mensagem inline embaixo do botão, não um
// toast de erro. Ver runtime/fixtures.ts autoLinkAllFixtures pro critério de vínculo.
export function AutoLinkFixturesButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await autoLinkFixturesAction();
            setMessage(
              result.linked > 0
                ? `${result.linked} confronto${result.linked === 1 ? "" : "s"} vinculado${result.linked === 1 ? "" : "s"} automaticamente${
                    result.skipped > 0 ? ` (${result.skipped} continua${result.skipped === 1 ? "" : "m"} pendente, escolha manual)` : ""
                  }.`
                : "Nenhum confronto novo pra vincular — os pendentes precisam de escolha manual (mais de uma partida candidata, ou time não bate).",
            );
          });
        }}
      >
        {pending ? "Vinculando…" : "Vincular automaticamente"}
      </Button>
      {message && <p className="max-w-xs text-right text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
