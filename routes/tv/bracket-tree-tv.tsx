import type { CSSProperties } from "react";
import type { FixturePhase } from "../../contracts/types";
import type { FixtureView } from "../../runtime/bracket";
import { computeFunnelLayout } from "../../shared/bracket-funnel-layout";
import { matchWinner, shortLabel, sideResult } from "../../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../../shared/fixture-phase";
import { formatScore } from "../../shared/score";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Mesma chave em funil do site (blocks/bracket-tree.tsx), em px fixos do palco (CSS própria, sem
// Tailwind — ver cabeçalho de routes/tv/tv-canvas.tsx) em vez de %: a TV tem largura de referência
// fixa (1920px, shared/tv-stage.ts), então não precisa responsividade — só precisa caber sem
// rolagem, com espaçamento generoso entre rodadas pra dar pra ver as linhas (pedido explícito do
// usuário no esboço aprovado). O container nasce com largura/altura explícitas e o `.el-tv-tree-wrap`
// (flex center) cuida de centralizar tudo no espaço disponível do palco.
const CONTENT_WIDTH_PX = 1760;
const CARD_HEIGHT_PX = 170;
const FINAL_HEIGHT_PX = 190;
const CONNECTOR_HEIGHT_PX = 60;
const RIBBON_HEIGHT_PX = 50;
const RIBBON_GAP_PX = 20;
const TOP_PAD_PX = 10;
const BOTTOM_PAD_PX = 10;
const LABEL_OFFSET_PX = 32;
const GAP_PX = 32;

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
        <img className="el-tv-tree-crest" src={crestUrl} alt="" style={{ width: rowHeightPx * 0.74, height: rowHeightPx * 0.74 }} />
      ) : (
        <span className="el-tv-tree-crest-mono" style={{ width: rowHeightPx * 0.74, height: rowHeightPx * 0.74, fontSize: rowHeightPx * 0.3 }}>
          {known ? name.slice(0, 2).toUpperCase() : shortLabel(name)}
        </span>
      )}
      <span className={`el-tv-tree-name ${won ? "el-tv-tree-name-won" : ""}`} style={{ fontSize: rowHeightPx * 0.34 }}>
        {name}
      </span>
      {score != null && (
        <span
          className="el-tv-tree-score"
          style={{ fontSize: rowHeightPx * 0.38, color: won ? (color ?? "var(--accent, #22c55e)") : undefined }}
        >
          {formatScore(score)}
        </span>
      )}
    </div>
  );
}

function MatchCard({ fixture, rowHeightPx, style }: { fixture: FixtureView; rowHeightPx: number; style: CSSProperties }) {
  const color = winnerColor(fixture);
  return (
    <div className="el-tv-tree-card" style={style}>
      <TeamRow
        name={fixture.homeName}
        crestUrl={fixture.homeCrestUrl}
        score={fixture.homeScore}
        color={color}
        won={sideResult(fixture, "home") === "won"}
        lost={sideResult(fixture, "home") === "lost"}
        known={fixture.homeSlug != null}
        rowHeightPx={rowHeightPx}
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
        rowHeightPx={rowHeightPx}
      />
    </div>
  );
}

export function BracketTreeTv({ knockout }: { knockout: Round[] }) {
  const rounds = knockout.filter((round) => round.fixtures.length > 0);

  if (rounds.length === 0) {
    return <p className="el-tv-empty">Chave ainda não definida.</p>;
  }

  const topToBottom = rounds
    .slice()
    .reverse()
    .map((round) => ({
      phase: round.phase,
      fixtures: [...round.fixtures].sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  const { centers, children } = computeFunnelLayout(
    topToBottom.map((round) => round.fixtures.map((fixture) => ({ homeSlug: fixture.homeSlug, awaySlug: fixture.awaySlug }))),
  );

  const bottomCount = topToBottom[topToBottom.length - 1].fixtures.length;
  const cardWidthPx = (CONTENT_WIDTH_PX - GAP_PX * (bottomCount - 1)) / bottomCount;
  const finalWidthPx = Math.min(cardWidthPx * 1.5, 700);
  const xPixel = (column: number) => cardWidthPx / 2 + column * (cardWidthPx + GAP_PX);
  const widthOf = (roundIndex: number) => (roundIndex === 0 ? finalWidthPx : cardWidthPx);

  const finalFixture = topToBottom[0].fixtures[0] ?? null;
  const championWinner = finalFixture ? matchWinner(finalFixture) : null;
  const championName =
    championWinner && finalFixture ? (championWinner.side === "home" ? finalFixture.homeName : finalFixture.awayName) : null;
  const championColor = championWinner?.color ?? "var(--accent, #22c55e)";

  const roundTopPx: number[] = [];
  const roundHeightPx: number[] = [];
  let cursorY = TOP_PAD_PX + (championName ? RIBBON_HEIGHT_PX + RIBBON_GAP_PX : 0);
  topToBottom.forEach((_, roundIndex) => {
    const height = roundIndex === 0 ? FINAL_HEIGHT_PX : CARD_HEIGHT_PX;
    roundTopPx.push(cursorY);
    roundHeightPx.push(height);
    cursorY += height;
    if (roundIndex < topToBottom.length - 1) cursorY += CONNECTOR_HEIGHT_PX;
  });
  const totalHeightPx = cursorY + BOTTOM_PAD_PX;

  return (
    <div className="el-tv-tree-wrap">
      <div style={{ position: "relative", width: CONTENT_WIDTH_PX, height: totalHeightPx, flex: "none" }}>
        {championName && (
          <div
            className="el-tv-tree-champion"
            style={{
              position: "absolute",
              left: CONTENT_WIDTH_PX / 2,
              transform: "translateX(-50%)",
              top: TOP_PAD_PX,
              height: RIBBON_HEIGHT_PX,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
              background: championColor,
            }}
          >
            🏆 Campeão: {championName}
          </div>
        )}

        {topToBottom.slice(0, -1).map((round, roundIndex) => {
          const connectorTop = roundTopPx[roundIndex] + roundHeightPx[roundIndex];
          const connectorMidY = connectorTop + CONNECTOR_HEIGHT_PX / 2;
          return round.fixtures.map((fixture, matchIndex) => {
            const kids = children[roundIndex][matchIndex] ?? [];
            if (kids.length === 0) return null;
            const parentX = xPixel(centers[roundIndex][matchIndex]);
            const kidXs = kids.map((kidIndex) => xPixel(centers[roundIndex + 1][kidIndex]));
            const left = Math.min(...kidXs);
            const right = Math.max(...kidXs);
            return (
              <div key={`connector-${round.phase}-${fixture.id}`}>
                <div className="el-tv-tree-wire" style={{ left: parentX - 1, top: connectorTop, width: 2, height: CONNECTOR_HEIGHT_PX / 2 }} />
                {right > left && (
                  <div className="el-tv-tree-wire" style={{ left, top: connectorMidY - 1, width: right - left, height: 2 }} />
                )}
                {kidXs.map((kidX, i) => (
                  <div key={i} className="el-tv-tree-wire" style={{ left: kidX - 1, top: connectorMidY, width: 2, height: CONNECTOR_HEIGHT_PX / 2 }} />
                ))}
              </div>
            );
          });
        })}

        {topToBottom.map((round, roundIndex) => {
          const width = widthOf(roundIndex);
          const leftmostColumn = Math.min(...round.fixtures.map((_, matchIndex) => centers[roundIndex][matchIndex]));
          return (
            <div key={round.phase}>
              <p
                className={`el-tv-tree-round-title ${roundIndex === 0 ? "el-tv-tree-round-title-final" : ""}`}
                style={{ position: "absolute", left: xPixel(leftmostColumn) - width / 2, top: roundTopPx[roundIndex] - LABEL_OFFSET_PX, margin: 0 }}
              >
                {roundIndex === 0 ? `🏆 ${FIXTURE_PHASE_LABEL[round.phase]}` : FIXTURE_PHASE_LABEL[round.phase]}
              </p>
              {round.fixtures.map((fixture, matchIndex) => {
                const x = xPixel(centers[roundIndex][matchIndex]);
                return (
                  <MatchCard
                    key={fixture.id}
                    fixture={fixture}
                    rowHeightPx={(roundHeightPx[roundIndex] - 1) / 2}
                    style={{
                      position: "absolute",
                      left: x - width / 2,
                      top: roundTopPx[roundIndex],
                      width,
                      height: roundHeightPx[roundIndex],
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
