"use client";

import { useEffect, useState, useTransition } from "react";
import type { ClockCommand, MatchSide, MatchState } from "../../contracts/types";
import { computeElapsedMs, formatClock } from "../../shared/clock";
import { useMatchState, useTick } from "../../shared/use-match-state";
import {
  bumpScoreAction,
  clockAction,
  newMatchAction,
  resetMatchAction,
  setLabelAction,
  setTeamNameAction,
  type ScoreActionResult,
} from "./actions";

// Fora da shell/tema — hex via <style> + inline, sem className shadcn. UI de celular na mão.
const CSS = `
  html, body { margin: 0; background: #0b0f14; }
  * { box-sizing: border-box; }
  .el-c-wrap {
    min-height: 100dvh; padding: 16px; display: flex; flex-direction: column; gap: 14px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff; max-width: 720px; margin: 0 auto;
  }
  .el-c-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .el-c-title { font-size: 16px; font-weight: 800; margin: 0; letter-spacing: 0.5px; }
  .el-c-live { display: flex; align-items: center; gap: 7px; font-size: 12px; color: rgba(255,255,255,0.6); }
  .el-c-dot { width: 9px; height: 9px; border-radius: 999px; }
  .el-c-dot.on { background: #22c55e; }
  .el-c-dot.off { background: #6b7280; }
  .el-c-banner { background: rgba(234,179,8,0.14); border: 1px solid rgba(234,179,8,0.4); color: #eab308;
    font-size: 12px; padding: 8px 12px; border-radius: 10px; }
  .el-c-error { background: rgba(248,113,113,0.14); border: 1px solid rgba(248,113,113,0.4); color: #f87171;
    font-size: 13px; padding: 8px 12px; border-radius: 10px; }

  .el-c-clock { background: #161d26; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
    padding: 16px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .el-c-time { font-size: 56px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums;
    letter-spacing: 1px; }
  .el-c-time.run { color: #22c55e; }
  .el-c-time.stop { color: #fff; }
  .el-c-clock-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; }
  .el-c-startbtn { flex: 1 1 100%; height: 60px; font-size: 18px; font-weight: 900; border: 0; border-radius: 14px;
    cursor: pointer; background: #22c55e; color: #05230f; }
  .el-c-startbtn.pause { background: #eab308; }
  .el-c-tbtn { flex: 1 1 30%; min-width: 92px; height: 44px; font-size: 14px; font-weight: 800; border-radius: 12px;
    cursor: pointer; background: transparent; color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.18); }

  .el-c-label-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .el-c-label-input {
    flex: 1 1 140px; min-width: 0; height: 40px; padding: 0 12px; font-size: 14px;
    background: #161d26; color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; outline: none;
  }
  .el-c-label-input:focus { border-color: #22c55e; }
  .el-c-chip {
    height: 36px; padding: 0 12px; font-size: 12px; font-weight: 700; border-radius: 999px; cursor: pointer;
    background: #161d26; color: #fff; border: 1px solid rgba(255,255,255,0.14); text-transform: uppercase; letter-spacing: 1px;
  }
  .el-c-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .el-c-panel { background: #161d26; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px;
    display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .el-c-name {
    width: 100%; height: 44px; text-align: center; font-size: 15px; font-weight: 700; text-transform: uppercase;
    background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; outline: none;
  }
  .el-c-name:focus { border-color: #22c55e; }
  .el-c-score { font-size: 68px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
  .el-c-plus {
    width: 100%; height: 76px; font-size: 34px; font-weight: 900; border: 0; border-radius: 14px;
    background: #22c55e; color: #05230f; cursor: pointer;
  }
  .el-c-minus {
    width: 100%; height: 46px; font-size: 20px; font-weight: 800; border-radius: 12px; cursor: pointer;
    background: transparent; color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.18);
  }
  .el-c-plus:disabled, .el-c-minus:disabled, .el-c-chip:disabled, .el-c-reset:disabled,
  .el-c-startbtn:disabled, .el-c-tbtn:disabled, .el-c-new:disabled { opacity: 0.55; cursor: default; }
  .el-c-actions { display: flex; gap: 10px; }
  .el-c-reset {
    flex: 1; height: 46px; font-size: 14px; font-weight: 800; border-radius: 12px; cursor: pointer;
    background: transparent; color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.2);
  }
  .el-c-new {
    flex: 1; height: 46px; font-size: 14px; font-weight: 800; border-radius: 12px; cursor: pointer;
    background: transparent; color: #f87171; border: 1px solid rgba(248,113,113,0.4);
  }
  .el-c-foot { font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; word-break: break-all; }
`;

const QUICK_LABELS = ["1º TEMPO", "INTERVALO", "2º TEMPO", "FIM DE JOGO"];

export function Console({
  initialState,
  usingDefaultPin,
  periodMs,
  periodCount,
}: {
  initialState: MatchState;
  usingDefaultPin: boolean;
  periodMs: number;
  periodCount: number;
}) {
  const { state, setState, live } = useMatchState(initialState);
  const now = useTick(250);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [overlayUrl, setOverlayUrl] = useState("/ext/erasto-league/overlay");

  useEffect(() => {
    setOverlayUrl(`${window.location.origin}/ext/erasto-league/overlay`);
  }, []);

  function run(action: () => Promise<ScoreActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setState(result.state);
    });
  }

  function commitName(side: MatchSide, value: string) {
    if (value.trim() === state[side].name) return;
    run(() => setTeamNameAction(side, value));
  }

  function commitLabel(value: string) {
    if (value.trim() === state.label) return;
    run(() => setLabelAction(value));
  }

  function clock(command: ClockCommand) {
    run(() => clockAction(command));
  }

  const elapsed = computeElapsedMs(state.clock, now);
  const fullMatchMs = periodMs * periodCount;

  // Atalhos de relógio derivados das settings (jogos de 20min = 2 × 10). Só mostra os tempos que
  // existem (periodCount) + o "Fim de jogo".
  const quickSets: { label: string; ms: number }[] = [];
  for (let p = 1; p <= periodCount; p += 1) {
    quickSets.push({ label: p === periodCount ? "FIM DE JOGO" : `FIM ${p}º`, ms: periodMs * p });
  }
  if (periodCount > 1) quickSets.unshift({ label: "00:00", ms: 0 });

  return (
    <>
      <style>{CSS}</style>
      <div className="el-c-wrap">
        <div className="el-c-head">
          <p className="el-c-title">ERASTO LEAGUE</p>
          <span className="el-c-live">
            <span className={`el-c-dot ${live ? "on" : "off"}`} />
            {live ? "ao vivo" : "reconectando…"}
          </span>
        </div>

        {usingDefaultPin ? (
          <div className="el-c-banner">
            PIN padrão <strong>1234</strong> em uso — defina em <code>/admin/erasto-league</code> ou
            na env <code>ERASTO_LEAGUE_PIN</code>.
          </div>
        ) : null}
        {error ? <div className="el-c-error">{error}</div> : null}

        {/* ---- relógio ---- */}
        <div className="el-c-clock">
          <div className={`el-c-time ${state.clock.running ? "run" : "stop"}`}>{formatClock(elapsed)}</div>
          <div className="el-c-clock-row">
            <button
              type="button"
              className={`el-c-startbtn ${state.clock.running ? "pause" : ""}`}
              disabled={pending}
              onClick={() => clock({ kind: state.clock.running ? "pause" : "start" })}
            >
              {state.clock.running ? "⏸ PAUSAR" : "▶ INICIAR"}
            </button>
            <button type="button" className="el-c-tbtn" disabled={pending} onClick={() => clock({ kind: "adjust", deltaMs: -60_000 })}>
              −1:00
            </button>
            <button type="button" className="el-c-tbtn" disabled={pending} onClick={() => clock({ kind: "adjust", deltaMs: 60_000 })}>
              +1:00
            </button>
            <button type="button" className="el-c-tbtn" disabled={pending} onClick={() => clock({ kind: "reset" })}>
              ↺ ZERAR
            </button>
          </div>
          <div className="el-c-clock-row">
            {quickSets.map((q) => (
              <button
                key={q.label}
                type="button"
                className="el-c-tbtn"
                disabled={pending}
                onClick={() => clock({ kind: "set", ms: q.ms })}
              >
                {q.label} · {formatClock(q.ms)}
              </button>
            ))}
          </div>
        </div>

        {/* ---- etiqueta ---- */}
        <div className="el-c-label-row">
          <input
            className="el-c-label-input"
            key={`label-${state.label}`}
            defaultValue={state.label}
            placeholder="Etiqueta do placar (opcional)"
            maxLength={24}
            onBlur={(e) => commitLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          {QUICK_LABELS.map((quick) => (
            <button
              key={quick}
              type="button"
              className="el-c-chip"
              disabled={pending}
              onClick={() => run(() => setLabelAction(state.label === quick ? "" : quick))}
            >
              {quick}
            </button>
          ))}
        </div>

        {/* ---- placar ---- */}
        <div className="el-c-grid">
          {(["home", "away"] as const).map((side) => (
            <div className="el-c-panel" key={side}>
              <input
                className="el-c-name"
                key={`name-${side}-${state[side].name}`}
                defaultValue={state[side].name}
                maxLength={40}
                onBlur={(e) => commitName(side, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
              <div className="el-c-score">{state[side].score}</div>
              <button
                type="button"
                className="el-c-plus"
                disabled={pending}
                onClick={() => run(() => bumpScoreAction(side, 1))}
              >
                +1 GOL
              </button>
              <button
                type="button"
                className="el-c-minus"
                disabled={pending || state[side].score === 0}
                onClick={() => run(() => bumpScoreAction(side, -1))}
              >
                −1
              </button>
            </div>
          ))}
        </div>

        <div className="el-c-actions">
          <button
            type="button"
            className="el-c-reset"
            disabled={pending}
            onClick={() => run(() => resetMatchAction())}
          >
            Zerar placar e relógio
          </button>
          <button
            type="button"
            className="el-c-new"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Nova partida? Zera placar, relógio, etiqueta e os nomes dos times.")) {
                run(() => newMatchAction());
              }
            }}
          >
            Nova partida
          </button>
        </div>

        <p className="el-c-foot">
          OBS → fonte de navegador em {overlayUrl} · tempo total {formatClock(fullMatchMs)}
        </p>
      </div>
    </>
  );
}
