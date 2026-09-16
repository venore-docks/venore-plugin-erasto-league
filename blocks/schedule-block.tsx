import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getScheduleView } from "../runtime/bracket";
import { ScheduleTabs } from "./schedule-tabs";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

// Agenda de jogos — TODOS os confrontos (grupos + eliminatórias), organizados em abas por rodada
// (blocks/schedule-tabs.tsx) em vez de uma lista/grade única — evita mostrar tudo de uma vez
// conforme o campeonato acumula jogos. Complementa o bloco de fases (que não mostra mais datas,
// ver bracket-block.tsx) e os últimos resultados (que só mostra o que já terminou) — este cobre
// passado e futuro juntos, sempre lido do banco na hora de renderizar.
export async function ErastoLeagueScheduleBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Agenda de jogos");
  const limit = readNumber(block.data, "limit", 0);
  const entries = await getScheduleView(limit > 0 ? limit : undefined);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Tabela de jogos ainda não importada.</p>;
  }

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}
      <ScheduleTabs entries={entries} />
    </div>
  );
}
