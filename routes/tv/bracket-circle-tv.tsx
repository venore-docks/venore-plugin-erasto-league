import type { FixturePhase } from "../../contracts/types";
import type { FixtureView } from "../../runtime/bracket";
import { computeBracketCircleLayout, FINAL_NODE, pairOffset } from "../../shared/bracket-circle-layout";
import { matchWinner, shortLabel, sideResult, type SideResult } from "../../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../../shared/fixture-phase";
import { formatScore } from "../../shared/score";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Mesma filosofia de shared/tv-stage.ts: compor tudo contra um tamanho de referência fixo em CSS px
// (não %) e deixar o `transform: scale(...)` do palco inteiro (routes/tv/tv-canvas.tsx) cuidar de
// caber na tela real — assim dá pra cravar font-size/placar proporcional ao tamanho de cada disco
// sem medir nada em runtime (CSS % não carrega escala pra `font-size` dos filhos). `maxBoardPx`
// entra de fora porque só o tv-canvas sabe a altura real do palco (viewport pode não ser 16:9).
const DEFAULT_BOARD_PX = 760;
const MIN_BOARD_PX = 420;

function winnerColor(fixture: FixtureView): string | null {
  const winner = matchWinner(fixture);
  return winner ? (winner.color ?? "var(--accent, #22c55e)") : null;
}

function Slot({
  left,
  top,
  sizePx,
  name,
  crestUrl,
  score,
  color,
  result,
  known,
}: {
  left: number;
  top: number;
  sizePx: number;
  name: string;
  crestUrl: string | null;
  score: number | null;
  color: string | null;
  result: SideResult;
  known: boolean;
}) {
  const won = result === "won";
  const lost = result === "lost";
  const accent = color ?? "var(--accent, #22c55e)";

  return (
    <div className="el-tv-bracket-slot" style={{ left, top, width: sizePx, height: sizePx }}>
      <div
        className={`el-tv-bracket-disc ${lost ? "el-tv-bracket-disc-lost" : ""}`}
        style={{
          boxShadow: won
            ? `0 0 0 ${Math.max(2, sizePx * 0.035)}px #0a0d12, 0 0 0 ${Math.max(4, sizePx * 0.07)}px ${accent}, 0 ${sizePx * 0.12}px ${sizePx * 0.3}px -${sizePx * 0.08}px ${accent}`
            : "0 0 0 1px rgba(255,255,255,0.18)",
        }}
      >
        {known && crestUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="el-tv-bracket-crest" src={crestUrl} alt="" />
        ) : (
          <span className="el-tv-bracket-crest-mono" style={{ fontSize: sizePx * 0.3 }}>
            {known ? name.slice(0, 2).toUpperCase() : shortLabel(name)}
          </span>
        )}
        {score != null && (
          <span
            className="el-tv-bracket-score"
            style={{ background: won ? accent : "rgba(255,255,255,0.8)", fontSize: Math.max(11, sizePx * 0.22) }}
          >
            {formatScore(score)}
          </span>
        )}
      </div>
    </div>
  );
}

function MatchPair({
  fixture,
  cx,
  cy,
  angle,
  size,
  toPx,
}: {
  fixture: FixtureView;
  cx: number;
  cy: number;
  angle: number;
  // Em % (0–100, mesma unidade de computeBracketCircleLayout) — toPx converte tanto a posição
  // quanto o tamanho pro px fixo do tabuleiro (DEFAULT_BOARD_PX), então o deslocamento dos dois
  // discos (pairOffset) precisa ser calculado NESSA unidade antes de converter, não depois.
  size: number;
  toPx: (pct: number) => number;
}) {
  const { dx, dy } = pairOffset(angle, size);
  const color = winnerColor(fixture);
  const sizePx = toPx(size);

  return (
    <>
      <Slot
        left={toPx(cx - dx)}
        top={toPx(cy - dy)}
        sizePx={sizePx}
        name={fixture.homeName}
        crestUrl={fixture.homeCrestUrl}
        score={fixture.homeScore}
        color={color}
        result={sideResult(fixture, "home")}
        known={fixture.homeSlug != null}
      />
      <Slot
        left={toPx(cx + dx)}
        top={toPx(cy + dy)}
        sizePx={sizePx}
        name={fixture.awayName}
        crestUrl={fixture.awayCrestUrl}
        score={fixture.awayScore}
        color={color}
        result={sideResult(fixture, "away")}
        known={fixture.awaySlug != null}
      />
    </>
  );
}

// Versão pra TV/projetor da mesma chave circular do site (blocks/bracket-circle.tsx) — mesma
// geometria (shared/bracket-circle-layout.ts) e mesma leitura de vencedor/cor (shared/
// bracket-match-result.ts), só que em px fixos do palco (CSS própria, sem Tailwind — ver cabeçalho
// de routes/tv/tv-canvas.tsx) em vez de % + classes do tema.
export function BracketCircleTv({ knockout, maxBoardPx }: { knockout: Round[]; maxBoardPx?: number }) {
  const { rings, links, finalFixture } = computeBracketCircleLayout(knockout);
  const fixtureById = new Map(rings.flatMap((ring) => ring.nodes).map((node) => [node.fixture.id, node.fixture]));
  const boardPx = Math.max(MIN_BOARD_PX, Math.min(DEFAULT_BOARD_PX, maxBoardPx ?? DEFAULT_BOARD_PX));
  const toPx = (pct: number) => (pct / 100) * boardPx;

  const finalWinner = finalFixture ? matchWinner(finalFixture) : null;
  const champion =
    finalFixture && finalWinner
      ? { name: finalWinner.side === "home" ? finalFixture.homeName : finalFixture.awayName, color: finalWinner.color }
      : null;
  const finalPair = finalFixture ? pairOffset(FINAL_NODE.angle, FINAL_NODE.size) : null;

  return (
    <div className="el-tv-bracket-wrap">
      <div className="el-tv-bracket" style={{ width: boardPx, height: boardPx }}>
        <div
          className="el-tv-bracket-glow"
          style={{
            background: `radial-gradient(55% 55% at 50% 48%, color-mix(in srgb, ${champion?.color ?? "var(--accent, #22c55e)"} 18%, transparent), transparent 72%)`,
          }}
        />

        <svg viewBox="0 0 100 100" width={boardPx} height={boardPx} className="el-tv-bracket-svg" aria-hidden="true">
          {rings.map((ring) => (
            <circle
              key={ring.phase}
              cx="50"
              cy="50"
              r={ring.radius}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
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
                stroke={color ?? "rgba(255,255,255,0.18)"}
                strokeWidth={color ? 0.7 : 0.4}
                strokeLinecap="round"
                opacity={color ? 0.9 : 1}
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
                  stroke="rgba(255,255,255,0.14)"
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
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="0.3"
            />
          )}
        </svg>

        {rings.map((ring) => (
          <span key={ring.phase} className="el-tv-bracket-ring-label" style={{ left: toPx(50), top: toPx(50 - ring.radius) }}>
            {FIXTURE_PHASE_LABEL[ring.phase]}
          </span>
        ))}

        {rings.flatMap((ring) => ring.nodes).map((node) => (
          <MatchPair key={node.fixture.id} fixture={node.fixture} cx={node.cx} cy={node.cy} angle={node.angle} size={node.size} toPx={toPx} />
        ))}

        {finalFixture && (
          <MatchPair fixture={finalFixture} cx={FINAL_NODE.cx} cy={FINAL_NODE.cy} angle={FINAL_NODE.angle} size={FINAL_NODE.size} toPx={toPx} />
        )}

        <span className="el-tv-bracket-final-label" style={{ left: toPx(50), top: toPx(FINAL_NODE.cy + FINAL_NODE.size / 2 + 4) }}>
          Final
        </span>

        {champion && (
          <div
            className="el-tv-bracket-champion"
            style={{ left: toPx(50), top: toPx(FINAL_NODE.cy + FINAL_NODE.size / 2 + 12), background: champion.color ?? "var(--accent, #22c55e)" }}
          >
            🏆 Campeão: {champion.name}
          </div>
        )}
      </div>
    </div>
  );
}
