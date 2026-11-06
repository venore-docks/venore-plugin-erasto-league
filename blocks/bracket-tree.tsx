import type { CSSProperties } from "react";
import Link from "next/link";
import type { FixturePhase } from "../contracts/types";
import type { FixtureView } from "../runtime/bracket";
import { computeFunnelLayout } from "../shared/bracket-funnel-layout";
import { matchWinner, shortLabel, sideResult } from "../shared/bracket-match-result";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";
import { TeamCrest } from "./home/team-crest";

type Round = { phase: FixturePhase; fixtures: FixtureView[] };

const CARD_HEIGHT_PX = 120;
const FINAL_HEIGHT_PX = 150;
const CONNECTOR_HEIGHT_PX = 64;
const RIBBON_HEIGHT_PX = 40;
const RIBBON_GAP_PX = 18;
const TOP_PAD_PX = 22;
const BOTTOM_PAD_PX = 20;
const LABEL_OFFSET_PX = 26;
const SIDE_MARGIN_PCT = 2;
const GAP_PCT = 2;

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
      className={`flex h-full items-center gap-3 px-4 ${lost ? "opacity-55" : ""}`}
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
    <Link href={`/erasto-league/teams/${slug}`} className="block min-h-0 flex-1 hover:bg-muted/40">
      {row}
    </Link>
  ) : (
    <div className="min-h-0 flex-1">{row}</div>
  );
}

function MatchCard({ fixture, big = false, style }: { fixture: FixtureView; big?: boolean; style: CSSProperties }) {
  const winner = matchWinner(fixture);
  const color = winner?.color ?? "var(--primary)";

  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-panel border border-border bg-card shadow-sm ${big ? "border-2 shadow-md" : ""}`}
      style={style}
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

// Chave em funil invertido (final no topo, descendo até a fase mais cedo embaixo), com linhas
// conectando quem alimenta quem — pedido explícito do usuário depois de ver o esboço (Artifact) e
// aprovar esse formato no lugar da lista solta de cards sem linha (ilegível demais) e da árvore
// espelhada horizontal (não cabia brasão grande em 5 colunas lado a lado sem apertar ou dar scroll).
//
// Posicionamento em %, não em px medido por JS: todo o eixo X é resolvido em porcentagem da largura
// real do container (shared/bracket-funnel-layout.ts faz só a conta abstrata de QUAL coluna cada
// confronto ocupa — a conversão pra % de tela é feita aqui). Isso dá responsividade total sem
// ResizeObserver nem risco de scroll horizontal: a % nunca estoura o container, só os cards encolhem
// junto com a tela. O eixo Y fica em px fixos (altura de card/conector não depende da largura).
export function BracketTree({ knockout }: { knockout: Round[] }) {
  const rounds = knockout.filter((round) => round.fixtures.length > 0);

  if (rounds.length === 0) {
    return <p className="text-sm text-muted-foreground">Chave ainda não definida.</p>;
  }

  const topToBottom = [...rounds].reverse().map((round) => ({
    phase: round.phase,
    fixtures: [...round.fixtures].sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  const { centers, children } = computeFunnelLayout(
    topToBottom.map((round) => round.fixtures.map((fixture) => ({ homeSlug: fixture.homeSlug, awaySlug: fixture.awaySlug }))),
  );

  const bottomCount = topToBottom[topToBottom.length - 1].fixtures.length;
  const cardWidthPct = (100 - 2 * SIDE_MARGIN_PCT - GAP_PCT * (bottomCount - 1)) / bottomCount;
  const finalWidthPct = Math.min(cardWidthPct * 1.5, 42);
  const xPercent = (column: number) => SIDE_MARGIN_PCT + cardWidthPct / 2 + column * (cardWidthPct + GAP_PCT);
  const widthOf = (roundIndex: number) => (roundIndex === 0 ? finalWidthPct : cardWidthPct);

  const finalFixture = topToBottom[0].fixtures[0] ?? null;
  const championWinner = finalFixture ? matchWinner(finalFixture) : null;
  const championName =
    championWinner && finalFixture ? (championWinner.side === "home" ? finalFixture.homeName : finalFixture.awayName) : null;

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
    <div className="relative w-full" style={{ height: totalHeightPx }}>
      {championName && (
        <div
          className="absolute flex items-center justify-center whitespace-nowrap rounded-full px-6 text-sm font-extrabold text-primary-foreground"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            top: TOP_PAD_PX,
            height: RIBBON_HEIGHT_PX,
            background: championWinner?.color ?? "var(--primary)",
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
          const parentX = xPercent(centers[roundIndex][matchIndex]);
          const kidXs = kids.map((kidIndex) => xPercent(centers[roundIndex + 1][kidIndex]));
          const left = Math.min(...kidXs);
          const right = Math.max(...kidXs);
          return (
            <div key={`connector-${round.phase}-${fixture.id}`}>
              <div
                className="absolute w-0.5 -translate-x-1/2 bg-border"
                style={{ left: `${parentX}%`, top: connectorTop, height: CONNECTOR_HEIGHT_PX / 2 }}
              />
              {right > left && (
                <div className="absolute h-0.5 bg-border" style={{ left: `${left}%`, width: `${right - left}%`, top: connectorMidY }} />
              )}
              {kidXs.map((kidX, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 -translate-x-1/2 bg-border"
                  style={{ left: `${kidX}%`, top: connectorMidY, height: CONNECTOR_HEIGHT_PX / 2 }}
                />
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
            <span
              className={`absolute whitespace-nowrap text-xs font-extrabold uppercase tracking-wide ${roundIndex === 0 ? "text-primary" : "text-muted-foreground"}`}
              style={{ left: `${xPercent(leftmostColumn) - width / 2}%`, top: roundTopPx[roundIndex] - LABEL_OFFSET_PX }}
            >
              {roundIndex === 0 ? `🏆 ${FIXTURE_PHASE_LABEL[round.phase]}` : FIXTURE_PHASE_LABEL[round.phase]}
            </span>
            {round.fixtures.map((fixture, matchIndex) => {
              const x = xPercent(centers[roundIndex][matchIndex]);
              return (
                <MatchCard
                  key={fixture.id}
                  fixture={fixture}
                  big={roundIndex === 0}
                  style={{ left: `${x - width / 2}%`, width: `${width}%`, top: roundTopPx[roundIndex], height: roundHeightPx[roundIndex] }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
