import Link from "next/link";
import type { FixturePhase } from "../contracts/types";
import type { FixtureView } from "../runtime/bracket";
import { matchWinner, shortLabel, sideResult } from "../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";
import { TeamCrest } from "./home/team-crest";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

function TeamRow({
  name,
  crestUrl,
  slug,
  score,
  color,
  won,
  lost,
  known,
  big,
}: {
  name: string;
  crestUrl: string | null;
  slug: string | null;
  score: number | null;
  color: string | null;
  won: boolean;
  lost: boolean;
  known: boolean;
  big: boolean;
}) {
  const row = (
    <div
      className={`flex items-center gap-3 px-4 ${big ? "py-4" : "py-3"} ${lost ? "opacity-55" : ""}`}
      style={{ background: won ? `color-mix(in srgb, ${color ?? "var(--primary)"} 14%, transparent)` : undefined }}
    >
      {known ? (
        <TeamCrest name={name} crestUrl={crestUrl} className={`shrink-0 ${big ? "size-16" : "size-12"}`} />
      ) : (
        <span
          className={`flex shrink-0 items-center justify-center rounded-full bg-muted font-bold uppercase text-muted-foreground ${big ? "size-16 text-base" : "size-12 text-sm"}`}
        >
          {shortLabel(name)}
        </span>
      )}
      <span className={`min-w-0 flex-1 truncate font-bold ${big ? "text-lg" : "text-base"} ${won ? "text-foreground" : "text-foreground/80"}`}>
        {name}
      </span>
      {score != null && (
        <span
          className={`shrink-0 font-extrabold tabular-nums ${big ? "text-2xl" : "text-xl"}`}
          style={{ color: won ? (color ?? "var(--primary)") : "var(--muted-foreground)" }}
        >
          {formatScore(score)}
        </span>
      )}
    </div>
  );

  return slug ? (
    <Link href={`/erasto-league/teams/${slug}`} className="block hover:bg-muted/40">
      {row}
    </Link>
  ) : (
    row
  );
}

function MatchCard({ fixture, big = false }: { fixture: FixtureView; big?: boolean }) {
  const winner = matchWinner(fixture);
  const color = winner?.color ?? "var(--primary)";

  return (
    <div className={`overflow-hidden rounded-panel border border-border bg-card shadow-sm ${big ? "border-2 shadow-md" : ""}`}>
      <TeamRow
        name={fixture.homeName}
        crestUrl={fixture.homeCrestUrl}
        slug={fixture.homeSlug}
        score={fixture.homeScore}
        color={color}
        won={winner?.side === "home"}
        lost={sideResult(fixture, "home") === "lost"}
        known={fixture.homeSlug != null}
        big={big}
      />
      <div className="border-t border-border" />
      <TeamRow
        name={fixture.awayName}
        crestUrl={fixture.awayCrestUrl}
        slug={fixture.awaySlug}
        score={fixture.awayScore}
        color={color}
        won={winner?.side === "away"}
        lost={sideResult(fixture, "away") === "lost"}
        known={fixture.awaySlug != null}
        big={big}
      />
    </div>
  );
}

// Chave em lista por rodada — cada fase (quartas, semifinal, final) vira uma seção com os cards de
// confronto num grid responsivo, final em destaque sozinha no fim. Substitui a chave "espelhada" em
// árvore (linhas conectando os confrontos): com 5 colunas lado a lado, a largura real disponível
// (coluna da home, ~1100px no máximo — ver blocks/home-block.tsx) não dava pra manter brasão e texto
// grandes sem encolher tudo ou precisar de rolagem horizontal, as duas coisas pedidas pra evitar.
// Em lista, cada card usa a largura que o grid reflui naturalmente (1 coluna no celular, mais
// colunas conforme cabe) — sem rolagem, sem encolher abaixo do confortável.
export function BracketTree({ knockout }: { knockout: Round[] }) {
  const rounds = knockout
    .filter((round) => round.phase !== "final")
    .map((round) => ({ phase: round.phase, fixtures: [...round.fixtures].sort((a, b) => a.sortOrder - b.sortOrder) }));
  const finalFixture = knockout.find((round) => round.phase === "final")?.fixtures[0] ?? null;

  if (rounds.length === 0 && !finalFixture) {
    return <p className="text-sm text-muted-foreground">Chave ainda não definida.</p>;
  }

  return (
    <div className="space-y-8">
      {rounds.map((round) => (
        <section key={round.phase} className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{FIXTURE_PHASE_LABEL[round.phase]}</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {round.fixtures.map((fixture) => (
              <MatchCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      ))}

      {finalFixture && (
        <section className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-primary">🏆 Final</h3>
          <div className="mx-auto max-w-xl">
            <MatchCard fixture={finalFixture} big />
          </div>
        </section>
      )}
    </div>
  );
}
