"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { buildTvPages, type TvPage } from "../../shared/tv-pages";
import { resolveTvStageTransform, type TvStageTransform } from "../../shared/tv-stage";
import { FIXTURE_PHASE_LABEL } from "../../shared/fixture-phase";
import { formatScore } from "../../shared/score";
import { getTvDataAction, type TvData } from "./actions";
import type { NextGameView } from "../../runtime/bracket";
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
  .el-tv-page-title { font-size: 52px; font-weight: 900; margin: 8px 0 0; }
  .el-tv-title-bar { width: 84px; height: 6px; border-radius: 999px; background: var(--accent, #22c55e); margin-top: 14px; }
  .el-tv-brand-plate {
    display: flex; align-items: center; padding: 12px 24px; border-radius: 18px;
    background: rgba(255,255,255,0.92); box-shadow: 0 12px 28px -10px rgba(0,0,0,0.5);
  }
  .el-tv-brand { height: 48px; max-width: 280px; width: auto; object-fit: contain; }

  .el-tv-body { flex: 1; min-height: 0; padding: 24px 64px 40px; display: flex; flex-direction: column; justify-content: center; }
  .el-tv-empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 32px; color: rgba(255,255,255,0.4); }

  .el-tv-table-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
    border: 1px solid rgba(255,255,255,0.12); border-radius: 28px; padding: 12px 0; overflow: hidden;
    box-shadow: 0 40px 80px -30px rgba(0,0,0,0.65);
  }
  .el-tv-table { width: 100%; border-collapse: collapse; }
  .el-tv-table th { text-align: left; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
    color: rgba(255,255,255,0.4); padding: 18px 36px; border-bottom: 2px solid rgba(255,255,255,0.1); }
  .el-tv-table th.center, .el-tv-table td.center { text-align: center; }
  .el-tv-table td { font-size: 40px; font-weight: 700; padding: 26px 36px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .el-tv-table tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
  .el-tv-table tr.top td { background: color-mix(in srgb, var(--accent, #22c55e) 14%, transparent); }
  .el-tv-table tr:last-child td { border-bottom: 0; }
  .el-tv-table td.pos { color: rgba(255,255,255,0.4); width: 64px; font-size: 30px; }
  .el-tv-table td.pts { font-weight: 900; color: var(--accent, #22c55e); }
  .el-tv-team { display: flex; align-items: center; gap: 20px; }
  .el-tv-crest { width: 64px; height: 64px; border-radius: 999px; object-fit: cover; flex-shrink: 0; box-shadow: 0 8px 18px -6px rgba(0,0,0,0.5); }
  .el-tv-crest-mono { width: 64px; height: 64px; border-radius: 999px; background: rgba(255,255,255,0.08); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; }

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
  .el-tv-fixture-round {
    display: inline-block; margin-bottom: 10px; padding: 3px 10px; border-radius: 999px;
    background: var(--accent, #22c55e); color: #04170a; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;
  }

  .el-tv-next { flex: 1; display: flex; flex-direction: column; min-height: 0; border-radius: 24px; overflow: hidden; position: relative; }
  .el-tv-next-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.22); }
  .el-tv-next-badges { position: relative; display: flex; justify-content: center; gap: 10px; padding-top: 28px; }
  .el-tv-next-badge { padding: 5px 16px; border-radius: 999px; background: rgba(255,255,255,0.18); backdrop-filter: blur(4px);
    font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #fff; }
  .el-tv-next-badge.round { background: #fff; color: #04070d; }
  .el-tv-next-row { position: relative; flex: 1; display: flex; align-items: center; }
  .el-tv-next-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 0 24px; min-width: 0; }
  .el-tv-next-crest { width: 160px; height: 160px; border-radius: 999px; object-fit: cover; border: 6px solid rgba(255,255,255,0.25);
    box-shadow: 0 24px 48px -12px rgba(0,0,0,0.7); }
  .el-tv-next-crest-mono { width: 160px; height: 160px; border-radius: 999px; border: 6px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center; font-size: 52px; font-weight: 900; color: #fff;
    box-shadow: 0 24px 48px -12px rgba(0,0,0,0.7); }
  .el-tv-next-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 34px;
    font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.4); }
  .el-tv-next-vs { flex: none; font-size: 48px; font-style: italic; font-weight: 900; color: rgba(255,255,255,0.55); }
  .el-tv-next-when { position: relative; text-align: center; padding-bottom: 32px; font-size: 20px; font-weight: 800; color: #fff; }

  .el-tv-foot { padding: 24px 64px 40px; }
  .el-tv-bar { height: 6px; width: 100%; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
  .el-tv-bar-fill { height: 100%; border-radius: 999px; background: var(--accent, #22c55e); }
  .el-tv-dots { display: flex; justify-content: center; gap: 10px; margin-top: 14px; }
  .el-tv-page-dot { width: 10px; height: 10px; border-radius: 999px; }

  @keyframes el-tv-progress { from { width: 0%; } to { width: 100%; } }
`;

function pageTitle(page: TvPage): string {
  if (page.kind === "next-game") return "Próximo jogo";
  if (page.kind === "group") return `Grupo ${page.groupName}`;
  if (page.kind === "standings") return "Classificação";
  return "Eliminatórias";
}

function formatNextGameWhen(epochMs: number | null): string {
  if (!epochMs) return "Data a definir";
  const d = new Date(epochMs);
  const date = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${date} · ${time}`;
}

// Mesmo espírito do bloco erasto-league.next-game-ad (página inicial) — fundo split com a cor de
// cada time, crista grande, "VS" no meio — só que em CSS própria (sem Tailwind/shadcn, ver motivo
// no topo do arquivo) e ocupando o palco inteiro (já é 16:9).
function NextGamePage({ nextGame }: { nextGame: NextGameView }) {
  const homeColor = nextGame.homeColor ?? "#0f172a";
  const awayColor = nextGame.awayColor ?? "#020617";

  return (
    <div
      className="el-tv-next"
      style={{ background: `linear-gradient(115deg, ${homeColor} 0%, ${homeColor} 42%, #04070d 50%, ${awayColor} 58%, ${awayColor} 100%)` }}
    >
      <div className="el-tv-next-overlay" />
      <div className="el-tv-next-badges">
        {nextGame.roundLabel && <span className="el-tv-next-badge round">{nextGame.roundLabel}</span>}
      </div>
      <div className="el-tv-next-row">
        <div className="el-tv-next-side">
          {nextGame.homeCrestUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="el-tv-next-crest" src={nextGame.homeCrestUrl} alt="" />
          ) : (
            <div className="el-tv-next-crest-mono" style={{ background: homeColor }}>
              {nextGame.homeName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="el-tv-next-name">{nextGame.homeName}</span>
        </div>
        <span className="el-tv-next-vs">VS</span>
        <div className="el-tv-next-side">
          {nextGame.awayCrestUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="el-tv-next-crest" src={nextGame.awayCrestUrl} alt="" />
          ) : (
            <div className="el-tv-next-crest-mono" style={{ background: awayColor }}>
              {nextGame.awayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="el-tv-next-name">{nextGame.awayName}</span>
        </div>
      </div>
      <p className="el-tv-next-when">{formatNextGameWhen(nextGame.scheduledAt)}</p>
    </div>
  );
}

const RANK_MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

function StandingsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <div className="el-tv-table-card">
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
              <td className="pos">{RANK_MEDAL[index] ?? index + 1}</td>
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
    </div>
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
                  {fixture.roundLabel && <span className="el-tv-fixture-round">{fixture.roundLabel}</span>}
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

export function TvCanvas({
  initialData,
  accentColor,
  brandLogoUrl,
}: {
  initialData: TvData;
  accentColor: string;
  brandLogoUrl: string | null;
}) {
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
  const pages = buildTvPages(data.bracket, data.standings, data.nextGame);

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
              <div className="el-tv-title-bar" />
            </div>
            {brandLogoUrl && (
              <div className="el-tv-brand-plate">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="el-tv-brand" src={brandLogoUrl} alt="" />
              </div>
            )}
          </div>

          <div className="el-tv-body">
            {!currentPage ? (
              <p className="el-tv-empty">Tabela de jogos ainda não importada.</p>
            ) : currentPage.kind === "next-game" ? (
              <NextGamePage nextGame={currentPage.nextGame} />
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
