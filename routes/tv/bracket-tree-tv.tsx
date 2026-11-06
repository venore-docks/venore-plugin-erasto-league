import type { FixturePhase } from "../../contracts/types";
import type { FixtureView } from "../../runtime/bracket";
import { matchWinner, shortLabel, sideResult } from "../../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../../shared/fixture-phase";
import { formatScore } from "../../shared/score";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

// Mesmo espírito do site (blocks/bracket-tree.tsx): lista por rodada em vez de árvore com linhas —
// 5 colunas lado a lado (quartas-semi-final-semi-quartas) não cabiam com brasão/texto grandes nem no
// palco de 1920px sem apertar, e a TV não pode ter rolagem nenhuma. Em lista, cada rodada vira uma
// seção com os cards num grid de até 2 colunas, tamanhos fixos generosos (não calculados pra
// encolher) — cabe no palco porque cada seção tem no máximo 2 confrontos por linha, não 4-8 lado a
// lado como a árvore precisava.
const CARD_WIDTH_PX = 560;
const CARD_ROW_HEIGHT_PX = 66;
const FINAL_ROW_HEIGHT_PX = 80;

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

function MatchCard({ fixture, rowHeightPx, width }: { fixture: FixtureView; rowHeightPx: number; width: number }) {
  const color = winnerColor(fixture);
  return (
    <div className="el-tv-tree-card" style={{ width }}>
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

// Versão pra TV/projetor da mesma chave em lista do site — em px fixos do palco (CSS própria, sem
// Tailwind — ver cabeçalho de routes/tv/tv-canvas.tsx). Tamanhos de card fixos (não calculados a
// partir do espaço disponível) de propósito — nada de encolher; o palco de 1920px cabe folgado
// porque cada seção tem no máximo 2 confrontos lado a lado.
export function BracketTreeTv({ knockout }: { knockout: Round[] }) {
  const rounds = knockout
    .filter((round) => round.phase !== "final")
    .map((round) => ({ phase: round.phase, fixtures: [...round.fixtures].sort((a, b) => a.sortOrder - b.sortOrder) }));
  const finalFixture = knockout.find((round) => round.phase === "final")?.fixtures[0] ?? null;

  if (rounds.length === 0 && !finalFixture) {
    return <p className="el-tv-empty">Chave ainda não definida.</p>;
  }

  const champion =
    finalFixture && sideResult(finalFixture, "home") === "won"
      ? finalFixture.homeName
      : finalFixture && sideResult(finalFixture, "away") === "won"
        ? finalFixture.awayName
        : null;
  const championColor = finalFixture ? (winnerColor(finalFixture) ?? "var(--accent, #22c55e)") : "var(--accent, #22c55e)";

  return (
    <div className="el-tv-tree-wrap">
      <div className="el-tv-tree-list">
        {rounds.map((round) => {
          const cols = Math.min(2, round.fixtures.length);
          return (
            <section key={round.phase} className="el-tv-tree-section">
              <p className="el-tv-tree-round-title">{FIXTURE_PHASE_LABEL[round.phase]}</p>
              <div className="el-tv-tree-grid" style={{ gridTemplateColumns: `repeat(${cols}, ${CARD_WIDTH_PX}px)` }}>
                {round.fixtures.map((fixture) => (
                  <MatchCard key={fixture.id} fixture={fixture} rowHeightPx={CARD_ROW_HEIGHT_PX} width={CARD_WIDTH_PX} />
                ))}
              </div>
            </section>
          );
        })}

        {finalFixture && (
          <section className="el-tv-tree-section">
            <p className="el-tv-tree-round-title el-tv-tree-round-title-final">🏆 Final</p>
            <div className="el-tv-tree-grid" style={{ gridTemplateColumns: `${CARD_WIDTH_PX + 60}px` }}>
              <MatchCard fixture={finalFixture} rowHeightPx={FINAL_ROW_HEIGHT_PX} width={CARD_WIDTH_PX + 60} />
            </div>
            {champion && (
              <p className="el-tv-tree-champion" style={{ background: championColor }}>
                🏆 Campeão: {champion}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
