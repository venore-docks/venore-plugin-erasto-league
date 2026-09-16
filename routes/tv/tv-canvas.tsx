"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { buildTvPages, type TvPage } from "../../shared/tv-pages";
import { resolveTvStageTransform, type TvStageTransform } from "../../shared/tv-stage";
import { FIXTURE_PHASE_LABEL } from "../../shared/fixture-phase";
import { formatScore } from "../../shared/score";
import { getTvDataAction, type TvData } from "./actions";
import type { TeamStanding } from "../../contracts/types";

// Requisito explícito: view pra TV/projetor mostrando as tabelas do campeonato, mesmo espírito da
// tela de TV do venore-plugin-scoreboard — palco de resolução fixa escalado pro viewport real
// (shared/tv-stage.ts) e rodízio automático entre páginas (uma por grupo, + eliminatórias) quando
// há mais de uma pra mostrar.
const PAGE_DURATION_MS = 12_000;
const POLL_MS = 20_000;

const CSS = `
  html, body { margin: 0; background: #0a0d12; }
  * { box-sizing: border-box; }
  .el-tv-stage {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff; background: radial-gradient(120% 140% at 50% -10%, #17202b 0%, #0a0d12 55%);
    display: flex; flex-direction: column;
  }
  .el-tv-head { display: flex; align-items: center; justify-content: space-between; padding: 40px 64px 0; }
  .el-tv-eyebrow { font-size: 20px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin: 0; }
  .el-tv-page-title { font-size: 44px; font-weight: 900; margin: 6px 0 0; }
  .el-tv-live { display: flex; align-items: center; gap: 10px; font-size: 18px; color: rgba(255,255,255,0.5); }
  .el-tv-dot { width: 12px; height: 12px; border-radius: 999px; background: var(--accent, #22c55e);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent, #22c55e) 22%, transparent); }

  .el-tv-body { flex: 1; min-height: 0; padding: 24px 64px 0; display: flex; flex-direction: column; }
  .el-tv-empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 32px; color: rgba(255,255,255,0.4); }

  .el-tv-table { width: 100%; border-collapse: collapse; }
  .el-tv-table th { text-align: left; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
    color: rgba(255,255,255,0.45); padding: 10px 14px; border-bottom: 2px solid rgba(255,255,255,0.1); }
  .el-tv-table th.center, .el-tv-table td.center { text-align: center; }
  .el-tv-table td { font-size: 26px; font-weight: 700; padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .el-tv-table tr.top td { background: color-mix(in srgb, var(--accent, #22c55e) 12%, transparent); }
  .el-tv-table td.pos { color: rgba(255,255,255,0.4); width: 56px; }
  .el-tv-table td.pts { font-weight: 900; color: var(--accent, #22c55e); }
  .el-tv-team { display: flex; align-items: center; gap: 14px; }
  .el-tv-crest { width: 40px; height: 40px; border-radius: 999px; object-fit: cover; flex-shrink: 0; }
  .el-tv-crest-mono { width: 40px; height: 40px; border-radius: 999px; background: rgba(255,255,255,0.08); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; }

  .el-tv-knockout { flex: 1; display: flex; gap: 32px; min-height: 0; padding-bottom: 24px; }
  .el-tv-column { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
  .el-tv-column-title { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
    text-align: center; color: rgba(255,255,255,0.5); }
  .el-tv-fixtures { flex: 1; display: flex; flex-direction: column; justify-content: space-around; gap: 16px; }
  .el-tv-fixture { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 18px; }
  .el-tv-fixture-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; font-size: 22px; font-weight: 700; }
  .el-tv-fixture-row.won { font-weight: 900; color: var(--accent, #22c55e); }
  .el-tv-fixture-score { margin-left: auto; font-variant-numeric: tabular-nums; }
  .el-tv-fixture-sep { border-top: 1px solid rgba(255,255,255,0.08); }
  .el-tv-fixture-status { margin-top: 8px; text-align: center; font-size: 15px; color: rgba(255,255,255,0.4); }

  .el-tv-foot { padding: 24px 64px 40px; }
  .el-tv-bar { height: 6px; width: 100%; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
  .el-tv-bar-fill { height: 100%; border-radius: 999px; background: var(--accent, #22c55e); }
  .el-tv-dots { display: flex; justify-content: center; gap: 10px; margin-top: 14px; }
  .el-tv-page-dot { width: 10px; height: 10px; border-radius: 999px; }

  @keyframes el-tv-progress { from { width: 0%; } to { width: 100%; } }
`;

function pageTitle(page: TvPage): string {
  if (page.kind === "group") return `Grupo ${page.groupName}`;
  if (page.kind === "standings") return "Classificação";
  return "Eliminatórias";
}

function StandingsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <table className="el-tv-table">
      <thead>
        <tr>
          <th></th>
          <th>Time</th>
          <th className="center">J</th>
          <th className="center">V</th>
          <th className="center">E</th>
          <th className="center">D</th>
          <th className="center">SG</th>
          <th className="center">Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((row, index) => (
          <tr key={row.teamId} className={index === 0 ? "top" : undefined}>
            <td className="pos">{index + 1}</td>
            <td>
              <div className="el-tv-team">
                {row.crestUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="el-tv-crest" src={row.crestUrl} alt="" />
                ) : (
                  <div className="el-tv-crest-mono">{row.name.slice(0, 2).toUpperCase()}</div>
                )}
                {row.name}
              </div>
            </td>
            <td className="center">{row.played}</td>
            <td className="center">{row.won}</td>
            <td className="center">{row.drawn}</td>
            <td className="center">{row.lost}</td>
            <td className="center">{row.goalsFor - row.goalsAgainst}</td>
            <td className="center pts">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KnockoutPage({ knockout }: { knockout: Extract<TvPage, { kind: "knockout" }>["knockout"] }) {
  return (
    <div className="el-tv-knockout">
      {knockout.map(({ phase, fixtures }) => (
        <div key={phase} className="el-tv-column">
          <p className="el-tv-column-title">{FIXTURE_PHASE_LABEL[phase]}</p>
          <div className="el-tv-fixtures">
            {fixtures.map((fixture) => {
              const homeWon = fixture.played && fixture.homeScore != null && fixture.awayScore != null && fixture.homeScore > fixture.awayScore;
              const awayWon = fixture.played && fixture.homeScore != null && fixture.awayScore != null && fixture.awayScore > fixture.homeScore;
              return (
                <div key={fixture.id} className="el-tv-fixture">
                  <div className={`el-tv-fixture-row ${homeWon ? "won" : ""}`}>
                    {fixture.homeName}
                    {fixture.played && <span className="el-tv-fixture-score">{formatScore(fixture.homeScore ?? 0)}</span>}
                  </div>
                  <div className="el-tv-fixture-sep" />
                  <div className={`el-tv-fixture-row ${awayWon ? "won" : ""}`}>
                    {fixture.awayName}
                    {fixture.played && <span className="el-tv-fixture-score">{formatScore(fixture.awayScore ?? 0)}</span>}
                  </div>
                  {!fixture.played && <p className="el-tv-fixture-status">a jogar</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function useTvStageTransform(): TvStageTransform {
  const [transform, setTransform] = useState<TvStageTransform>(() => resolveTvStageTransform(0, 0));

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      setTransform(resolveTvStageTransform(window.innerWidth, window.innerHeight));
    };
    const timeoutId = setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return transform;
}

export function TvCanvas({ initialData, accentColor }: { initialData: TvData; accentColor: string }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      getTvDataAction()
        .then((next) => {
          if (!cancelled) setData(next);
        })
        .catch(() => {
          // rede instável — próximo tick tenta de novo
        });
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const stage = useTvStageTransform();
  const pages = buildTvPages(data.bracket, data.standings);

  const [pageIndex, setPageIndex] = useState(0);
  const safePageIndex = pages.length === 0 ? 0 : Math.min(pageIndex, pages.length - 1);

  useEffect(() => {
    if (pages.length <= 1) return;
    const timeoutId = setTimeout(() => setPageIndex((current) => (current + 1) % pages.length), PAGE_DURATION_MS);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avança por tempo, não por mudança de conteúdo
  }, [safePageIndex, pages.length]);

  const currentPage = pages[safePageIndex];

  return (
    <>
      <style>{CSS}</style>
      <div className="fixed inset-0 overflow-hidden" style={{ "--accent": accentColor } as CSSProperties}>
        <div
          className="el-tv-stage absolute top-0 left-0"
          style={{
            width: `${stage.stageWidthPx}px`,
            height: `${stage.stageHeightPx}px`,
            transform: `scale(${stage.scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className="el-tv-head">
            <div>
              <p className="el-tv-eyebrow">Erasto League</p>
              <h1 className="el-tv-page-title">{currentPage ? pageTitle(currentPage) : "Tabela de jogos"}</h1>
            </div>
            <span className="el-tv-live">
              <span className="el-tv-dot" /> ao vivo
            </span>
          </div>

          <div className="el-tv-body">
            {!currentPage ? (
              <p className="el-tv-empty">Tabela de jogos ainda não importada.</p>
            ) : currentPage.kind === "knockout" ? (
              <KnockoutPage knockout={currentPage.knockout} />
            ) : (
              <StandingsTable standings={currentPage.standings} />
            )}
          </div>

          {pages.length > 1 && (
            <div className="el-tv-foot">
              <div className="el-tv-bar">
                <div key={safePageIndex} className="el-tv-bar-fill" style={{ animation: `el-tv-progress ${PAGE_DURATION_MS}ms linear forwards` }} />
              </div>
              <div className="el-tv-dots">
                {pages.map((page, index) => (
                  <span
                    key={page.key}
                    className="el-tv-page-dot"
                    style={{ background: index === safePageIndex ? "#ffffff" : "rgba(255,255,255,0.25)" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
