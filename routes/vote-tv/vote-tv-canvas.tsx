"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { resolveTvStageTransform, type TvStageTransform } from "../../shared/tv-stage";
import type { QrSvg } from "../../shared/qr";
import type { FanVoteResults } from "../../runtime/fan-votes";
import type { VoteTvData, VoteTvMatch } from "../../runtime/vote-tv";
import { getVoteTvDataAction, getVoteTvVersionAction } from "./actions";

export type VoteTvPin = "match" | "favorite" | null;

// Fora da shell/tema (TV/projetor) — mesmas regras de routes/tv/tv-canvas.tsx: CSS próprio, palco
// 1920 de largura escalado pro viewport (shared/tv-stage.ts), cor de destaque via --accent.
const PAGE_DURATION_MS = 15_000;
// Votos chegam o tempo todo durante a votação — poll mais curto que a TV das tabelas (60s), mas só
// do fingerprint barato (getVoteTvVersionAction); a leitura completa só quando ele muda.
const VERSION_POLL_MS = 20_000;

const CSS = `
  html, body { margin: 0; background: #0a0d12; }
  * { box-sizing: border-box; }
  .elvt-stage {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff; background: radial-gradient(120% 140% at 50% -10%, #17202b 0%, #0a0d12 55%);
    display: flex; flex-direction: column;
  }
  .elvt-head { display: flex; align-items: center; justify-content: space-between; padding: 40px 64px 0; }
  .elvt-eyebrow { font-size: 20px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin: 0; }
  .elvt-title { font-size: 52px; font-weight: 900; margin: 8px 0 0; }
  .elvt-title-bar { width: 84px; height: 6px; border-radius: 999px; background: var(--accent); margin-top: 14px; }
  .elvt-brand { height: 96px; max-width: 380px; width: auto; object-fit: contain; filter: brightness(0) invert(1); }

  .elvt-body { flex: 1; min-height: 0; display: flex; gap: 40px; padding: 28px 64px 40px; }
  .elvt-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 22px; }

  .elvt-match { display: flex; align-items: center; gap: 18px; }
  .elvt-match-crest { width: 64px; height: 64px; border-radius: 999px; object-fit: cover; flex: none;
    border: 4px solid var(--team-color, rgba(255,255,255,0.25)); }
  .elvt-match-crest-mono { width: 64px; height: 64px; border-radius: 999px; flex: none; display: flex; align-items: center;
    justify-content: center; font-size: 20px; font-weight: 900; background: rgba(255,255,255,0.08);
    border: 4px solid var(--team-color, rgba(255,255,255,0.25)); }
  .elvt-match-name { font-size: 34px; font-weight: 900; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .elvt-match-vs { font-size: 28px; font-weight: 900; font-style: italic; color: rgba(255,255,255,0.4); }
  .elvt-badge { margin-left: auto; flex: none; padding: 8px 18px; border-radius: 999px; font-size: 16px; font-weight: 900;
    letter-spacing: 1.5px; text-transform: uppercase; background: var(--accent); color: #04170a; }
  .elvt-badge.closed { background: rgba(255,255,255,0.14); color: #fff; }

  .elvt-list { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 16px; }
  .elvt-row { position: relative; display: flex; align-items: center; gap: 24px; padding: 18px 28px; border-radius: 22px; overflow: hidden;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
  .elvt-row.top { border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
  .elvt-row-fill { position: absolute; inset: 0 auto 0 0; background: color-mix(in srgb, var(--row-color, var(--accent)) 26%, transparent);
    transition: width 700ms cubic-bezier(0.2, 0.9, 0.2, 1); }
  .elvt-rank { position: relative; width: 56px; text-align: center; font-size: 34px; font-weight: 900; color: rgba(255,255,255,0.5); flex: none; }
  .elvt-avatar { position: relative; width: 84px; height: 84px; border-radius: 999px; object-fit: cover; flex: none;
    box-shadow: 0 8px 18px -6px rgba(0,0,0,0.5); }
  .elvt-avatar-mono { position: relative; width: 84px; height: 84px; border-radius: 999px; flex: none; display: flex; align-items: center;
    justify-content: center; font-size: 26px; font-weight: 900; background: rgba(255,255,255,0.1); }
  .elvt-names { position: relative; flex: 1; min-width: 0; }
  .elvt-name { font-size: 38px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .elvt-sub { font-size: 22px; font-weight: 600; color: rgba(255,255,255,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .elvt-pct { position: relative; flex: none; text-align: right; }
  .elvt-pct-value { font-size: 48px; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--accent); }
  .elvt-pct-votes { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.5); font-variant-numeric: tabular-nums; }
  .elvt-total { font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.45); }
  .elvt-empty { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 34px; font-weight: 700;
    color: rgba(255,255,255,0.45); padding: 0 40px; }

  .elvt-qr-panel { width: 440px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
    border-radius: 28px; padding: 36px; background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
    border: 1px solid rgba(255,255,255,0.12); }
  .elvt-qr-title { font-size: 34px; font-weight: 900; text-align: center; line-height: 1.1; }
  .elvt-qr { width: 340px; height: 340px; padding: 18px; border-radius: 24px; background: #fff; }
  .elvt-qr svg { display: block; width: 100%; height: 100%; }
  .elvt-qr-url { font-size: 20px; font-weight: 800; text-align: center; color: rgba(255,255,255,0.8); word-break: break-all; }

  .elvt-foot { padding: 0 64px 36px; }
  .elvt-bar { height: 6px; width: 100%; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
  .elvt-bar-fill { height: 100%; border-radius: 999px; background: var(--accent); }
  @keyframes elvt-progress { from { width: 0%; } to { width: 100%; } }
`;

type VotePage = "match" | "favorite";

const RANK_MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

function ResultRows({ results, emptyMessage }: { results: FanVoteResults; emptyMessage: string }) {
  if (results.entries.length === 0) {
    return <p className="elvt-empty">{emptyMessage}</p>;
  }
  return (
    <div className="elvt-list">
      {results.entries.map((entry, index) => (
        <div
          key={entry.id}
          className={`elvt-row ${index === 0 ? "top" : ""}`}
          style={{ "--row-color": entry.color ?? undefined } as CSSProperties}
        >
          <span className="elvt-row-fill" style={{ width: `${entry.percent}%` }} />
          <span className="elvt-rank">{RANK_MEDAL[index] ?? index + 1}</span>
          {entry.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="elvt-avatar" src={entry.imageUrl} alt="" />
          ) : (
            <span className="elvt-avatar-mono">{entry.name.slice(0, 2).toUpperCase()}</span>
          )}
          <div className="elvt-names">
            <div className="elvt-name">{entry.name}</div>
            {entry.subtitle && <div className="elvt-sub">{entry.subtitle}</div>}
          </div>
          <div className="elvt-pct">
            <div className="elvt-pct-value">{entry.percent}%</div>
            <div className="elvt-pct-votes">
              {entry.votes} voto{entry.votes === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCrest({ url, name, color }: { url: string | null; name: string; color: string | null }) {
  const style = { "--team-color": color ?? undefined } as CSSProperties;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="elvt-match-crest" src={url} alt="" style={style} />;
  }
  return (
    <span className="elvt-match-crest-mono" style={style}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function MatchPage({ match, now }: { match: VoteTvMatch; now: number }) {
  const isOpen = match.closesAt === null ? match.isOpen : now < match.closesAt;
  return (
    <>
      <div className="elvt-match">
        <MatchCrest url={match.homeCrestUrl} name={match.homeName} color={match.homeColor} />
        <span className="elvt-match-name">{match.homeName}</span>
        <span className="elvt-match-vs">×</span>
        <span className="elvt-match-name">{match.awayName}</span>
        <MatchCrest url={match.awayCrestUrl} name={match.awayName} color={match.awayColor} />
        <span className={`elvt-badge ${isOpen ? "" : "closed"}`}>{isOpen ? "Parcial" : "Resultado final"}</span>
      </div>
      <ResultRows results={match.results} emptyMessage="Nenhum voto ainda — aponte a câmera pro QR e escolha o Jogador da Torcida!" />
      {match.results.totalVotes > 0 && <p className="elvt-total">{match.results.totalVotes} votos no total</p>}
    </>
  );
}

function FavoritePage({ favorite }: { favorite: VoteTvData["favorite"] }) {
  return (
    <>
      <div className="elvt-match">
        <span className="elvt-match-name">Temporada</span>
        <span className={`elvt-badge ${favorite.isOpen ? "" : "closed"}`}>{favorite.isOpen ? "Parcial" : "Votação encerrada"}</span>
      </div>
      <ResultRows results={favorite.results} emptyMessage="Nenhum voto ainda — qual é o seu time favorito?" />
      {favorite.results.totalVotes > 0 && <p className="elvt-total">{favorite.results.totalVotes} votos no total</p>}
    </>
  );
}

function useTvStageTransform(): TvStageTransform {
  const [transform, setTransform] = useState<TvStageTransform>(() => resolveTvStageTransform(0, 0));
  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (!cancelled) setTransform(resolveTvStageTransform(window.innerWidth, window.innerHeight));
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

// Relógio de parede em minuto — só pra "Parcial" virar "Resultado final" na hora do fechamento,
// sem depender de chegar voto novo (o fingerprint não muda sozinho quando a janela fecha).
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

export function VoteTvCanvas({
  initialData,
  initialVersion,
  accentColor,
  brandLogoUrl,
  qr,
  displayUrl,
  pin,
}: {
  initialData: VoteTvData;
  initialVersion: string;
  accentColor: string;
  brandLogoUrl: string | null;
  qr: QrSvg;
  displayUrl: string;
  pin: VoteTvPin;
}) {
  const [data, setData] = useState(initialData);
  const versionRef = useRef(initialVersion);
  const stage = useTvStageTransform();
  const now = useMinuteClock();

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      getVoteTvVersionAction()
        .then((version) => {
          if (cancelled || version === versionRef.current) return;
          versionRef.current = version;
          return getVoteTvDataAction().then((next) => {
            if (!cancelled) setData(next);
          });
        })
        .catch(() => {
          // rede instável — próximo tick tenta de novo
        });
    }, VERSION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const available: VotePage[] = [];
  if (data.match) available.push("match");
  if (data.favorite.isOpen || data.favorite.results.totalVotes > 0) available.push("favorite");
  const pages: VotePage[] = pin ? (available.includes(pin) ? [pin] : []) : available;

  const [pageIndex, setPageIndex] = useState(0);
  const safeIndex = pages.length === 0 ? 0 : Math.min(pageIndex, pages.length - 1);
  const current = pages[safeIndex] ?? null;

  useEffect(() => {
    if (pages.length <= 1) return;
    const timeoutId = setTimeout(() => setPageIndex((index) => (index + 1) % pages.length), PAGE_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [safeIndex, pages.length]);

  const title = current === "match" ? "Jogador da Torcida" : current === "favorite" ? "Time favorito" : "Votação da torcida";

  return (
    <>
      <style>{CSS}</style>
      <div className="fixed inset-0 overflow-hidden" style={{ "--accent": accentColor } as CSSProperties}>
        <div
          className="elvt-stage absolute top-0 left-0"
          style={{
            width: `${stage.stageWidthPx}px`,
            height: `${stage.stageHeightPx}px`,
            transform: `scale(${stage.scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className="elvt-head">
            <div>
              <p className="elvt-eyebrow">Erasto League · Votação da torcida</p>
              <h1 className="elvt-title">{title}</h1>
              <div className="elvt-title-bar" />
            </div>
            {brandLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="elvt-brand" src={brandLogoUrl} alt="" />
            )}
          </div>

          <div className="elvt-body">
            <div className="elvt-main">
              {current === "match" && data.match ? (
                <MatchPage match={data.match} now={now} />
              ) : current === "favorite" ? (
                <FavoritePage favorite={data.favorite} />
              ) : (
                <p className="elvt-empty">A votação do Jogador da Torcida abre no apito inicial de cada jogo.</p>
              )}
            </div>

            <div className="elvt-qr-panel">
              <p className="elvt-qr-title">Vote pelo celular</p>
              <div className="elvt-qr">
                <svg viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" aria-label="QR code da votação">
                  <path d={qr.path} fill="#000000" />
                </svg>
              </div>
              <p className="elvt-qr-url">{displayUrl}</p>
            </div>
          </div>

          {pages.length > 1 && (
            <div className="elvt-foot">
              <div className="elvt-bar">
                <div key={safeIndex} className="elvt-bar-fill" style={{ animation: `elvt-progress ${PAGE_DURATION_MS}ms linear forwards` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
