"use client";

import { useEffect, useState, useTransition, type CSSProperties } from "react";
import type { ClockCommand, EventKind, MatchSide, MatchState, PlayerProfile, PowerBoost, PowerBoostUse, TeamProfile } from "../../contracts/types";
import { computeElapsedMs, formatClock } from "../../shared/clock";
import { formatScore } from "../../shared/score";
import { useMatchState, useTick } from "../../shared/use-match-state";
import { TeamPicker } from "./team-picker";
import {
  attributePlayerAction,
  bumpScoreAction,
  cancelMatchAction,
  clockAction,
  deleteBoostAction,
  finishMatchAction,
  listBoostsAction,
  listRosterAction,
  recordBoostAction,
  recordEventAction,
  resetMatchAction,
  setLabelAction,
  type EventActionResult,
  type ScoreActionResult,
} from "./actions";

// Fora da shell/tema — hex via <style> + inline, sem className shadcn. UI de celular na mão.
// Design "premium": fundo com leve gradiente radial, painéis com sombra e borda translúcida, cor
// de destaque (--accent, das settings) puxando os elementos principais (start/pause do relógio,
// botão +1 GOL, halo dos números).
const CSS = `
  html, body { margin: 0; background: radial-gradient(120% 140% at 50% -10%, #17202b 0%, #0b0f14 55%); }
  * { box-sizing: border-box; }
  .el-c-wrap {
    min-height: 100dvh; padding: 18px 16px 32px; display: flex; flex-direction: column; gap: 14px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff; max-width: 720px; margin: 0 auto;
  }
  .el-c-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .el-c-title { font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; color: rgba(255,255,255,0.55); }
  .el-c-live { display: flex; align-items: center; gap: 7px; font-size: 12px; color: rgba(255,255,255,0.6); }
  .el-c-dot { width: 8px; height: 8px; border-radius: 999px; }
  .el-c-dot.on { background: var(--accent, #22c55e); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #22c55e) 25%, transparent); }
  .el-c-dot.off { background: #6b7280; }
  .el-c-error { background: rgba(248,113,113,0.14); border: 1px solid rgba(248,113,113,0.4); color: #f87171;
    font-size: 13px; padding: 8px 12px; border-radius: 10px; }

  .el-c-panel-base {
    background: linear-gradient(180deg, #171f29, #121821); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; box-shadow: 0 16px 34px -18px rgba(0,0,0,0.65);
  }

  .el-c-clock { padding: 16px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .el-c-time { font-size: 52px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums;
    letter-spacing: 1px; }
  .el-c-time.run { color: var(--accent, #22c55e); text-shadow: 0 0 26px color-mix(in srgb, var(--accent, #22c55e) 45%, transparent); }
  .el-c-time.stop { color: #fff; }
  .el-c-clock-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; }
  .el-c-startbtn { flex: 1 1 100%; height: 58px; font-size: 17px; font-weight: 900; border: 0; border-radius: 14px;
    cursor: pointer; background: var(--accent, #22c55e); color: #04170a;
    box-shadow: 0 12px 26px -10px color-mix(in srgb, var(--accent, #22c55e) 55%, transparent);
    transition: transform 120ms ease; }
  .el-c-startbtn:active { transform: scale(0.98); }
  .el-c-startbtn.pause { background: #eab308; box-shadow: 0 12px 26px -10px rgba(234,179,8,0.5); }
  .el-c-tbtn { flex: 1 1 30%; min-width: 88px; height: 42px; font-size: 13px; font-weight: 800; border-radius: 12px;
    cursor: pointer; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.14); }

  .el-c-label-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .el-c-label-input {
    flex: 1 1 140px; min-width: 0; height: 40px; padding: 0 12px; font-size: 14px;
    background: #161d26; color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; outline: none;
  }
  .el-c-label-input:focus { border-color: var(--accent, #22c55e); }
  .el-c-chip {
    height: 34px; padding: 0 12px; font-size: 11px; font-weight: 800; border-radius: 999px; cursor: pointer;
    background: rgba(255,255,255,0.04); color: #fff; border: 1px solid rgba(255,255,255,0.14); text-transform: uppercase; letter-spacing: 0.6px;
  }

  .el-c-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .el-c-panel { padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; align-items: center; }
  .el-c-name { font-size: 14px; font-weight: 800; text-transform: uppercase; text-align: center; letter-spacing: 0.4px;
    color: rgba(255,255,255,0.85); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .el-c-score { font-size: 60px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
  .el-c-plus {
    width: 100%; height: 66px; font-size: 28px; font-weight: 900; border: 0; border-radius: 14px;
    background: var(--accent, #22c55e); color: #04170a; cursor: pointer;
    box-shadow: 0 12px 24px -10px color-mix(in srgb, var(--accent, #22c55e) 55%, transparent);
    transition: transform 120ms ease;
  }
  .el-c-plus:active { transform: scale(0.97); }
  .el-c-half {
    width: 100%; height: 44px; font-size: 17px; font-weight: 900; border-radius: 12px; cursor: pointer;
    background: transparent; color: var(--accent, #22c55e); border: 1px solid color-mix(in srgb, var(--accent, #22c55e) 50%, transparent);
  }
  .el-c-minus-row { display: flex; gap: 8px; width: 100%; }
  .el-c-minus {
    flex: 1; height: 38px; font-size: 15px; font-weight: 800; border-radius: 12px; cursor: pointer;
    background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.16);
  }
  .el-c-infra-row { display: flex; gap: 6px; width: 100%; margin-top: 2px; }
  .el-c-infra {
    flex: 1; height: 38px; font-size: 11px; font-weight: 800; border-radius: 10px; cursor: pointer;
    border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.75);
    display: flex; align-items: center; justify-content: center; gap: 4px;
  }
  .el-c-infra.yellow { border-color: rgba(234,179,8,0.5); color: #eab308; }
  .el-c-infra.red { border-color: rgba(239,68,68,0.5); color: #f87171; }

  .el-c-boosts { display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }
  .el-c-boosts-label { font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4); }
  .el-c-boost-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .el-c-boost-btn {
    flex: 1 1 auto; min-width: 0; height: 30px; padding: 0 8px; font-size: 10px; font-weight: 700; border-radius: 8px; cursor: pointer;
    border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.75);
    display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;
  }
  .el-c-boost-used { display: flex; flex-wrap: wrap; gap: 4px; }
  .el-c-boost-pill {
    display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 6px 0 8px; border-radius: 999px; border: 0; cursor: pointer;
    background: color-mix(in srgb, var(--accent, #22c55e) 20%, transparent); color: var(--accent, #22c55e); font-size: 10px; font-weight: 800;
  }
  .el-c-boost-pill-x {
    display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 999px;
    background: color-mix(in srgb, var(--accent, #22c55e) 35%, transparent); font-size: 10px; line-height: 1;
  }
  .el-c-boost-pill:disabled { opacity: 0.5; cursor: default; }

  .el-c-plus:disabled, .el-c-half:disabled, .el-c-minus:disabled, .el-c-chip:disabled, .el-c-reset:disabled,
  .el-c-startbtn:disabled, .el-c-tbtn:disabled, .el-c-finish:disabled, .el-c-infra:disabled, .el-c-cancel:disabled { opacity: 0.5; cursor: default; }

  .el-c-actions { display: flex; gap: 10px; }
  .el-c-reset {
    flex: 1; height: 46px; font-size: 13px; font-weight: 800; border-radius: 12px; cursor: pointer;
    background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.2);
  }
  .el-c-finish {
    flex: 1.4; height: 46px; font-size: 13px; font-weight: 800; border-radius: 12px; cursor: pointer;
    background: rgba(248,113,113,0.12); color: #f87171; border: 1px solid rgba(248,113,113,0.4);
  }
  .el-c-cancel {
    display: block; width: 100%; margin-top: 2px; padding: 6px; background: none; border: 0; cursor: pointer;
    font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.35); text-align: center;
  }
  .el-c-cancel:hover { color: rgba(255,255,255,0.6); }
  .el-c-foot { font-size: 11px; color: rgba(255,255,255,0.35); text-align: center; word-break: break-all; }

  /* ---- folha "quem fez?" ---- */
  .el-c-sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 20;
    animation: el-c-fade 160ms ease-out both; }
  .el-c-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; max-width: 720px; margin: 0 auto;
    background: linear-gradient(180deg, #1a222d, #10151c); border-top: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px 20px 0 0; padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
    box-shadow: 0 -20px 50px rgba(0,0,0,0.5); animation: el-c-rise 200ms ease-out both;
  }
  .el-c-sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .el-c-sheet-title { font-size: 14px; font-weight: 800; margin: 0; }
  .el-c-sheet-skip { background: none; border: 0; color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 700; cursor: pointer; }
  .el-c-sheet-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 40vh; overflow-y: auto; }
  .el-c-sheet-player {
    display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 6px; border-radius: 14px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; color: #fff;
  }
  .el-c-sheet-player:active { background: rgba(255,255,255,0.1); }
  .el-c-sheet-avatar { width: 40px; height: 40px; border-radius: 999px; object-fit: cover; background: rgba(255,255,255,0.08); }
  .el-c-sheet-mono { width: 40px; height: 40px; border-radius: 999px; background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; }
  .el-c-sheet-name { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.2;
    overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .el-c-sheet-empty { font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; padding: 12px 0; }

  @keyframes el-c-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes el-c-rise { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const QUICK_LABELS = ["1º TEMPO", "INTERVALO", "2º TEMPO", "FIM DE JOGO"];

type Attribution = { eventId: string; side: MatchSide; kind: EventKind };

const EVENT_LABEL: Record<EventKind, string> = {
  goal: "o gol",
  yellow_card: "o cartão amarelo",
  red_card: "o cartão vermelho",
  foul: "a falta",
};

export function Console({
  initialState,
  teams,
  powerBoosts,
  accentColor,
  periodMs,
  periodCount,
}: {
  initialState: MatchState;
  teams: TeamProfile[];
  powerBoosts: PowerBoost[];
  accentColor: string;
  periodMs: number;
  periodCount: number;
}) {
  const { state, setState, live } = useMatchState(initialState);
  const now = useTick(250);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [overlayUrl, setOverlayUrl] = useState("/ext/erasto-league/overlay");
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [roster, setRoster] = useState<{ home: PlayerProfile[]; away: PlayerProfile[] }>({ home: [], away: [] });
  const [boosts, setBoosts] = useState<PowerBoostUse[]>([]);

  useEffect(() => {
    setOverlayUrl(`${window.location.origin}/ext/erasto-league/overlay`);
  }, []);

  // Elenco dos dois lados — buscado uma vez quando os times da partida atual ficam conhecidos
  // (troca ao trocar de partida). Alimenta a folha "quem fez?".
  useEffect(() => {
    if (!state.homeTeamId || !state.awayTeamId) {
      setRoster({ home: [], away: [] });
      return;
    }
    let cancelled = false;
    Promise.all([listRosterAction(state.homeTeamId), listRosterAction(state.awayTeamId)]).then(([home, away]) => {
      if (!cancelled) setRoster({ home, away });
    });
    return () => {
      cancelled = true;
    };
  }, [state.homeTeamId, state.awayTeamId]);

  // Power boosts já usados nesta partida — buscado quando a partida atual muda (mesmo espírito do
  // elenco acima); atualizado otimisticamente a cada novo uso em vez de refazer a busca inteira.
  useEffect(() => {
    if (!state.currentMatchId) {
      setBoosts([]);
      return;
    }
    let cancelled = false;
    listBoostsAction(state.currentMatchId).then((result) => {
      if (!cancelled) setBoosts(result);
    });
    return () => {
      cancelled = true;
    };
  }, [state.currentMatchId]);

  function useBoost(side: MatchSide, boostKey: string) {
    startTransition(async () => {
      const result = await recordBoostAction(side, boostKey);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setBoosts((prev) => [...prev, result.boost]);
    });
  }

  // "Coloquei por engano" — tira otimisticamente da lista e confirma no servidor.
  function removeBoost(boostId: string) {
    setBoosts((prev) => prev.filter((boost) => boost.id !== boostId));
    startTransition(async () => {
      const result = await deleteBoostAction(boostId);
      if (!result.ok) {
        setError(result.error ?? "Falha ao remover o boost.");
      }
    });
  }

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

  // Gol/cartão/falta: grava na hora (sem travar esperando jogador) e abre a folha "quem fez?" —
  // dispensável, corrigível depois na súmula.
  function runEvent(action: () => Promise<EventActionResult>, side: MatchSide, kind: EventKind) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setState(result.state);
      setAttribution({ eventId: result.eventId, side, kind });
    });
  }

  function attributeTo(playerId: string) {
    if (!attribution) return;
    const { eventId } = attribution;
    setAttribution(null);
    void attributePlayerAction(eventId, playerId);
  }

  function commitLabel(value: string) {
    if (value.trim() === state.label) return;
    run(() => setLabelAction(value));
  }

  function clock(command: ClockCommand) {
    run(() => clockAction(command));
  }

  if (!state.currentMatchId) {
    return (
      <TeamPicker
        teams={teams}
        accentColor={accentColor}
        preMatchMessage={state.preMatchMessage}
        onStarted={(result) => result.ok && setState(result.state)}
        onPreMatchMessageChange={(result) => result.ok && setState(result.state)}
      />
    );
  }

  const elapsed = computeElapsedMs(state.clock, now);
  const fullMatchMs = periodMs * periodCount;
  const attributionRoster = attribution ? roster[attribution.side] : [];
  const attributionTeamName = attribution ? state[attribution.side].name : "";

  return (
    <>
      <style>{CSS}</style>
      <div className="el-c-wrap" style={{ "--accent": accentColor } as CSSProperties}>
        <div className="el-c-head">
          <p className="el-c-title">Erasto League</p>
          <span className="el-c-live">
            <span className={`el-c-dot ${live ? "on" : "off"}`} />
            {live ? "ao vivo" : "reconectando…"}
          </span>
        </div>

        {error ? <div className="el-c-error">{error}</div> : null}

        {/* ---- relógio ---- */}
        <div className="el-c-clock el-c-panel-base">
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
            <div className="el-c-panel el-c-panel-base" key={side}>
              <div className="el-c-name">{state[side].name}</div>
              <div className="el-c-score">{formatScore(state[side].score)}</div>
              <button
                type="button"
                className="el-c-plus"
                disabled={pending}
                onClick={() => runEvent(() => bumpScoreAction(side, 1), side, "goal")}
              >
                +1 GOL
              </button>
              <button
                type="button"
                className="el-c-half"
                disabled={pending}
                onClick={() => runEvent(() => bumpScoreAction(side, 0.5), side, "goal")}
              >
                +0,5
              </button>
              <div className="el-c-minus-row">
                <button
                  type="button"
                  className="el-c-minus"
                  disabled={pending || state[side].score === 0}
                  onClick={() => run(() => bumpScoreAction(side, -0.5))}
                >
                  −0,5
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
              <div className="el-c-infra-row">
                <button
                  type="button"
                  className="el-c-infra yellow"
                  disabled={pending}
                  onClick={() => runEvent(() => recordEventAction("yellow_card", side), side, "yellow_card")}
                >
                  🟨 Cartão
                </button>
                <button
                  type="button"
                  className="el-c-infra red"
                  disabled={pending}
                  onClick={() => runEvent(() => recordEventAction("red_card", side), side, "red_card")}
                >
                  🟥 Cartão
                </button>
                <button
                  type="button"
                  className="el-c-infra"
                  disabled={pending}
                  onClick={() => runEvent(() => recordEventAction("foul", side), side, "foul")}
                >
                  Falta
                </button>
              </div>

              <div className="el-c-boosts">
                <span className="el-c-boosts-label">Power boosts</span>
                <div className="el-c-boost-row">
                  {powerBoosts.map((boost) => (
                    <button
                      key={boost.key}
                      type="button"
                      className="el-c-boost-btn"
                      disabled={pending}
                      title={boost.description}
                      onClick={() => useBoost(side, boost.key)}
                    >
                      {boost.emoji} {boost.label}
                    </button>
                  ))}
                </div>
                {boosts.filter((boost) => boost.side === side).length > 0 && (
                  <div className="el-c-boost-used">
                    {boosts
                      .filter((boost) => boost.side === side)
                      .map((boost) => {
                        const catalogEntry = powerBoosts.find((entry) => entry.key === boost.boostKey);
                        return (
                          <button
                            key={boost.id}
                            type="button"
                            className="el-c-boost-pill"
                            disabled={pending}
                            title="Tirar (coloquei por engano)"
                            onClick={() => removeBoost(boost.id)}
                          >
                            {catalogEntry?.emoji} {catalogEntry?.label ?? boost.boostKey}
                            <span className="el-c-boost-pill-x">×</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="el-c-actions">
          <button type="button" className="el-c-reset" disabled={pending} onClick={() => run(() => resetMatchAction())}>
            Zerar placar e relógio
          </button>
          <button
            type="button"
            className="el-c-finish"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Encerrar a partida e salvar o placar no histórico?")) {
                run(() => finishMatchAction());
              }
            }}
          >
            Encerrar partida e salvar placar
          </button>
        </div>

        <button
          type="button"
          className="el-c-cancel"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Cancelar esta partida sem salvar o placar? Não entra na súmula nem na classificação.")) {
              run(() => cancelMatchAction());
            }
          }}
        >
          Cancelar partida (não salva o placar)
        </button>

        <p className="el-c-foot">
          OBS → fonte de navegador em {overlayUrl} · tempo total {formatClock(fullMatchMs)}
        </p>
      </div>

      {attribution && (
        <>
          <div className="el-c-sheet-backdrop" onClick={() => setAttribution(null)} />
          <div className="el-c-sheet">
            <div className="el-c-sheet-head">
              <p className="el-c-sheet-title">
                Quem fez {EVENT_LABEL[attribution.kind]} d{attribution.side === "home" ? "a" : "o"} {attributionTeamName}?
              </p>
              <button type="button" className="el-c-sheet-skip" onClick={() => setAttribution(null)}>
                Pular
              </button>
            </div>
            {attributionRoster.length === 0 ? (
              <p className="el-c-sheet-empty">Nenhum jogador cadastrado nesse time ainda — dá pra atribuir depois na súmula.</p>
            ) : (
              <div className="el-c-sheet-grid">
                {attributionRoster.map((player) => (
                  <button key={player.id} type="button" className="el-c-sheet-player" onClick={() => attributeTo(player.id)}>
                    {player.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="el-c-sheet-avatar" src={player.photoUrl} alt="" />
                    ) : (
                      <div className="el-c-sheet-mono">{player.name.slice(0, 2).toUpperCase()}</div>
                    )}
                    <span className="el-c-sheet-name">
                      {player.number != null ? `#${player.number} ` : ""}
                      {player.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
