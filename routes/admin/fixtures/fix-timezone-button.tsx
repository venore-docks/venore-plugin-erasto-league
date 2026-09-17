"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button, useActionToast } from "@venore/plugin-sdk/ui";
import { fixScheduledAtTimezoneAction } from "./actions";

// Botão só-uso-único: soma 3h em todo horário já gravado antes do fix de fuso (ver
// runtime/fixtures.ts shiftAllScheduledAtBy3Hours). Remover depois de usado uma vez — não é uma
// função permanente da tela.
export function FixTimezoneButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useActionToast({ pending, error, successMessage });

  async function run() {
    if (!window.confirm("Somar 3h em TODOS os horários já gravados? Use só uma vez (bug de fuso corrigido em versões novas).")) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await fixScheduledAtTimezoneAction();
    setSuccessMessage(result.ok ? `${result.count} confronto(s) corrigido(s).` : null);
    setError(result.ok ? null : "Falha ao corrigir.");
    setPending(false);
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={run}>
      <Clock className="size-4" /> Corrigir fuso (+3h, uma vez)
    </Button>
  );
}
