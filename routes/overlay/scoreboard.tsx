"use client";

import { useState, type CSSProperties } from "react";
import type { MatchState } from "../../contracts/types";
import { computeElapsedMs, formatClock } from "../../shared/clock";
import { useMatchState, useTick } from "../../shared/use-match-state";

// Fora da shell/tema do site — nada de className shadcn aqui (as CSS vars de cor do tema não
// existem nesta rota). Cor de destaque entra por --accent (style inline, vindo das settings); o
// resto é hex via <style> injetado. Tamanhos em px: a fonte de navegador do OBS tem resolução
// fixa. Escala pensada pra ~1920px de largura de cena.
const CSS = `
  html, body { background: transparent !important; margin: 0; }

  .el-wrap {
    position: fixed; inset: 0; pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
    padding-bottom: 64px;
    -webkit-font-smoothing: antialiased;
    --accent: #22c55e;
  }

  /* pílula flutuante: só etiqueta + estado da conexão (o relógio foi pra dentro da barra) */
  .el-chip {
    display: flex; align-items: center; gap: 11px;
    margin-bottom: 38px;
    padding: 8px 22px 8px 15px; border-radius: 999px;
    background: linear-gradient(180deg, rgba(22,28,34,0.94), rgba(12,16,20,0.94));
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 12px 30px rgba(0,0,0,0.5);
    color: #eafff2; font-size: 14px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
    animation: el-rise 420ms ease-out both;
  }
  .el-dot { width: 10px; height: 10px; border-radius: 999px; flex: none; background: var(--accent); }
  .el-dot.on  { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 24%, transparent); animation: el-blink 1.6s ease-in-out infinite; }
  .el-dot.off { background: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,0.20); }

  .el-bar {
    position: relative;
    display: flex; align-items: stretch;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(15,20,26,0.90), rgba(8,11,15,0.93));
    border: 1px solid rgba(255,255,255,0.09);
    border-top-color: rgba(255,255,255,0.22);
    box-shadow:
      0 30px 70px rgba(0,0,0,0.55),
      0 8px 24px color-mix(in srgb, var(--accent) 18%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.07);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    animation: el-rise 460ms ease-out both;
  }
  .el-bar::after {
    content: ""; position: absolute; left: 12%; right: 12%; bottom: 0; height: 3px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    border-radius: 999px;
  }

  /* logo da liga — crest no canto esquerdo, transbordando um pouco pra fora da barra */
  .el-crest { width: 176px; display: flex; align-items: center; justify-content: center; }
  .el-badge {
    position: relative;
    width: 156px; height: 156px; border-radius: 999px;
    transform: translateX(-16px);
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 36%, #ffffff, #eef7f1 70%, #d6e6dd);
    border: 3px solid #f6fff9;
    box-shadow:
      0 16px 36px rgba(0,0,0,0.45),
      0 0 0 8px rgba(6,10,14,0.60),
      0 0 0 10px color-mix(in srgb, var(--accent) 34%, transparent);
    animation: el-fade 520ms ease-out both;
  }
  .el-badge::before {
    content: ""; position: absolute; inset: -14px; border-radius: 999px; z-index: -1;
    background: conic-gradient(from 0deg,
      color-mix(in srgb, var(--accent) 0%, transparent) 0deg,
      color-mix(in srgb, var(--accent) 60%, transparent) 130deg,
      color-mix(in srgb, var(--accent) 0%, transparent) 260deg);
    filter: blur(4px);
    animation: el-spin 11s linear infinite;
  }
  .el-logo { width: 84%; height: 84%; object-fit: contain; filter: drop-shadow(0 3px 7px rgba(0,0,0,0.28)); }
  .el-monogram { font-size: 48px; font-weight: 900; letter-spacing: 1px; color: #0b7a37; }

  .el-name {
    display: flex; align-items: center;
    width: 400px; padding: 0 40px;
    color: #ffffff; font-size: 34px; font-weight: 800;
    letter-spacing: 0.6px; text-transform: uppercase; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    text-shadow: 0 2px 14px rgba(0,0,0,0.55);
  }
  .el-name.home { justify-content: flex-end; text-align: right; }
  .el-name.away { justify-content: flex-start; text-align: left; }

  /* placa central com os números; o relógio fica numa cápsula escura montada no topo dela */
  .el-plate {
    position: relative;
    display: flex; align-items: center;
    padding: 30px 96px;
    background: linear-gradient(180deg,
      color-mix(in srgb, var(--accent) 82%, white),
      color-mix(in srgb, var(--accent) 78%, black));
    color: #04240f;
    box-shadow: inset 0 2px 0 rgba(255,255,255,0.40), inset 0 -14px 30px rgba(0,0,0,0.20);
  }
  .el-num {
    font-size: 66px; font-weight: 900; line-height: 1;
    min-width: 80px; text-align: center;
    font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
    text-shadow: 0 1px 0 rgba(255,255,255,0.32);
    animation: el-pop 280ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }
  .el-num.home { margin-right: 82px; }
  .el-num.away { margin-left: 82px; }

  .el-clock-slot {
    position: absolute; left: 50%; top: 0; transform: translate(-50%, -52%);
    display: flex; align-items: center; gap: 9px;
    padding: 7px 18px; border-radius: 999px;
    background: linear-gradient(180deg, #12171e, #0a0d12);
    border: 1px solid color-mix(in srgb, var(--accent) 45%, rgba(255,255,255,0.14));
    box-shadow: 0 10px 24px rgba(0,0,0,0.5);
  }
  .el-clock-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--accent); flex: none; }
  .el-clock-dot.run { animation: el-blink 1s ease-in-out infinite; }
  .el-clock {
    font-size: 27px; font-weight: 900; letter-spacing: 1px;
    font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
    color: #ffffff;
  }
  .el-clock.run { color: var(--accent); }

  @keyframes el-pop   { from { transform: scale(1.4); } to { transform: scale(1); } }
  @keyframes el-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.32; } }
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
  const showChip = !live || state.label.length > 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="el-wrap" style={{ "--accent": accentColor } as CSSProperties}>
        {showChip ? (
          <div className="el-chip">
            <span className={`el-dot ${live ? "on" : "off"}`} />
            {!live ? "Sem sinal" : state.label}
          </div>
        ) : null}

        <div className="el-bar">
          <div className="el-crest" aria-hidden="true">
            <div className="el-badge">
              {logoOk && logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- rota standalone fora do app, sem next/image
                <img className="el-logo" src={logoUrl} alt="" onError={() => setLogoOk(false)} />
              ) : (
                <span className="el-monogram">EL</span>
              )}
            </div>
          </div>

          <div className="el-name home">{state.home.name}</div>

          <div className="el-plate">
            {showClock ? (
              <div className="el-clock-slot">
                <span className={`el-clock-dot ${state.clock.running ? "run" : ""}`} />
                <span className={`el-clock ${state.clock.running ? "run" : ""}`}>{formatClock(elapsed)}</span>
              </div>
            ) : null}
            <span className="el-num home" key={`h-${state.home.score}`}>
              {state.home.score}
            </span>
            <span className="el-num away" key={`a-${state.away.score}`}>
              {state.away.score}
            </span>
          </div>

          <div className="el-name away">{state.away.name}</div>

          <div className="el-crest" aria-hidden="true" />
        </div>
      </div>
    </>
  );
}
