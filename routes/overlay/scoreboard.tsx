"use client";

import { useEffect, useState } from "react";
import type { MatchState } from "../../contracts/types";

// Fora da shell/tema do site — nada de className shadcn aqui (as CSS vars de cor não existem
// nesta rota). Cores em hex via <style> injetado + style inline, mesmo racional do broadcast
// (layer-renderer.tsx / pin-form.tsx). Tamanhos em px: a fonte de navegador do OBS tem resolução
// fixa (o operador define, ex 1920x1080), então px é previsível aqui.
const CSS = `
  html, body { background: transparent !important; margin: 0; }
  .el-wrap {
    position: fixed; inset: 0; pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
    padding-bottom: 56px; gap: 10px;
  }
  .el-chip {
    background: #22c55e; color: #05230f;
    font-size: 13px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
    padding: 5px 14px; border-radius: 999px;
  }
  .el-bar {
    display: flex; align-items: stretch;
    background: rgba(9, 13, 18, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 10px 44px rgba(0, 0, 0, 0.5);
  }
  .el-side {
    display: flex; align-items: center; padding: 16px 30px; min-width: 260px;
  }
  .el-side.home { justify-content: flex-end; }
  .el-side.away { justify-content: flex-start; }
  .el-name {
    color: #ffffff; font-size: 30px; font-weight: 700; letter-spacing: 0.5px;
    text-transform: uppercase; white-space: nowrap;
  }
  .el-scores {
    display: flex; align-items: center; gap: 18px;
    background: #22c55e; color: #05230f; padding: 0 26px; font-weight: 900;
  }
  .el-num { font-size: 44px; font-variant-numeric: tabular-nums; animation: el-pop 220ms ease-out; }
  .el-sep { width: 2px; height: 34px; background: rgba(5, 35, 15, 0.35); }
  .el-live {
    position: absolute; top: -9px; right: -9px;
    width: 16px; height: 16px; border-radius: 999px;
    background: #ef4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.25);
  }
  .el-live.on { background: #ef4444; animation: el-blink 1.6s ease-in-out infinite; }
  .el-live.off { background: #6b7280; box-shadow: 0 0 0 4px rgba(107, 114, 128, 0.2); }
  @keyframes el-pop { from { transform: scale(1.35); } to { transform: scale(1); } }
  @keyframes el-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
`;

export function Scoreboard({ initialState }: { initialState: MatchState }) {
  const [state, setState] = useState<MatchState>(initialState);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/erasto-league/events");
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      try {
        setState(JSON.parse(event.data) as MatchState);
      } catch {
        // ignora keep-alive / linha malformada
      }
    };
    return () => source.close();
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="el-wrap">
        {state.label ? <div className="el-chip">{state.label}</div> : null}
        <div className="el-bar" style={{ position: "relative" }}>
          <span className={`el-live ${live ? "on" : "off"}`} />
          <div className="el-side home">
            <span className="el-name">{state.home.name}</span>
          </div>
          <div className="el-scores">
            <span className="el-num" key={`h-${state.home.score}`}>
              {state.home.score}
            </span>
            <span className="el-sep" />
            <span className="el-num" key={`a-${state.away.score}`}>
              {state.away.score}
            </span>
          </div>
          <div className="el-side away">
            <span className="el-name">{state.away.name}</span>
          </div>
        </div>
      </div>
    </>
  );
}
