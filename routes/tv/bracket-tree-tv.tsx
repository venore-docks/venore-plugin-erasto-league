import type { FixturePhase } from "../../contracts/types";
import type { FixtureView } from "../../runtime/bracket";
import { computeBracketTreeLayout, type BracketTreeNode } from "../../shared/bracket-tree-layout";
import { matchWinner, shortLabel, sideResult } from "../../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../../shared/fixture-phase";
import { formatScore } from "../../shared/score";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Mesmas unidades abstratas de blocks/bracket-tree.tsx (site) — só a conversão final pra px muda
// (lá é %, aqui é px fixo do palco, ver shared/tv-stage.ts). BOX_W:BOX_H ~2.7:1 é o que faz o card
// de confronto (duas linhas de time empilhadas) parecer um card de chave de verdade.
const BOX_W = 1;
const ROW_UNIT_H = 0.5;
const BOX_H_RATIO = 0.74;
const GAP_W = 0.55;
const TOP_MARGIN = 10; // % do espaço vertical reservado pro selo de fase de cada coluna
const BOTTOM_MARGIN = 6;

function winnerColor(fixture: FixtureView): string | null {
  const winner = matchWinner(fixture);
  return winner ? (winner.color ?? "var(--accent, #22c55e)") : null;
}

function TeamRow({
  name,
  crestUrl,
  score,
  color,
  won,
  lost,
  known,
  rowHeightPx,
}: {
  name: string;
  crestUrl: string | null;
  score: number | null;
  color: string | null;
  won: boolean;
  lost: boolean;
  known: boolean;
  rowHeightPx: number;
}) {
  return (
    <div
      className={`el-tv-tree-row ${lost ? "el-tv-tree-row-lost" : ""}`}
      style={{ height: rowHeightPx, background: won ? `color-mix(in srgb, ${color ?? "var(--accent, #22c55e)"} 20%, transparent)` : undefined }}
    >
      {known && crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="el-tv-tree-crest" src={crestUrl} alt="" style={{ width: rowHeightPx * 0.72, height: rowHeightPx * 0.72 }} />
      ) : (
        <span className="el-tv-tree-crest-mono" style={{ width: rowHeightPx * 0.72, height: rowHeightPx * 0.72, fontSize: rowHeightPx * 0.3 }}>
          {known ? name.slice(0, 2).toUpperCase() : shortLabel(name)}
        </span>
      )}
      <span className={`el-tv-tree-name ${won ? "el-tv-tree-name-won" : ""}`} style={{ fontSize: rowHeightPx * 0.38 }}>
        {name}
      </span>
      {score != null && (
        <span
          className="el-tv-tree-score"
          style={{ fontSize: rowHeightPx * 0.4, color: won ? (color ?? "var(--accent, #22c55e)") : undefined }}
        >
          {formatScore(score)}
        </span>
      )}
    </div>
  );
}

function MatchBox({
  node,
  left,
  top,
  width,
  height,
}: {
  node: BracketTreeNode<FixtureView>;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const { fixture } = node;
  const color = winnerColor(fixture);
  const rowHeight = height / 2;

  return (
    <div className="el-tv-tree-box" style={{ left, top, width, height }}>
      <TeamRow
        name={fixture.homeName}
        crestUrl={fixture.homeCrestUrl}
        score={fixture.homeScore}
        color={color}
        won={sideResult(fixture, "home") === "won"}
        lost={sideResult(fixture, "home") === "lost"}
        known={fixture.homeSlug != null}
        rowHeightPx={rowHeight}
      />
      <div className="el-tv-tree-sep" />
      <TeamRow
        name={fixture.awayName}
        crestUrl={fixture.awayCrestUrl}
        score={fixture.awayScore}
        color={color}
        won={sideResult(fixture, "away") === "won"}
        lost={sideResult(fixture, "away") === "lost"}
        known={fixture.awaySlug != null}
        rowHeightPx={rowHeight}
      />
    </div>
  );
}

// Versão pra TV/projetor da mesma chave espelhada do site (blocks/bracket-tree.tsx) — mesma
// geometria (shared/bracket-tree-layout.ts), só que em px fixos do palco (CSS própria, sem
// Tailwind — ver cabeçalho de routes/tv/tv-canvas.tsx) em vez de % + classes do tema. Ocupa a
// largura inteira disponível (16:9 já é larga, diferente do quadrado forçado da chave circular
// anterior).
export function BracketTreeTv({ knockout, maxWidthPx, maxHeightPx }: { knockout: Round[]; maxWidthPx: number; maxHeightPx: number }) {
  const layout = computeBracketTreeLayout(knockout);
  if (!layout.finalNode) {
    return <p className="el-tv-empty">Chave ainda não definida.</p>;
  }

  const { totalCols, totalRows } = layout;
  const totalWidthUnits = (totalCols + 1) * BOX_W + totalCols * GAP_W;
  const totalHeightUnits = (totalRows * ROW_UNIT_H * 100) / (100 - TOP_MARGIN - BOTTOM_MARGIN);
  // "Contain fit": a maior escala que cabe inteira no espaço disponível, com um piso de 90px por
  // unidade (BOX_W) pra não virar ilegível numa chave com muitas rodadas (oitavas de final) — aí
  // prefere vazar um pouco da borda a virar sopa de letrinhas.
  const scale = Math.max(90, Math.min(maxWidthPx / totalWidthUnits, maxHeightPx / totalHeightUnits));
  const boardWidthPx = totalWidthUnits * scale;
  const boardHeightPx = totalHeightUnits * scale;

  const xLeftUnits = (col: number) => col * (BOX_W + GAP_W);
  const toXPx = (units: number) => units * scale;
  const boxWidthPx = toXPx(BOX_W);
  const boxLeftEdge = (col: number) => toXPx(xLeftUnits(col));
  const boxRightEdge = (col: number) => boxLeftEdge(col) + boxWidthPx;

  const boxHeightPx = (BOX_H_RATIO / totalRows) * (boardHeightPx * (1 - (TOP_MARGIN + BOTTOM_MARGIN) / 100));
  const yTopPx = (boardHeightPx * TOP_MARGIN) / 100;
  const yUsablePx = boardHeightPx * (1 - (TOP_MARGIN + BOTTOM_MARGIN) / 100);
  const yCenterPx = (row: number) => yTopPx + (row / totalRows) * yUsablePx;

  const fixtureById = new Map(layout.nodes.map((node) => [node.fixture.id, node.fixture]));
  const allNodes = [...layout.nodes, { fixture: layout.finalNode.fixture, side: "final" as const, round: 0, col: layout.finalNode.col, row: layout.finalNode.row }];

  const champion =
    sideResult(layout.finalNode.fixture, "home") === "won"
      ? layout.finalNode.fixture.homeName
      : sideResult(layout.finalNode.fixture, "away") === "won"
        ? layout.finalNode.fixture.awayName
        : null;
  const championColor = winnerColor(layout.finalNode.fixture) ?? "var(--accent, #22c55e)";

  return (
    <div className="el-tv-tree-wrap">
      <div className="el-tv-tree-board" style={{ width: boardWidthPx, height: boardHeightPx }}>
        <svg width={boardWidthPx} height={boardHeightPx} className="el-tv-tree-svg" aria-hidden="true">
          {layout.links.map((link) => {
            const fixture = fixtureById.get(link.id);
            const color = fixture ? winnerColor(fixture) : null;
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
                stroke={color ?? "rgba(255,255,255,0.18)"}
                strokeWidth={color ? 3 : 2}
                strokeLinecap="round"
                opacity={color ? 0.9 : 1}
              />
            );
          })}
        </svg>

        {layout.columnPhases.map(({ col, phase }) => (
          <span
            key={`${col}-${phase}`}
            className="el-tv-tree-phase"
            style={{ left: (boxLeftEdge(col) + boxRightEdge(col)) / 2, top: (boardHeightPx * TOP_MARGIN) / 100 / 2 }}
          >
            {FIXTURE_PHASE_LABEL[phase]}
          </span>
        ))}

        {allNodes.map((node) => (
          <MatchBox
            key={node.fixture.id}
            node={node}
            left={boxLeftEdge(node.col)}
            top={yCenterPx(node.row) - boxHeightPx / 2}
            width={boxWidthPx}
            height={boxHeightPx}
          />
        ))}

        <span
          className="el-tv-tree-final-label"
          style={{ left: (boxLeftEdge(layout.finalNode.col) + boxRightEdge(layout.finalNode.col)) / 2, top: (boardHeightPx * TOP_MARGIN) / 100 / 2 }}
        >
          Final
        </span>

        {champion && (
          <div
            className="el-tv-tree-champion"
            style={{
              left: (boxLeftEdge(layout.finalNode.col) + boxRightEdge(layout.finalNode.col)) / 2,
              top: yCenterPx(layout.finalNode.row) + boxHeightPx / 2 + 14,
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
