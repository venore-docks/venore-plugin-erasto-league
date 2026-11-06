"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { FixturePhase } from "../contracts/types";
import type { FixtureView } from "../runtime/bracket";
import { computeBracketTreeLayout, type BracketTreeNode } from "../shared/bracket-tree-layout";
import { matchWinner, shortLabel, sideResult } from "../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";
import { TeamCrest } from "./home/team-crest";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Unidades abstratas de largura (não px) — só a RELAÇÃO entre elas importa, convertidas pra px reais
// na hora de desenhar, a partir da largura MEDIDA do contêiner (useContainerWidth abaixo). Evita
// depender de `aspect-ratio` CSS + altura em % (o jeito antigo): numa coluna estreita, o cálculo de
// altura em % não dava pro card de confronto espaço suficiente pras duas linhas de time, e tudo
// ficava espremido/cortado.
const BOX_W = 1;
const GAP_W = 0.55; // espaço entre colunas reservado pras linhas de conexão
const BOX_ASPECT = 2.65; // largura:altura do card (duas linhas de time empilhadas)
const ROW_GAP_FACTOR = 1.38; // altura do "slot" de uma linha (card + respiro) = altura do card × isso
// Menor largura de card antes de preferir rolagem horizontal a espremer tudo até virar sopa de
// letrinhas — numa coluna estreita (ex. home com barra lateral), é melhor rolar do que encolher.
// Sem piso de largura/rolagem de propósito (pedido explícito: responsivo na horizontal, sem
// scroll) — o card encolhe pra caber no contêiner, por mais estreito que seja; o nome do time só
// trunca (truncate) se não couber mesmo assim. MIN_BOX_PX é só uma rede de segurança absurda (um
// container praticamente do tamanho zero), não um alvo de design.
const MIN_BOX_PX = 70;
const MAX_BOX_PX = 260; // teto pra não virar card gigante num container muito largo (full-bleed)
const TOP_MARGIN_PX = 34;
const BOTTOM_MARGIN_PX = 46;

function useContainerWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

function TeamRow({
  name,
  crestUrl,
  slug,
  score,
  color,
  won,
  lost,
  known,
  heightPx,
}: {
  name: string;
  crestUrl: string | null;
  slug: string | null;
  score: number | null;
  color: string | null;
  won: boolean;
  lost: boolean;
  known: boolean;
  heightPx: number;
}) {
  const row = (
    <div
      className={`flex min-w-0 items-center gap-1.5 px-2 ${lost ? "opacity-55" : ""}`}
      style={{ height: heightPx, background: won ? `color-mix(in srgb, ${color ?? "var(--primary)"} 14%, transparent)` : undefined }}
    >
      {known ? (
        <span className="block shrink-0" style={{ width: heightPx * 0.62, height: heightPx * 0.62 }}>
          <TeamCrest name={name} crestUrl={crestUrl} className="size-full" />
        </span>
      ) : (
        <span
          className="flex shrink-0 items-center justify-center rounded-full bg-muted font-bold uppercase text-muted-foreground"
          style={{ width: heightPx * 0.62, height: heightPx * 0.62, fontSize: heightPx * 0.3 }}
        >
          {shortLabel(name)}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate ${won ? "font-extrabold text-foreground" : "font-medium text-foreground/90"}`}
        style={{ fontSize: Math.max(10, heightPx * 0.4) }}
      >
        {name}
      </span>
      {score != null && (
        <span
          className={`shrink-0 tabular-nums ${won ? "font-extrabold" : "font-semibold text-muted-foreground"}`}
          style={{ fontSize: Math.max(10, heightPx * 0.42), color: won ? (color ?? "var(--primary)") : undefined }}
        >
          {formatScore(score)}
        </span>
      )}
    </div>
  );

  return slug ? (
    <Link href={`/erasto-league/teams/${slug}`} className="block hover:bg-muted/40" style={{ height: heightPx }}>
      {row}
    </Link>
  ) : (
    row
  );
}

function MatchBox({
  node,
  left,
  top,
  width,
  rowHeight,
}: {
  node: BracketTreeNode<FixtureView>;
  left: number;
  top: number;
  width: number;
  rowHeight: number;
}) {
  const { fixture } = node;
  const winner = matchWinner(fixture);
  const color = winner?.color ?? "var(--primary)";

  return (
    <div
      className="absolute overflow-hidden rounded-md border border-border bg-card shadow-sm"
      style={{ left, top, width, height: rowHeight * 2 }}
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
        heightPx={rowHeight}
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
        heightPx={rowHeight}
      />
    </div>
  );
}

// Chave "espelhada" (estilo Copa do Mundo): metade dos confrontos converge pela esquerda, a outra
// metade pela direita, final sozinha no meio — geometria em shared/bracket-tree-layout.ts (reusada
// pela TV, routes/tv/bracket-tree-tv.tsx). Medido em px reais a partir da largura do próprio
// contêiner (useContainerWidth), não % + aspect-ratio — dá pra garantir um tamanho mínimo legível
// de card e preferir rolagem horizontal a espremer tudo numa coluna estreita (ex. home, que divide
// espaço com a barra lateral).
export function BracketTree({ knockout }: { knockout: Round[] }) {
  const [containerRef, containerWidth] = useContainerWidth();
  const layout = computeBracketTreeLayout(knockout);

  if (!layout.finalNode) {
    return <p className="text-sm text-muted-foreground">Chave ainda não definida.</p>;
  }

  const { totalCols, totalRows, finalNode } = layout;
  const totalWidthUnits = (totalCols + 1) * BOX_W + totalCols * GAP_W;
  const naturalScale = containerWidth > 0 ? containerWidth / totalWidthUnits : 0;
  const scale = Math.min(MAX_BOX_PX, Math.max(MIN_BOX_PX, naturalScale || MIN_BOX_PX));

  const xLeftUnits = (col: number) => col * (BOX_W + GAP_W);
  const toXPx = (units: number) => units * scale;
  const boxWidthPx = toXPx(BOX_W);
  const boxLeftEdge = (col: number) => toXPx(xLeftUnits(col));
  const boxRightEdge = (col: number) => boxLeftEdge(col) + boxWidthPx;

  const boxHeightPx = boxWidthPx / BOX_ASPECT;
  const rowHeightPx = boxHeightPx / 2;
  const rowSlotPx = boxHeightPx * ROW_GAP_FACTOR;
  const boardWidthPx = totalWidthUnits * scale;
  const boardHeightPx = totalRows * rowSlotPx + TOP_MARGIN_PX + BOTTOM_MARGIN_PX;
  const yCenterPx = (row: number) => TOP_MARGIN_PX + row * rowSlotPx;

  const fixtureById = new Map(layout.nodes.map((node) => [node.fixture.id, node.fixture]));
  const champion =
    sideResult(finalNode.fixture, "home") === "won"
      ? finalNode.fixture.homeName
      : sideResult(finalNode.fixture, "away") === "won"
        ? finalNode.fixture.awayName
        : null;
  const championColor = matchWinner(finalNode.fixture)?.color ?? "var(--primary)";

  return (
    <div className="space-y-3 rounded-panel border border-border bg-card p-4 sm:p-6">
      <div ref={containerRef} className="w-full">
        <div className="relative mx-auto" style={{ width: boardWidthPx, height: boardHeightPx }}>
          <svg width={boardWidthPx} height={boardHeightPx} className="absolute inset-0" aria-hidden="true">
            {layout.links.map((link) => {
              const fixture = fixtureById.get(link.id);
              const winner = fixture ? matchWinner(fixture) : null;
              const color = winner ? (winner.color ?? "var(--primary)") : null;
              const forward = link.x2 > link.x1;
              const startX = forward ? boxRightEdge(link.x1) : boxLeftEdge(link.x1);
              const endX = forward ? boxLeftEdge(link.x2) : boxRightEdge(link.x2);
              const startY = yCenterPx(link.y1);
              const endY = yCenterPx(link.y2);
              const midX = (startX + endX) / 2;
              return (
                <path
                  key={link.id}
                  d={`M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`}
                  fill="none"
                  stroke={color ?? "var(--border)"}
                  strokeWidth={color ? 2.2 : 1.4}
                  strokeLinecap="round"
                  opacity={color ? 0.9 : 1}
                />
              );
            })}
          </svg>

          {layout.columnPhases.map(({ col, phase }) => (
            <span
              key={`${col}-${phase}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground shadow-sm"
              style={{ left: (boxLeftEdge(col) + boxRightEdge(col)) / 2, top: TOP_MARGIN_PX / 2 }}
            >
              {FIXTURE_PHASE_LABEL[phase]}
            </span>
          ))}

          {layout.nodes.map((node) => (
            <MatchBox key={node.fixture.id} node={node} left={boxLeftEdge(node.col)} top={yCenterPx(node.row) - boxHeightPx / 2} width={boxWidthPx} rowHeight={rowHeightPx} />
          ))}
          <MatchBox node={{ fixture: finalNode.fixture, side: "final", round: 0, col: finalNode.col, row: finalNode.row }} left={boxLeftEdge(finalNode.col)} top={yCenterPx(finalNode.row) - boxHeightPx / 2} width={boxWidthPx} rowHeight={rowHeightPx} />

          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-sm"
            style={{ left: (boxLeftEdge(finalNode.col) + boxRightEdge(finalNode.col)) / 2, top: TOP_MARGIN_PX / 2 }}
          >
            Final
          </span>

          {champion && (
            <div
              className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-md"
              style={{ left: (boxLeftEdge(finalNode.col) + boxRightEdge(finalNode.col)) / 2, top: yCenterPx(finalNode.row) + boxHeightPx / 2 + 10, background: championColor }}
            >
              🏆 {champion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
