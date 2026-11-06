import Link from "next/link";
import type { FixturePhase } from "../contracts/types";
import type { FixtureView } from "../runtime/bracket";
import { computeBracketTreeLayout, type BracketTreeNode } from "../shared/bracket-tree-layout";
import { matchWinner, shortLabel, sideResult } from "../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";
import { TeamCrest } from "./home/team-crest";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Unidades arbitrárias (não px, não %) só pra calcular proporção — convertidas pra % na hora de
// posicionar. BOX_W:BOX_H ~2.7:1 (card de confronto com duas linhas de time) é o que faz a chave
// parecer uma chave de verdade (estilo Copa do Mundo) em vez de quadrados genéricos.
const BOX_W = 1;
const ROW_UNIT_H = 0.5;
const BOX_H_RATIO = 0.74; // fração da "fatia" vertical de uma rodada que o card ocupa (resto é respiro)
const GAP_W = 0.55; // espaço entre colunas reservado pras linhas de conexão

function TeamRow({
  name,
  crestUrl,
  slug,
  score,
  color,
  won,
  lost,
  known,
}: {
  name: string;
  crestUrl: string | null;
  slug: string | null;
  score: number | null;
  color: string | null;
  won: boolean;
  lost: boolean;
  known: boolean;
}) {
  const row = (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${lost ? "opacity-55" : ""}`}
      style={won ? { background: `color-mix(in srgb, ${color ?? "var(--primary)"} 14%, transparent)` } : undefined}
    >
      {known ? (
        <TeamCrest name={name} crestUrl={crestUrl} className="size-4 shrink-0" />
      ) : (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[7px] font-bold uppercase text-muted-foreground">
          {shortLabel(name)}
        </span>
      )}
      <span className={`min-w-0 flex-1 truncate text-[11px] ${won ? "font-extrabold text-foreground" : "font-medium text-foreground/90"}`}>
        {name}
      </span>
      {score != null && (
        <span className={`shrink-0 text-[11px] tabular-nums ${won ? "font-extrabold" : "font-semibold text-muted-foreground"}`} style={won ? { color: color ?? "var(--primary)" } : undefined}>
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

function MatchBox({ node, left, top, width, height }: { node: BracketTreeNode<FixtureView>; left: number; top: number; width: number; height: number }) {
  const { fixture } = node;
  const winner = matchWinner(fixture);
  const color = winner?.color ?? "var(--primary)";

  return (
    <div
      className="absolute overflow-hidden rounded-md border border-border bg-card shadow-sm"
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
    >
      <TeamRow
        name={fixture.homeName}
        crestUrl={fixture.homeCrestUrl}
        slug={fixture.homeSlug}
        score={fixture.homeScore}
        color={color}
        won={winner?.side === "home"}
        lost={sideResult(fixture, "home") === "lost"}
        known={fixture.homeSlug != null}
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
      />
    </div>
  );
}

// Chave "espelhada" (estilo Copa do Mundo): metade dos confrontos converge pela esquerda, a outra
// metade pela direita, final sozinha no meio — geometria em shared/bracket-tree-layout.ts (reusada
// pela TV, routes/tv/bracket-tree-tv.tsx). Substitui a chave circular: discos de rodadas vizinhas
// ficavam visualmente grudados, e o formato quadrado desperdiçava a largura de uma tela de TV 16:9.
export function BracketTree({ knockout }: { knockout: Round[] }) {
  const layout = computeBracketTreeLayout(knockout);
  if (!layout.finalNode) {
    return <p className="text-sm text-muted-foreground">Chave ainda não definida.</p>;
  }

  const totalCols = layout.totalCols;
  const totalRows = layout.totalRows;
  const totalWidthUnits = (totalCols + 1) * BOX_W + totalCols * GAP_W;
  const xLeftUnits = (col: number) => col * (BOX_W + GAP_W);
  const toXPercent = (units: number) => (units / totalWidthUnits) * 100;
  const boxWidthPercent = toXPercent(BOX_W);
  const boxLeftEdge = (col: number) => toXPercent(xLeftUnits(col));
  const boxRightEdge = (col: number) => boxLeftEdge(col) + boxWidthPercent;

  // 10%/6% de margem no topo/base — espaço pro selo de fase de cada coluna não bater na primeira
  // linha de confrontos (perceptível em chaves com muitas rodadas, ex. oitavas de final).
  const TOP_MARGIN = 10;
  const BOTTOM_MARGIN = 6;
  const boxHeightPercent = (BOX_H_RATIO / totalRows) * (100 - TOP_MARGIN - BOTTOM_MARGIN);
  const yCenterPercent = (row: number) => TOP_MARGIN + (row / totalRows) * (100 - TOP_MARGIN - BOTTOM_MARGIN);
  const allNodes = [...layout.nodes, { fixture: layout.finalNode.fixture, side: "final" as const, round: 0, col: layout.finalNode.col, row: layout.finalNode.row }];

  const champion = sideResult(layout.finalNode.fixture, "home") === "won" ? layout.finalNode.fixture.homeName : sideResult(layout.finalNode.fixture, "away") === "won" ? layout.finalNode.fixture.awayName : null;
  const championColor = matchWinner(layout.finalNode.fixture)?.color ?? "var(--primary)";

  return (
    <div className="space-y-3 rounded-panel border border-border bg-card p-4 sm:p-6">
      <div
        className="relative mx-auto w-full"
        style={{
          aspectRatio: `${totalWidthUnits} / ${(totalRows * ROW_UNIT_H * 100) / (100 - TOP_MARGIN - BOTTOM_MARGIN)}`,
          maxWidth: `${Math.min(1400, (totalCols + 1) * 220)}px`,
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
          {layout.links.map((link) => {
            const fixture = layout.nodes.find((n) => n.fixture.id === link.id)?.fixture;
            const winner = fixture ? matchWinner(fixture) : null;
            const color = winner ? (winner.color ?? "var(--primary)") : null;
            const forward = link.x2 > link.x1;
            const startX = forward ? boxRightEdge(link.x1) : boxLeftEdge(link.x1);
            const endX = forward ? boxLeftEdge(link.x2) : boxRightEdge(link.x2);
            const startY = yCenterPercent(link.y1);
            const endY = yCenterPercent(link.y2);
            const midX = (startX + endX) / 2;
            return (
              <path
                key={link.id}
                d={`M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`}
                fill="none"
                stroke={color ?? "var(--border)"}
                strokeWidth={color ? 0.6 : 0.35}
                strokeLinecap="round"
                opacity={color ? 0.9 : 1}
              />
            );
          })}
        </svg>

        {layout.columnPhases.map(({ col, phase }) => (
          <span
            key={`${col}-${phase}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-muted-foreground shadow-sm"
            style={{ left: `${(boxLeftEdge(col) + boxRightEdge(col)) / 2}%`, top: "2%" }}
          >
            {FIXTURE_PHASE_LABEL[phase]}
          </span>
        ))}

        {allNodes.map((node) => (
          <MatchBox
            key={node.fixture.id}
            node={node}
            left={boxLeftEdge(node.col)}
            top={yCenterPercent(node.row) - boxHeightPercent / 2}
            width={boxWidthPercent}
            height={boxHeightPercent}
          />
        ))}

        <span
          className="absolute -translate-x-1/2 text-[8px] font-extrabold uppercase tracking-wide text-primary"
          style={{ left: `${(boxLeftEdge(layout.finalNode.col) + boxRightEdge(layout.finalNode.col)) / 2}%`, top: "2%" }}
        >
          Final
        </span>

        {champion && (
          <div
            className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-md"
            style={{
              left: `${(boxLeftEdge(layout.finalNode.col) + boxRightEdge(layout.finalNode.col)) / 2}%`,
              top: `${yCenterPercent(layout.finalNode.row) + boxHeightPercent / 2 + 6}%`,
              background: championColor,
            }}
          >
            🏆 {champion}
          </div>
        )}
      </div>
    </div>
  );
}
