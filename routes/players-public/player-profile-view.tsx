import Link from "next/link";
import type { CSSProperties } from "react";
import type { PlayerProfile, TeamProfile } from "../../contracts/types";

// Mesmo motivo do team-profile-view.tsx: max-width maior (720px, não 560px) + escala a partir de
// 900px, senão a página fica "a versão mobile centralizada" numa tela grande.
const CSS = `
  html, body { margin: 0; background: #0a0d12; }
  * { box-sizing: border-box; }
  .el-pp-wrap {
    min-height: 100dvh; padding-bottom: 48px; max-width: 720px; margin: 0 auto;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
  }
  .el-pp-cover {
    position: relative; padding: 56px 20px 28px; overflow: hidden;
    background: linear-gradient(160deg, color-mix(in srgb, var(--primary, #22c55e) 34%, #0a0d12), #0a0d12 72%);
  }
  .el-pp-head { position: relative; display: flex; align-items: center; gap: 18px; }
  .el-pp-photo {
    width: 84px; height: 84px; border-radius: 999px; object-fit: cover; flex-shrink: 0;
    border: 2px solid rgba(255,255,255,0.18); box-shadow: 0 16px 32px -10px rgba(0,0,0,0.6);
  }
  .el-pp-mono {
    width: 84px; height: 84px; border-radius: 999px; flex-shrink: 0; background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900;
    border: 2px solid rgba(255,255,255,0.18); box-shadow: 0 16px 32px -10px rgba(0,0,0,0.6);
  }
  .el-pp-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin: 0 0 4px; }
  .el-pp-name { font-size: 26px; font-weight: 900; margin: 0; }
  .el-pp-meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
  .el-pp-number {
    display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 800;
    color: color-mix(in srgb, var(--primary, #22c55e) 75%, white);
  }
  .el-pp-team { display: inline-flex; align-items: center; gap: 6px; font-size: 13px;
    color: rgba(255,255,255,0.6); text-decoration: none; }
  .el-pp-team:hover { color: #fff; }
  .el-pp-body { padding: 24px 20px 0; }
  .el-pp-bio { font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.78); white-space: pre-wrap; }

  @media (min-width: 900px) {
    .el-pp-cover { padding: 88px 48px 48px; }
    .el-pp-head { gap: 28px; }
    .el-pp-photo, .el-pp-mono { width: 140px; height: 140px; }
    .el-pp-mono { font-size: 44px; }
    .el-pp-eyebrow { font-size: 13px; }
    .el-pp-name { font-size: 48px; }
    .el-pp-meta { margin-top: 12px; gap: 16px; }
    .el-pp-number, .el-pp-team { font-size: 15px; }
    .el-pp-body { padding: 40px 48px 0; max-width: 640px; }
    .el-pp-bio { font-size: 16px; }
  }
`;

export function PlayerProfileView({ player, team }: { player: PlayerProfile; team: TeamProfile | null }) {
  const vars = { "--primary": team?.primaryColor ?? "#22c55e" } as CSSProperties;

  return (
    <>
      <style>{CSS}</style>
      <div className="el-pp-wrap" style={vars}>
        <div className="el-pp-cover">
          <div className="el-pp-head">
            {player.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="el-pp-photo" src={player.photoUrl} alt="" />
            ) : (
              <div className="el-pp-mono">{player.name.slice(0, 2).toUpperCase()}</div>
            )}
            <div>
              <p className="el-pp-eyebrow">Erasto League</p>
              <h1 className="el-pp-name">{player.name}</h1>
              <div className="el-pp-meta">
                {player.number != null && <span className="el-pp-number">#{player.number}</span>}
                {team && (
                  <Link href={`/ext/erasto-league/teams/${team.slug}`} className="el-pp-team">
                    {team.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {player.bio && (
          <div className="el-pp-body">
            <p className="el-pp-bio">{player.bio}</p>
          </div>
        )}
      </div>
    </>
  );
}
