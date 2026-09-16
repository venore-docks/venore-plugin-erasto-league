import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getBracketView, type FixtureView } from "../runtime/bracket";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function formatFixtureDate(epochMs: number | null): string | null {
  if (!epochMs) return null;
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function TeamRow({ name, crestUrl, slug, score, won }: { name: string; crestUrl: string | null; slug: string | null; score: number | null; won: boolean }) {
  const content = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crestUrl} alt="" className="size-5 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[8px] font-bold text-muted-foreground">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className={`truncate text-sm ${won ? "font-bold text-foreground" : "text-foreground"}`}>{name}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 py-1">
      {slug ? (
        <Link href={`/ext/erasto-league/teams/${slug}`} className="flex min-w-0 flex-1 hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
      {score != null && <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{formatScore(score)}</span>}
    </div>
  );
}

function FixtureCard({ fixture }: { fixture: FixtureView }) {
  const date = formatFixtureDate(fixture.scheduledAt);
  const homeWon = fixture.played && fixture.homeScore != null && fixture.awayScore != null && fixture.homeScore > fixture.awayScore;
  const awayWon = fixture.played && fixture.homeScore != null && fixture.awayScore != null && fixture.awayScore > fixture.homeScore;

  return (
    <div className="w-full rounded-panel border border-border bg-card p-3">
      <TeamRow name={fixture.homeName} crestUrl={fixture.homeCrestUrl} slug={fixture.homeSlug} score={fixture.homeScore} won={homeWon} />
      <div className="border-t border-border/60" />
      <TeamRow name={fixture.awayName} crestUrl={fixture.awayCrestUrl} slug={fixture.awaySlug} score={fixture.awayScore} won={awayWon} />
      {!fixture.played && (
        <p className="mt-2 text-center text-xs text-muted-foreground">{date ? `${date}${fixture.roundLabel ? ` · ${fixture.roundLabel}` : ""}` : "Data a definir"}</p>
      )}
    </div>
  );
}

// Fases do campeonato — grupos (mini-classificação + jogos) e eliminatórias (quartas/semi/final),
// sempre recalculado na hora de renderizar (runtime/bracket.ts).
export async function ErastoLeagueBracketBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Fases do campeonato");
  const view = await getBracketView();

  if (view.groups.length === 0 && view.knockout.length === 0) {
    return <p className="text-sm text-muted-foreground">Tabela de jogos ainda não importada.</p>;
  }

  return (
    <div className="space-y-8">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {view.groups.length > 0 && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
          {view.groups.map((group) => (
            <div key={group.name} className="space-y-3 rounded-panel border border-border bg-card p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Grupo {group.name}</h3>

              {group.standings.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="pb-1 text-left font-medium">Time</th>
                      <th className="pb-1 text-center font-medium">J</th>
                      <th className="pb-1 text-center font-medium">SG</th>
                      <th className="pb-1 text-center font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((row) => (
                      <tr key={row.teamId} className="border-t border-border/60">
                        <td className="max-w-0 truncate py-1 pr-2 text-foreground">{row.name}</td>
                        <td className="py-1 text-center text-muted-foreground">{row.played}</td>
                        <td className="py-1 text-center text-muted-foreground">{row.goalsFor - row.goalsAgainst}</td>
                        <td className="py-1 text-center font-bold text-foreground">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="space-y-1.5 border-t border-border pt-2">
                {group.fixtures.map((fixture) => (
                  <div key={fixture.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-foreground">
                      {fixture.homeName} <span className="text-muted-foreground">×</span> {fixture.awayName}
                    </span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {fixture.played ? `${formatScore(fixture.homeScore ?? 0)}-${formatScore(fixture.awayScore ?? 0)}` : formatFixtureDate(fixture.scheduledAt) ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view.knockout.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-6">
            {view.knockout.map(({ phase, fixtures }) => (
              <div key={phase} className="flex w-56 flex-col justify-around gap-4">
                <h3 className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">{FIXTURE_PHASE_LABEL[phase]}</h3>
                <div className="flex flex-1 flex-col justify-around gap-4">
                  {fixtures.map((fixture) => (
                    <FixtureCard key={fixture.id} fixture={fixture} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
