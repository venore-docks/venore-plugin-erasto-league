"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { VoteCallout } from "../../runtime/fan-votes";
import type { QrSvg } from "../../shared/qr";
import { getVoteCalloutAction } from "./actions";

export type VoteOverlayPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Fora da shell/tema do site (fonte do OBS) — mesmas regras do overlay do placar
// (routes/overlay/scoreboard.tsx): nada de className shadcn, CSS próprio injetado, px fixos (a
// fonte de navegador do OBS tem resolução fixa) e cor de destaque vinda das settings via --accent.
const CSS = `
  html, body { background: transparent !important; margin: 0; }

  .elv-wrap {
    position: fixed; inset: 0; pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .elv-card {
    position: absolute; display: flex; align-items: center; gap: 26px;
    width: 560px; padding: 22px 28px 22px 22px; border-radius: 26px;
    background: linear-gradient(180deg, rgba(15,20,26,0.92), rgba(8,11,15,0.95));
    border: 1px solid rgba(255,255,255,0.10); border-top-color: rgba(255,255,255,0.24);
    box-shadow: 0 30px 70px rgba(0,0,0,0.55), 0 8px 24px color-mix(in srgb, var(--accent) 22%, transparent);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    animation: elv-in 420ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
  }
  .elv-card::after {
    content: ""; position: absolute; left: 22px; right: 22px; bottom: 0; height: 3px; border-radius: 999px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }
  .elv-card.top-left { top: 48px; left: 48px; }
  .elv-card.top-right { top: 48px; right: 48px; }
  .elv-card.bottom-left { bottom: 48px; left: 48px; }
  .elv-card.bottom-right { bottom: 48px; right: 48px; }

  .elv-qr { flex: none; width: 196px; height: 196px; padding: 12px; border-radius: 18px; background: #ffffff;
    box-shadow: 0 10px 26px rgba(0,0,0,0.35); }
  .elv-qr svg { display: block; width: 100%; height: 100%; }

  .elv-text { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .elv-eyebrow { color: var(--accent); font-size: 18px; font-weight: 900; letter-spacing: 1px; white-space: nowrap; text-transform: uppercase; }
  .elv-title { color: #fff; font-size: 34px; font-weight: 900; line-height: 1.08; text-transform: uppercase;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .elv-hint { color: rgba(255,255,255,0.78); font-size: 19px; font-weight: 600; }
  .elv-url { color: #fff; font-size: 17px; font-weight: 800; opacity: 0.9; overflow-wrap: anywhere; }

  @keyframes elv-in { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

// O overlay só pergunta "o que chamar agora?" — a votação abre/fecha sozinha (apito inicial até N
// horas depois do jogo), então sem poll a fonte ficaria mostrando QR de votação já encerrada.
const POLL_MS = 30_000;

export function VoteQrOverlay({
  initialCallout,
  qr,
  displayUrl,
  accentColor,
  position,
}: {
  initialCallout: VoteCallout;
  qr: QrSvg;
  displayUrl: string;
  accentColor: string;
  position: VoteOverlayPosition;
}) {
  const [callout, setCallout] = useState<VoteCallout>(initialCallout);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      getVoteCalloutAction()
        .then((next) => {
          if (!cancelled) setCallout(next);
        })
        .catch(() => {
          // rede instável — mantém o último estado, próximo tick tenta de novo
        });
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="elv-wrap" style={{ "--accent": accentColor } as CSSProperties}>
        {callout && (
          <div key={callout.kind === "match" ? callout.matchId : "favorite"} className={`elv-card ${position}`}>
            <div className="elv-qr">
              <svg viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" aria-label="QR code da votação">
                <path d={qr.path} fill="#000000" />
              </svg>
            </div>
            <div className="elv-text">
              <span className="elv-eyebrow">{callout.kind === "match" ? "⭐ Jogador da Torcida" : "💚 Time favorito"}</span>
              <span className="elv-title">{callout.kind === "match" ? callout.title : "Vote no seu time"}</span>
              <span className="elv-hint">Aponte a câmera do celular e vote</span>
              <span className="elv-url">{displayUrl}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
