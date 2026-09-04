"use client";

import { useState, type CSSProperties } from "react";
import type { MatchState } from "../../contracts/types";
import { computeElapsedMs, formatClock } from "../../shared/clock";
import { useMatchState, useTick } from "../../shared/use-match-state";

// Fora da shell/tema do site — nada de className shadcn aqui (as CSS vars de cor do tema não
// existem nesta rota). Cor de destaque entra por --accent (style inline, das settings); o resto é
// hex via <style> injetado. Tamanhos em px: a fonte de navegador do OBS tem resolução fixa.
//
// Layout: barra do placar bottom-center com o BRASÃO no meio, alinhado verticalmente com a barra
// (medalhão centralizado na altura da barra, entre os dois números). O RELÓGIO fica discreto,
// à direita da cena, alinhado verticalmente ao centro da barra do placar.
const CSS = `
  html, body { background: transparent !important; margin: 0; }

  .el-wrap {
    position: fixed; inset: 0; pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    --accent: #22c55e;
  }

  /* a faixa tem a altura da barra — o relógio é filho absoluto dela e centra na mesma linha */
  .el-strip {
    position: absolute; left: 0; right: 0; bottom: 60px;
    display: flex; justify-content: center;
  }

  .el-bar {
    position: relative;
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
    animation: el-rise 460ms ease-out both;
  }
  .el-bar::after {
    content: ""; position: absolute; left: 14%; right: 14%; bottom: 0; height: 3px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    border-radius: 999px;
  }

  .el-name {
    display: flex; align-items: center;
    width: 400px; padding: 0 46px;
    color: #ffffff; font-size: 34px; font-weight: 800;
    letter-spacing: 0.6px; text-transform: uppercase; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    text-shadow: 0 2px 14px rgba(0,0,0,0.55);
  }
  .el-name.home { justify-content: flex-end; text-align: right; }
  .el-name.away { justify-content: flex-start; text-align: left; }

  /* placa central verde: número — brasão — número */
  .el-plate {
    display: flex; align-items: center; gap: 36px;
    padding: 16px 44px;
    background: linear-gradient(180deg,
      color-mix(in srgb, var(--accent) 82%, white),
      color-mix(in srgb, var(--accent) 78%, black));
    color: #04240f;
    box-shadow: inset 0 2px 0 rgba(255,255,255,0.40), inset 0 -14px 30px rgba(0,0,0,0.20);
  }
  .el-num {
    font-size: 60px; font-weight: 900; line-height: 1;
    min-width: 68px; text-align: center;
    font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
    text-shadow: 0 1px 0 rgba(255,255,255,0.32);
    animation: el-pop 280ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }

  /* brasão da liga — alinhado verticalmente com a barra (mesma altura, centralizado) */
  .el-crest {
    position: relative; flex: none;
    width: 108px; height: 108px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 36%, #ffffff, #eef7f1 70%, #d6e6dd);
    border: 3px solid #f6fff9;
    box-shadow:
      0 10px 26px rgba(0,0,0,0.45),
      0 0 0 7px rgba(6,10,14,0.55),
      0 0 0 9px color-mix(in srgb, var(--accent) 34%, transparent);
    animation: el-fade 520ms ease-out both;
  }
  .el-crest::before {
    content: ""; position: absolute; inset: -12px; border-radius: 999px; z-index: -1;
    background: conic-gradient(from 0deg,
      color-mix(in srgb, var(--accent) 0%, transparent) 0deg,
      color-mix(in srgb, var(--accent) 58%, transparent) 130deg,
      color-mix(in srgb, var(--accent) 0%, transparent) 260deg);
    filter: blur(4px);
    animation: el-spin 11s linear infinite;
  }
  .el-logo { width: 82%; height: 82%; object-fit: contain; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.28)); }
  .el-monogram { font-size: 38px; font-weight: 900; letter-spacing: 1px; color: #0b7a37; }

  /* relógio discreto à direita, na mesma linha vertical da barra */
  .el-clock-corner {
    position: absolute; right: 40px; top: 50%; transform: translateY(-50%);
    display: flex; align-items: center; gap: 9px;
    padding: 7px 14px; border-radius: 10px;
    background: rgba(10,13,18,0.80);
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    animation: el-fade 500ms ease-out both;
  }
  .el-cc-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--accent); flex: none; }
  .el-cc-dot.run { animation: el-blink 1s ease-in-out infinite; }
  .el-cc-dot.off { background: #ef4444; }
  .el-cc-time {
    font-size: 21px; font-weight: 800; letter-spacing: 1px;
    font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
    color: rgba(255,255,255,0.92);
  }
  .el-cc-label {
    font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    color: rgba(255,255,255,0.5);
  }

  @keyframes el-pop   { from { transform: scale(1.4); } to { transform: scale(1); } }
  @keyframes el-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes el-spin  { to { transform: rotate(360deg); } }
  @keyframes el-rise  { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes el-fade  { from { opacity: 0; } to { opacity: 1; } }
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
  const showCorner = !live || showClock || state.label.length > 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="el-wrap" style={{ "--accent": accentColor } as CSSProperties}>
        <div className="el-strip">
          <div className="el-bar">
            <div className="el-name home">{state.home.name}</div>
            <div className="el-plate">
              <span className="el-num home" key={`h-${state.home.score}`}>
                {state.home.score}
              </span>
              <div className="el-crest" aria-hidden="true">
                {logoOk && logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- rota standalone fora do app, sem next/image
                  <img className="el-logo" src={logoUrl} alt="" onError={() => setLogoOk(false)} />
                ) : (
                  <span className="el-monogram">EL</span>
                )}
              </div>
              <span className="el-num away" key={`a-${state.away.score}`}>
                {state.away.score}
              </span>
            </div>
            <div className="el-name away">{state.away.name}</div>
          </div>

          {showCorner ? (
            <div className="el-clock-corner">
              <span className={`el-cc-dot ${!live ? "off" : state.clock.running ? "run" : ""}`} />
              {!live ? (
                <span className="el-cc-label">Sem sinal</span>
              ) : (
                <>
                  {showClock ? <span className="el-cc-time">{formatClock(elapsed)}</span> : null}
                  {state.label ? <span className="el-cc-label">{state.label}</span> : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
