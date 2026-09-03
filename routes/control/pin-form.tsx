"use client";

import { useActionState } from "react";
import { submitPinAction, type SubmitPinState } from "./actions";

// Fora da shell/tema — cores em hex via <style> + inline, sem className shadcn (mesmo motivo do
// overlay). Escala em px/rem normal: aqui é um celular na mão, não uma TV vista de longe.
const CSS = `
  html, body { margin: 0; background: #0b0f14; }
  .el-pin-wrap {
    min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .el-pin-card {
    width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 18px;
    background: #161d26; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 28px;
  }
  .el-pin-title { color: #fff; font-size: 20px; font-weight: 800; margin: 0; }
  .el-pin-sub { color: rgba(255,255,255,0.55); font-size: 14px; margin: 0; }
  .el-pin-input {
    height: 56px; font-size: 22px; text-align: center; letter-spacing: 8px;
    background: rgba(255,255,255,0.06); color: #fff;
    border: 1px solid rgba(255,255,255,0.16); border-radius: 12px; outline: none;
  }
  .el-pin-input:focus { border-color: #22c55e; }
  .el-pin-btn {
    height: 52px; font-size: 16px; font-weight: 800; border: 0; border-radius: 12px;
    background: #22c55e; color: #05230f; cursor: pointer;
  }
  .el-pin-btn:disabled { opacity: 0.6; cursor: default; }
  .el-pin-error { color: #f87171; font-size: 14px; margin: 0; text-align: center; }
  .el-pin-hint { color: #eab308; font-size: 13px; margin: 0; text-align: center; }
`;

const initialState: SubmitPinState = { error: null };

export function PinForm({ usingDefaultPin }: { usingDefaultPin: boolean }) {
  const [state, formAction, pending] = useActionState(submitPinAction, initialState);

  return (
    <>
      <style>{CSS}</style>
      <div className="el-pin-wrap">
        <form className="el-pin-card" action={formAction}>
          <div>
            <p className="el-pin-title">Erasto League — controle</p>
            <p className="el-pin-sub">Digite o PIN pra liberar o placar.</p>
          </div>
          <input
            className="el-pin-input"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="PIN"
          />
          {state.error ? <p className="el-pin-error">{state.error}</p> : null}
          <button className="el-pin-btn" type="submit" disabled={pending}>
            {pending ? "Verificando…" : "Entrar"}
          </button>
          {usingDefaultPin ? (
            <p className="el-pin-hint">
              Usando PIN padrão <strong>1234</strong>. Defina <code>ERASTO_LEAGUE_PIN</code> no
              ambiente pra trocar.
            </p>
          ) : null}
        </form>
      </div>
    </>
  );
}
