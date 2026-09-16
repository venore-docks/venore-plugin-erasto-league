import Link from "next/link";
import type { CSSProperties } from "react";
import type { PlayerProfile, TeamProfile } from "../../contracts/types";

// Fora da shell/tema do host — mesmo motivo do overlay/console (CSS vars do tema não existem
// nesta rota standalone). Server component: página só de leitura, sem interatividade.
const CSS = `
  html, body { margin: 0; background: #0a0d12; }
  * { box-sizing: border-box; }
  .el-tp-wrap {
    min-height: 100dvh; padding-bottom: 48px; max-width: 720px; margin: 0 auto;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
  }
  .el-tp-cover {
    position: relative; padding: 56px 20px 28px; overflow: hidden;
    background: linear-gradient(160deg, color-mix(in srgb, var(--primary, #22c55e) 34%, #0a0d12), #0a0d12 72%);
  }
  .el-tp-cover::before {
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(120% 90% at 15% 0%, color-mix(in srgb, var(--secondary, #0f172a) 55%, transparent), transparent 60%);
  }
  .el-tp-head { position: relative; display: flex; align-items: center; gap: 18px; max-width: 720px; margin: 0 auto; }
  .el-tp-crest {
    width: 84px; height: 84px; border-radius: 20px; object-fit: cover; flex-shrink: 0;
    border: 2px solid rgba(255,255,255,0.18); box-shadow: 0 16px 32px -10px rgba(0,0,0,0.6);
  }
  .el-tp-mono {
    width: 84px; height: 84px; border-radius: 20px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 900; color: #fff;
    border: 2px solid rgba(255,255,255,0.18); box-shadow: 0 16px 32px -10px rgba(0,0,0,0.6);
  }
  .el-tp-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin: 0 0 4px; }
  .el-tp-name { font-size: 28px; font-weight: 900; margin: 0; letter-spacing: 0.2px; }
  .el-tp-founded { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.55); }

  .el-tp-body { padding: 24px 20px 0; }
  .el-tp-desc { font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.78); white-space: pre-wrap; }
  .el-tp-section-title { margin: 30px 0 14px; font-size: 12px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 1.5px; color: rgba(255,255,255,0.45); }
  .el-tp-roster { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .el-tp-player {
    display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 10px; border-radius: 16px;
    background: linear-gradient(180deg, #151b23, #10141a); border: 1px solid rgba(255,255,255,0.08);
    text-decoration: none; color: #fff; text-align: center;
    transition: transform 140ms ease, border-color 140ms ease;
  }
  .el-tp-player:hover { border-color: color-mix(in srgb, var(--primary, #22c55e) 45%, transparent); transform: translateY(-2px); }
  .el-tp-player-photo { width: 52px; height: 52px; border-radius: 999px; object-fit: cover; flex-shrink: 0; }
  .el-tp-player-mono {
    width: 52px; height: 52px; border-radius: 999px; flex-shrink: 0; background: rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800;
  }
  .el-tp-player-name { font-size: 13px; font-weight: 700; line-height: 1.25; }
  .el-tp-player-number {
    font-variant-numeric: tabular-nums; font-size: 11px; font-weight: 800; color: color-mix(in srgb, var(--primary, #22c55e) 75%, white);
  }
  .el-tp-empty { font-size: 13px; color: rgba(255,255,255,0.4); }
`;

function formatFoundedDate(iso: string | null): string | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return null;
  return `Fundado em ${day}/${month}/${year}`;
}

export function TeamProfileView({ team, roster }: { team: TeamProfile; roster: PlayerProfile[] }) {
  const founded = formatFoundedDate(team.foundedDate);
  const vars = { "--primary": team.primaryColor ?? "#22c55e", "--secondary": team.secondaryColor ?? "#0f172a" } as CSSProperties;

  return (
    <>
      <style>{CSS}</style>
      <div className="el-tp-wrap" style={vars}>
        <div className="el-tp-cover">
          <div className="el-tp-head">
            {team.crestUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="el-tp-crest" src={team.crestUrl} alt="" />
            ) : (
              <div className="el-tp-mono" style={{ background: team.primaryColor ?? "#334155" }}>
                {team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="el-tp-eyebrow">Erasto League</p>
              <h1 className="el-tp-name">{team.name}</h1>
              {founded && <p className="el-tp-founded">{founded}</p>}
            </div>
          </div>
        </div>

        <div className="el-tp-body">
          {team.description && <p className="el-tp-desc">{team.description}</p>}

          <h2 className="el-tp-section-title">Elenco</h2>
          {roster.length === 0 ? (
            <p className="el-tp-empty">Nenhum jogador cadastrado ainda.</p>
          ) : (
            <div className="el-tp-roster">
              {roster.map((player) => (
                <Link key={player.id} href={`/ext/erasto-league/players/${player.slug}`} className="el-tp-player">
                  {player.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="el-tp-player-photo" src={player.photoUrl} alt="" />
                  ) : (
                    <div className="el-tp-player-mono">{player.name.slice(0, 2).toUpperCase()}</div>
                  )}
                  <span className="el-tp-player-name">{player.name}</span>
                  {player.number != null && <span className="el-tp-player-number">#{player.number}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
