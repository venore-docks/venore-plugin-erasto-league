import Link from "next/link";
import type { FixturePhase } from "../contracts/types";
import type { FixtureView } from "../runtime/bracket";
import { computeBracketCircleLayout, FINAL_NODE, pairOffset } from "../shared/bracket-circle-layout";
import { matchWinner, shortLabel, sideResult, type SideResult } from "../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";
import { TeamCrest } from "./home/team-crest";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Cor de quem avançou nesse confronto (pro traço até a rodada seguinte e o disco/placar brilharem) —
// null enquanto não decidido, "var(--primary)" (tema do site) como fallback pro time sem cor cadastrada.
function winnerColor(fixture: FixtureView): string | null {
  const winner = matchWinner(fixture);
  return winner ? (winner.color ?? "var(--primary)") : null;
}

function Slot({
  x,
  y,
  size,
  name,
  crestUrl,
  slug,
  score,
  color,
  result,
  known,
}: {
  x: number;
  y: number;
  size: number;
  name: string;
  crestUrl: string | null;
  slug: string | null;
  score: number | null;
  color: string | null;
  result: SideResult;
  known: boolean;
}) {
  const won = result === "won";
  const lost = result === "lost";
  const accent = color ?? "var(--primary)";

  const disc = (
    <span
      title={name}
      className={`relative block size-full rounded-full bg-card transition-opacity ${lost ? "opacity-55 grayscale-[35%]" : ""}`}
      style={{
        boxShadow: won
          ? `0 0 0 2px var(--card), 0 0 0 4px ${accent}, 0 3px 8px -3px ${accent}`
          : "0 0 0 1px var(--border)",
      }}
    >
      {known ? (
        <TeamCrest name={name} crestUrl={crestUrl} className="size-full" />
      ) : (
        <span className="flex size-full items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground sm:text-xs">
          {shortLabel(name)}
        </span>
      )}
      {score != null && (
        <span
          className="absolute -bottom-1 -right-1 min-w-4 rounded-full px-1 text-center text-[9px] font-extrabold leading-4 tabular-nums text-primary-foreground shadow-sm"
          style={{ background: won ? accent : "var(--muted-foreground)" }}
        >
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
  const { dx, dy } = pairOffset(angle, size);
  const color = winnerColor(fixture);

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
        color={color}
        result={sideResult(fixture, "home")}
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
        color={color}
        result={sideResult(fixture, "away")}
        known={fixture.awaySlug != null}
      />
    </>
  );
}

// Chave circular 1:1 (sem rolagem lateral): as rodadas iniciais nos anéis de fora, a final no
// centro — geometria em shared/bracket-circle-layout.ts (reusada pela tela de TV,
// routes/tv/bracket-circle-tv.tsx). Aqui só a casca visual: cores de time nos traços/discos de quem
// avançou, selo de fase no topo de cada anel, e o campeão em destaque quando a final sai decidida.
export function BracketCircle({ knockout }: { knockout: Round[] }) {
  const { rings, links, finalFixture } = computeBracketCircleLayout(knockout);
  const fixtureById = new Map(rings.flatMap((ring) => ring.nodes).map((node) => [node.fixture.id, node.fixture]));

  const finalWinner = finalFixture ? matchWinner(finalFixture) : null;
  const champion =
    finalFixture && finalWinner
      ? { name: finalWinner.side === "home" ? finalFixture.homeName : finalFixture.awayName, color: finalWinner.color }
      : null;
  const finalPair = finalFixture ? pairOffset(FINAL_NODE.angle, FINAL_NODE.size) : null;

  return (
    <div className="space-y-3 rounded-panel border border-border bg-card p-4 sm:p-6">
      <div className="relative mx-auto aspect-square w-full max-w-2xl">
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(55% 55% at 50% 48%, color-mix(in srgb, var(--primary) 9%, transparent), transparent 72%)" }}
          aria-hidden="true"
        />

        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <radialGradient id="erasto-bracket-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={champion?.color ?? "var(--primary)"} stopOpacity="0.22" />
              <stop offset="100%" stopColor={champion?.color ?? "var(--primary)"} stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="50" cy="50" r={FINAL_NODE.size + 6} fill="url(#erasto-bracket-core)" />

          {rings.map((ring) => (
            <circle
              key={ring.phase}
              cx="50"
              cy="50"
              r={ring.radius}
              fill="none"
              className="stroke-border"
              strokeWidth="0.3"
              strokeDasharray="1 1.4"
            />
          ))}

          {links.map((link) => {
            const color = winnerColor(fixtureById.get(link.id)!);
            return (
              <line
                key={link.id}
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
                stroke={color ?? "var(--border)"}
                strokeWidth={color ? 0.7 : 0.4}
                strokeLinecap="round"
                opacity={color ? 0.85 : 1}
              />
            );
          })}

          {rings.map((ring) =>
            ring.nodes.map((node) => {
              const { dx, dy } = pairOffset(node.angle, node.size);
              return (
                <line
                  key={`pair-${node.fixture.id}`}
                  x1={node.cx - dx}
                  y1={node.cy - dy}
                  x2={node.cx + dx}
                  y2={node.cy + dy}
                  className="stroke-border"
                  strokeWidth="0.3"
                />
              );
            }),
          )}

          {finalFixture && finalPair && (
            <line
              x1={FINAL_NODE.cx - finalPair.dx}
              y1={FINAL_NODE.cy - finalPair.dy}
              x2={FINAL_NODE.cx + finalPair.dx}
              y2={FINAL_NODE.cy + finalPair.dy}
              className="stroke-border"
              strokeWidth="0.3"
            />
          )}
        </svg>

        {rings.map((ring) => (
          <span
            key={ring.phase}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-muted-foreground shadow-sm sm:text-[9px]"
            style={{ left: "50%", top: `${50 - ring.radius}%` }}
          >
            {FIXTURE_PHASE_LABEL[ring.phase]}
          </span>
        ))}

        {rings.flatMap((ring) => ring.nodes).map((node) => (
          <MatchSlots key={node.fixture.id} fixture={node.fixture} cx={node.cx} cy={node.cy} size={node.size} angle={node.angle} />
        ))}

        {finalFixture && (
          <MatchSlots fixture={finalFixture} cx={FINAL_NODE.cx} cy={FINAL_NODE.cy} size={FINAL_NODE.size} angle={FINAL_NODE.angle} />
        )}

        <span
          className="absolute left-1/2 -translate-x-1/2 text-[9px] font-extrabold uppercase tracking-wide text-primary"
          style={{ top: `${FINAL_NODE.cy + FINAL_NODE.size / 2 + 4}%` }}
        >
          Final
        </span>

        {champion && (
          <div
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-md sm:text-xs"
            style={{ top: `${FINAL_NODE.cy + FINAL_NODE.size / 2 + 11}%`, background: champion.color ?? "var(--primary)" }}
          >
            🏆 Campeão: {champion.name}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-balance text-muted-foreground">
        De fora para o centro: {[...rings.map((ring) => FIXTURE_PHASE_LABEL[ring.phase]), ...(finalFixture ? ["Final"] : [])].join(" → ")}
      </p>
    </div>
  );
}
