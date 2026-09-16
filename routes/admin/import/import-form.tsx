"use client";

import { useActionState } from "react";
import { Button } from "@venore/plugin-sdk/ui";
import type { CsvImportState } from "./actions";

const initialState: CsvImportState = { result: null, error: null };

export function CsvImportForm({
  action,
  title,
  description,
  columns,
  showReplaceAll,
}: {
  action: (prevState: CsvImportState, formData: FormData) => Promise<CsvImportState>;
  title: string;
  description: string;
  columns: string;
  showReplaceAll?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4 rounded-panel border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{columns}</p>
      </div>

      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
      />

      {showReplaceAll && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="replaceAll" className="rounded-sm" />
          Apagar todos os confrontos atuais antes de importar (substituir tudo)
        </label>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Importando…" : "Importar"}
      </Button>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.result && (
        <div className="rounded-md border border-border bg-background p-3 text-sm">
          <p className="font-medium text-foreground">
            {state.result.created} criado(s), {state.result.updated} atualizado(s)
            {state.result.errors.length > 0 && `, ${state.result.errors.length} erro(s)`}.
          </p>
          {state.result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-destructive">
              {state.result.errors.map((error, index) => (
                <li key={index}>
                  Linha {error.line}: {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
