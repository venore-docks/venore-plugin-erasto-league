import Link from "next/link";
import type { FixturePhase } from "../contracts/types";
import type { FixtureView } from "../runtime/bracket";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";
import { TeamCrest } from "./home/team-crest";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Coordenadas em % do quadrado (0–100), centro em (50, 50). Rodadas iniciais nos anéis de fora,
// final no centro; cada confronto fica no ângulo do seu slot do anel, e o da rodada seguinte no
// ângulo médio dos dois que o alimentam — por isso o pareamento é por ordem (1+2 → 1º, 3+4 → 2º…).
const OUTER_RADIUS = 38;
const INNER_RADIUS = 22;
const SOLE_RING_RADIUS = 33;

function ringRadii(count: number): number[] {
  if (count === 1) return [SOLE_RING_RADIUS];
  return Array.from({ length: count }, (_, i) => OUTER_RADIUS - (i * (OUTER_RADIUS - INNER_RADIUS)) / (count - 1));
}

function angleOf(index: number, total: number): number {
  return -Math.PI / 2 + (2 * Math.PI * (index + 0.5)) / total;
}

// Sigla de quem ainda não é time ("P1", "T2"); rótulo longo ("Vencedor Grupo A") vira iniciais.
function shortLabel(name: string): string {
  const trimmed = name.trim();
  return trimmed.length <= 3 ? trimmed : trimmed.slice(0, 2);
}

function Slot({
  x,
  y,
  size,
  name,
  crestUrl,
  slug,
  score,
  won,
  known,
}: {
  x: number;
  y: number;
  size: number;
  name: string;
  crestUrl: string | null;
  slug: string | null;
  score: number | null;
  won: boolean;
  known: boolean;
}) {
  const disc = (
    <span
      title={name}
      className={`relative block size-full rounded-full ${won ? "ring-2 ring-primary" : "ring-1 ring-border"} bg-card`}
    >
      {known ? (
        <TeamCrest name={name} crestUrl={crestUrl} className="size-full" />
      ) : (
        <span className="flex size-full items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground sm:text-xs">
          {shortLabel(name)}
        </span>
      )}
      {score != null && (
        <span className="absolute -bottom-1 -right-1 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] font-extrabold leading-4 tabular-nums text-primary-foreground">
          {formatScore(score)}
        </span>
      )}
    </span>
  );

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%`, width: `${size}%`, aspectRatio: "1" }}>
      {slug ? (
        <Link href={`/erasto-league/teams/${slug}`} aria-label={name} className="block size-full">
          {disc}
        </Link>
      ) : (
        disc
      )}
    </div>
  );
}

function MatchSlots({ fixture, cx, cy, size, angle }: { fixture: FixtureView; cx: number; cy: number; size: number; angle: number }) {
  const homeWon = fixture.played && fixture.homeScore != null && fixture.awayScore != null && fixture.homeScore > fixture.awayScore;
  const awayWon = fixture.played && fixture.homeScore != null && fixture.awayScore != null && fixture.awayScore > fixture.homeScore;
  // Os dois times lado a lado na tangente do anel.
  const offset = size / 2 + 0.5;
  const dx = -Math.sin(angle) * offset;
  const dy = Math.cos(angle) * offset;

  return (
    <>
      <Slot
        x={cx - dx}
        y={cy - dy}
        size={size}
        name={fixture.homeName}
        crestUrl={fixture.homeCrestUrl}
        slug={fixture.homeSlug}
        score={fixture.homeScore}
        won={homeWon}
        known={fixture.homeSlug != null}
      />
      <Slot
        x={cx + dx}
        y={cy + dy}
        size={size}
        name={fixture.awayName}
        crestUrl={fixture.awayCrestUrl}
        slug={fixture.awaySlug}
        score={fixture.awayScore}
        won={awayWon}
        known={fixture.awaySlug != null}
      />
    </>
  );
}

// Chave circular 1:1 (sem rolagem lateral): as rodadas iniciais nos anéis de fora, a final no
// centro. O pareamento segue o campo "Ordem" dos confrontos (sortOrder).
export function BracketCircle({ knockout }: { knockout: Round[] }) {
  const rounds = knockout.map(({ phase, fixtures }) => ({
    phase,
    fixtures: [...fixtures].sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  const ringRounds = rounds.filter((round) => round.phase !== "final");
  const finalFixture = rounds.find((round) => round.phase === "final")?.fixtures[0] ?? null;
  const radii = ringRadii(ringRounds.length);

  const nodes = ringRounds.map((round, ring) => {
    const total = round.fixtures.length;
    const radius = radii[ring];
    const size = Math.min(10, Math.max(5, (2 * Math.PI * radius) / total / 2.5));
    return round.fixtures.map((fixture, index) => {
      const angle = angleOf(index, total);
      return { fixture, angle, size, cx: 50 + radius * Math.cos(angle), cy: 50 + radius * Math.sin(angle) };
    });
  });

  // Linha de cada confronto até o da rodada seguinte (ou ao centro, antes da final).
  const links = nodes.flatMap((ringNodes, ring) =>
    ringNodes.flatMap((node, index) => {
      const next = nodes[ring + 1];
      if (!next) return [];
      const target = next[Math.min(next.length - 1, Math.floor((index * next.length) / ringNodes.length))];
      return [{ id: node.fixture.id, x1: node.cx, y1: node.cy, x2: target.cx, y2: target.cy }];
    }),
  );

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-2xl">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
          {radii.map((radius) => (
            <circle key={radius} cx="50" cy="50" r={radius} fill="none" className="stroke-border" strokeWidth="0.3" strokeDasharray="1 1" />
          ))}
          {links.map((link) => (
            <line key={link.id} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} className="stroke-border" strokeWidth="0.5" />
          ))}
        </svg>

        {nodes.flat().map((node) => (
          <MatchSlots key={node.fixture.id} fixture={node.fixture} cx={node.cx} cy={node.cy} size={node.size} angle={node.angle} />
        ))}

        {finalFixture && <MatchSlots fixture={finalFixture} cx={50} cy={50} size={11} angle={-Math.PI / 2} />}
        <span className="absolute left-1/2 top-[59%] -translate-x-1/2 text-[10px] font-extrabold uppercase tracking-wide text-primary">Final</span>
      </div>

      <p className="text-center text-xs text-balance text-muted-foreground">
        De fora para o centro: {[...ringRounds.map((round) => FIXTURE_PHASE_LABEL[round.phase]), ...(finalFixture ? ["Final"] : [])].join(" → ")}
      </p>
    </div>
  );
}
