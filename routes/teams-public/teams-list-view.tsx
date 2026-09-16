import Link from "next/link";
import type { CSSProperties } from "react";
import type { TeamProfile, TeamStanding } from "../../contracts/types";

const CSS = `
  html, body { margin: 0; background: #0a0d12; }
  * { box-sizing: border-box; }
  .el-tl-wrap {
    min-height: 100dvh; padding-bottom: 48px; max-width: 1080px; margin: 0 auto;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
  }
  .el-tl-head {
    padding: 56px 20px 28px; text-align: center;
    background: radial-gradient(120% 140% at 50% -10%, color-mix(in srgb, var(--accent, #22c55e) 22%, #0a0d12) 0%, #0a0d12 72%);
  }
  .el-tl-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin: 0 0 8px; }
  .el-tl-title { font-size: 32px; font-weight: 900; margin: 0; }

  .el-tl-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;
    padding: 32px 20px 0;
  }
  .el-tl-card {
    display: block; overflow: hidden; border-radius: 18px; text-decoration: none; color: #fff;
    background: linear-gradient(180deg, #151b23, #10141a); border: 1px solid rgba(255,255,255,0.08);
    transition: transform 160ms ease, border-color 160ms ease;
  }
  .el-tl-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--accent, #22c55e) 45%, transparent); }
  .el-tl-card-bar { height: 6px; width: 100%; }
  .el-tl-card-body { display: flex; align-items: center; gap: 14px; padding: 16px; }
  .el-tl-crest { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
  .el-tl-crest-mono {
    width: 52px; height: 52px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 900; color: #fff;
  }
  .el-tl-name { font-size: 15px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .el-tl-meta { display: flex; align-items: center; gap: 10px; margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.5); }
  .el-tl-record { display: inline-flex; gap: 6px; font-variant-numeric: tabular-nums; }
  .el-tl-record b { color: rgba(255,255,255,0.85); font-weight: 800; }

  .el-tl-empty { padding: 64px 20px; text-align: center; color: rgba(255,255,255,0.4); font-size: 14px; }

  @media (min-width: 900px) {
    .el-tl-head { padding: 72px 48px 36px; }
    .el-tl-title { font-size: 44px; }
    .el-tl-grid { padding: 40px 48px 0; }
  }
`;

export function TeamsListView({
  teams,
  rosterCountByTeam,
  standingByTeam,
  accentColor,
}: {
  teams: TeamProfile[];
  rosterCountByTeam: Map<string, number>;
  standingByTeam: Map<string, TeamStanding>;
  accentColor: string;
}) {
  const vars = { "--accent": accentColor } as CSSProperties;

  return (
    <>
      <style>{CSS}</style>
      <div className="el-tl-wrap" style={vars}>
        <div className="el-tl-head">
          <p className="el-tl-eyebrow">Erasto League</p>
          <h1 className="el-tl-title">Times do campeonato</h1>
        </div>

        {teams.length === 0 ? (
          <p className="el-tl-empty">Nenhum time cadastrado ainda.</p>
        ) : (
          <div className="el-tl-grid">
            {teams.map((team) => {
              const standing = standingByTeam.get(team.id);
              const color = team.primaryColor ?? "#334155";
              return (
                <Link key={team.id} href={`/ext/erasto-league/teams/${team.slug}`} className="el-tl-card">
                  <div className="el-tl-card-bar" style={{ background: color }} />
                  <div className="el-tl-card-body">
                    {team.crestUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="el-tl-crest" src={team.crestUrl} alt="" />
                    ) : (
                      <div className="el-tl-crest-mono" style={{ background: color }}>
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="el-tl-name">{team.name}</p>
                      <div className="el-tl-meta">
                        <span>{rosterCountByTeam.get(team.id) ?? 0} jogadores</span>
                        {standing && standing.played > 0 && (
                          <span className="el-tl-record">
                            <b>{standing.won}</b>V <b>{standing.drawn}</b>E <b>{standing.lost}</b>D
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
