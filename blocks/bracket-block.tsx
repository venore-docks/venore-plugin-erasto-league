import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getBracketView } from "../runtime/bracket";
import { BracketCircle } from "./bracket-circle";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Fases do campeonato — grupos (mini-classificação + jogos) e eliminatórias (chave circular, final no centro),
// sempre recalculado na hora de renderizar (runtime/bracket.ts).
export async function ErastoLeagueBracketBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Fases do campeonato");
  const knockoutOnly = readString(block.data, "variant", "full") === "knockout";
  const view = await getBracketView();
  const groups = knockoutOnly ? [] : view.groups;

  if (groups.length === 0 && view.knockout.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {knockoutOnly ? "Chave ainda não definida." : "Tabela de jogos ainda não importada."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {groups.length > 0 && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
          {groups.map((group) => (
            <div key={group.name} className="space-y-3 rounded-panel border border-border bg-card p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Grupo {group.name}</h3>

              {group.standings.length > 0 && (
                <table className="w-full table-fixed text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="w-full pb-1 text-left font-medium">Time</th>
                      <th className="w-5 pb-1 text-center font-medium">J</th>
                      <th className="w-5 pb-1 text-center font-medium">SG</th>
                      <th className="w-5 pb-1 text-center font-medium" title="Cartões amarelos">
                        CA
                      </th>
                      <th className="w-5 pb-1 text-center font-medium" title="Cartões vermelhos">
                        CV
                      </th>
                      <th className="w-6 pb-1 text-center font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((row, index) => (
                      <tr key={row.teamId} className="border-t border-border/60">
                        <td className="py-1 pr-2 text-foreground">
                          <span className="mr-1.5 inline-block w-3 text-right text-[10px] font-bold tabular-nums text-muted-foreground">{index + 1}</span>
                          {row.name}
                        </td>
                        <td className="py-1 text-center text-muted-foreground">{row.played}</td>
                        <td className="py-1 text-center text-muted-foreground">{row.goalsFor - row.goalsAgainst}</td>
                        <td className="py-1 text-center text-warning">{row.yellowCards}</td>
                        <td className="py-1 text-center text-destructive">{row.redCards}</td>
                        <td className="py-1 text-center font-bold text-foreground">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {view.knockout.length > 0 && <BracketCircle knockout={view.knockout} />}
    </div>
  );
}
