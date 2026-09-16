"use client";

import { useState, useTransition, type CSSProperties } from "react";
import type { TeamProfile } from "../../contracts/types";
import { startMatchAction, type ScoreActionResult } from "./actions";

const CSS = `
  html, body { margin: 0; background: radial-gradient(120% 140% at 50% -10%, #17202b 0%, #0b0f14 55%); }
  * { box-sizing: border-box; }
  .el-tk-wrap {
    min-height: 100dvh; padding: 28px 18px 40px; display: flex; flex-direction: column; gap: 22px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff; max-width: 480px; margin: 0 auto;
  }
  .el-tk-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    color: rgba(255,255,255,0.4); text-align: center; }
  .el-tk-title { font-size: 22px; font-weight: 900; text-align: center; margin: 0; }
  .el-tk-vs { display: flex; align-items: center; gap: 14px; }
  .el-tk-select-wrap { flex: 1; }
  .el-tk-versus { font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.35); }
  .el-tk-label { display: block; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
    color: rgba(255,255,255,0.45); margin-bottom: 8px; }
  .el-tk-select {
    width: 100%; height: 52px; padding: 0 14px; font-size: 15px; font-weight: 700;
    background: #161d26; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
    appearance: none; outline: none;
  }
  .el-tk-select:focus { border-color: var(--accent, #22c55e); }
  .el-tk-error { background: rgba(248,113,113,0.14); border: 1px solid rgba(248,113,113,0.4); color: #f87171;
    font-size: 13px; padding: 10px 14px; border-radius: 12px; }
  .el-tk-empty { background: rgba(234,179,8,0.14); border: 1px solid rgba(234,179,8,0.4); color: #eab308;
    font-size: 13px; padding: 10px 14px; border-radius: 12px; text-align: center; }
  .el-tk-start {
    height: 60px; font-size: 17px; font-weight: 900; letter-spacing: 0.3px; border: 0; border-radius: 16px;
    cursor: pointer; background: var(--accent, #22c55e); color: #04170a;
    box-shadow: 0 14px 30px -10px color-mix(in srgb, var(--accent, #22c55e) 60%, transparent);
    transition: transform 120ms ease, box-shadow 120ms ease;
  }
  .el-tk-start:active { transform: scale(0.98); }
  .el-tk-start:disabled { opacity: 0.5; cursor: default; box-shadow: none; }
`;

export function TeamPicker({
  teams,
  accentColor,
  onStarted,
}: {
  teams: TeamProfile[];
  accentColor: string;
  onStarted: (result: ScoreActionResult) => void;
}) {
  const [homeTeamId, setHomeTeamId] = useState(teams[0]?.id ?? "");
  const [awayTeamId, setAwayTeamId] = useState(teams[1]?.id ?? teams[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    if (!homeTeamId || !awayTeamId) {
      setError("Escolha os dois times.");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError("Os times precisam ser diferentes.");
      return;
    }
    startTransition(async () => {
      const result = await startMatchAction(homeTeamId, awayTeamId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      onStarted(result);
    });
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="el-tk-wrap" style={{ "--accent": accentColor } as CSSProperties}>
        <div>
          <p className="el-tk-eyebrow">Erasto League</p>
          <h1 className="el-tk-title">Escolha os times da partida</h1>
        </div>

        {teams.length < 2 ? (
          <p className="el-tk-empty">
            Cadastre pelo menos 2 times em /admin/erasto-league/teams antes de começar uma partida.
          </p>
        ) : (
          <>
            <div className="el-tk-vs">
              <div className="el-tk-select-wrap">
                <label className="el-tk-label">Casa</label>
                <select className="el-tk-select" value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <span className="el-tk-versus">×</span>
              <div className="el-tk-select-wrap">
                <label className="el-tk-label">Visitante</label>
                <select className="el-tk-select" value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <div className="el-tk-error">{error}</div>}

            <button type="button" className="el-tk-start" disabled={pending} onClick={start}>
              {pending ? "Iniciando…" : "▶ Iniciar partida"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
