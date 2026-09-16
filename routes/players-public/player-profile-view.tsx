import Link from "next/link";
import type { PlayerProfile, TeamProfile } from "../../contracts/types";

const CSS = `
  html, body { margin: 0; background: #0b0f14; }
  * { box-sizing: border-box; }
  .el-pp-wrap {
    min-height: 100dvh; padding: 24px 16px 48px; max-width: 560px; margin: 0 auto;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
  }
  .el-pp-head { display: flex; align-items: center; gap: 16px; }
  .el-pp-photo { width: 72px; height: 72px; border-radius: 999px; object-fit: cover; flex-shrink: 0; }
  .el-pp-mono {
    width: 72px; height: 72px; border-radius: 999px; flex-shrink: 0; background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900;
  }
  .el-pp-name { font-size: 24px; font-weight: 900; margin: 0; }
  .el-pp-number { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 2px; }
  .el-pp-team { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 13px;
    color: rgba(255,255,255,0.6); text-decoration: none; }
  .el-pp-team:hover { color: #fff; }
  .el-pp-bio { margin-top: 20px; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.75); white-space: pre-wrap; }
`;

export function PlayerProfileView({ player, team }: { player: PlayerProfile; team: TeamProfile | null }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="el-pp-wrap">
        <div className="el-pp-head">
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="el-pp-photo" src={player.photoUrl} alt="" />
          ) : (
            <div className="el-pp-mono">{player.name.slice(0, 2).toUpperCase()}</div>
          )}
          <div>
            <h1 className="el-pp-name">{player.name}</h1>
            {player.number != null && <p className="el-pp-number">Camisa #{player.number}</p>}
            {team && (
              <Link href={`/ext/erasto-league/teams/${team.slug}`} className="el-pp-team">
                {team.name}
              </Link>
            )}
          </div>
        </div>

        {player.bio && <p className="el-pp-bio">{player.bio}</p>}
      </div>
    </>
  );
}
