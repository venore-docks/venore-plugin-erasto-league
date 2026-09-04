"use client";

import { useState, type CSSProperties } from "react";
import type { MatchState } from "../../contracts/types";
import { computeElapsedMs, formatClock } from "../../shared/clock";
import { useMatchState, useTick } from "../../shared/use-match-state";

// Fora da shell/tema do site — nada de className shadcn aqui (as CSS vars de cor do tema não
// existem nesta rota). Cor de destaque entra por --accent (style inline, das settings); o resto é
// hex via <style> injetado. Tamanhos em px: a fonte de navegador do OBS tem resolução fixa.
//
// Layout: pilha simples e centralizada, no fluxo normal — brasão em cima, relógio embaixo, barra
// do placar por último. Sem position:absolute nem transbordo (versões anteriores tentaram montar
// o medalhão "atravessando" a barra e ficou ruim).
const CSS = `
  html, body { background: transparent !important; margin: 0; }

  .el-wrap {
    position: fixed; inset: 0; pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
    padding-bottom: 60px; gap: 16px;
    -webkit-font-smoothing: antialiased;
    --accent: #22c55e;
  }

  /* brasão da liga */
  .el-crest {
    position: relative;
    width: 150px; height: 150px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 36%, #ffffff, #eef7f1 70%, #d6e6dd);
    border: 3px solid #f6fff9;
    box-shadow:
      0 16px 40px rgba(0,0,0,0.45),
      0 0 0 8px rgba(6,10,14,0.55),
      0 0 0 10px color-mix(in srgb, var(--accent) 34%, transparent);
    animation: el-rise 460ms ease-out both;
  }
  .el-crest::before {
    content: ""; position: absolute; inset: -14px; border-radius: 999px; z-index: -1;
    background: conic-gradient(from 0deg,
      color-mix(in srgb, var(--accent) 0%, transparent) 0deg,
      color-mix(in srgb, var(--accent) 60%, transparent) 130deg,
      color-mix(in srgb, var(--accent) 0%, transparent) 260deg);
    filter: blur(4px);
    animation: el-spin 11s linear infinite;
  }
  .el-logo { width: 84%; height: 84%; object-fit: contain; filter: drop-shadow(0 3px 7px rgba(0,0,0,0.28)); }
  .el-monogram { font-size: 46px; font-weight: 900; letter-spacing: 1px; color: #0b7a37; }

  /* relógio + etiqueta */
  .el-clock-pill {
    display: flex; align-items: center; gap: 12px; white-space: nowrap;
    padding: 9px 24px; border-radius: 999px;
    background: linear-gradient(180deg, rgba(22,28,34,0.95), rgba(11,15,19,0.95));
    border: 1px solid color-mix(in srgb, var(--accent) 40%, rgba(255,255,255,0.12));
    box-shadow: 0 14px 32px rgba(0,0,0,0.5);
    animation: el-rise 500ms ease-out both;
  }
  .el-dot { width: 10px; height: 10px; border-radius: 999px; flex: none; background: var(--accent); }
  .el-dot.run { animation: el-blink 1s ease-in-out infinite; }
  .el-dot.off { background: #ef4444; }
  .el-clock {
    font-size: 30px; font-weight: 900; letter-spacing: 1px;
    font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
    color: #ffffff;
  }
  .el-clock.run { color: var(--accent); }
  .el-pill-sep { width: 1px; height: 22px; background: rgba(255,255,255,0.20); }
  .el-label { font-size: 15px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #eafff2; }

  /* barra do placar */
  .el-bar {
    display: flex; align-items: stretch;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(15,20,26,0.90), rgba(8,11,15,0.93));
    border: 1px solid rgba(255,255,255,0.09);
    border-top-color: rgba(255,255,255,0.22);
    box-shadow:
      0 30px 70px rgba(0,0,0,0.55),
      0 8px 24px color-mix(in srgb, var(--accent) 16%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.07);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    overflow: hidden;
    animation: el-rise 540ms ease-out both;
  }

  .el-name {
    display: flex; align-items: center;
    width: 380px; padding: 0 44px;
    color: #ffffff; font-size: 34px; font-weight: 800;
    letter-spacing: 0.6px; text-transform: uppercase; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    text-shadow: 0 2px 14px rgba(0,0,0,0.55);
  }
  .el-name.home { justify-content: flex-end; text-align: right; }
  .el-name.away { justify-content: flex-start; text-align: left; }

  .el-plate {
    display: flex; align-items: center; gap: 30px;
    padding: 24px 40px;
    background: linear-gradient(180deg,
      color-mix(in srgb, var(--accent) 82%, white),
      color-mix(in srgb, var(--accent) 78%, black));
    color: #04240f;
    box-shadow: inset 0 2px 0 rgba(255,255,255,0.40), inset 0 -14px 30px rgba(0,0,0,0.20);
  }
  .el-num {
    font-size: 66px; font-weight: 900; line-height: 1;
    min-width: 74px; text-align: center;
    font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
    text-shadow: 0 1px 0 rgba(255,255,255,0.32);
    animation: el-pop 280ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }
  .el-sep { width: 3px; height: 40px; border-radius: 999px; background: rgba(4,36,15,0.35); }

  @keyframes el-pop   { from { transform: scale(1.4); } to { transform: scale(1); } }
  @keyframes el-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.32; } }
  @keyframes el-spin  { to { transform: rotate(360deg); } }
  @keyframes el-rise  { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
`;

export function Scoreboard({
  initialState,
  accentColor,
  logoUrl,
}: {
  initialState: MatchState;
  accentColor: string;
  logoUrl: string;
}) {
  const { state, live } = useMatchState(initialState);
  const now = useTick(200);
  const [logoOk, setLogoOk] = useState(Boolean(logoUrl));

  const elapsed = computeElapsedMs(state.clock, now);
  const showClock = state.clock.running || elapsed > 0;
  const showPill = !live || showClock || state.label.length > 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="el-wrap" style={{ "--accent": accentColor } as CSSProperties}>
        <div className="el-crest" aria-hidden="true">
          {logoOk && logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- rota standalone fora do app, sem next/image
            <img className="el-logo" src={logoUrl} alt="" onError={() => setLogoOk(false)} />
          ) : (
            <span className="el-monogram">EL</span>
          )}
        </div>

        {showPill ? (
          <div className="el-clock-pill">
            <span className={`el-dot ${!live ? "off" : state.clock.running ? "run" : ""}`} />
            {!live ? (
              <span className="el-label">Sem sinal</span>
            ) : (
              <>
                {showClock ? (
                  <span className={`el-clock ${state.clock.running ? "run" : ""}`}>{formatClock(elapsed)}</span>
                ) : null}
                {showClock && state.label ? <span className="el-pill-sep" /> : null}
                {state.label ? <span className="el-label">{state.label}</span> : null}
              </>
            )}
          </div>
        ) : null}

        <div className="el-bar">
          <div className="el-name home">{state.home.name}</div>
          <div className="el-plate">
            <span className="el-num home" key={`h-${state.home.score}`}>
              {state.home.score}
            </span>
            <span className="el-sep" />
            <span className="el-num away" key={`a-${state.away.score}`}>
              {state.away.score}
            </span>
          </div>
          <div className="el-name away">{state.away.name}</div>
        </div>
      </div>
    </>
  );
}
