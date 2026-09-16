import Link from "next/link";
import type { PlayerProfile, TeamProfile } from "../../contracts/types";

// Fora da shell/tema do host — mesmo motivo do overlay/console (CSS vars do tema não existem
// nesta rota standalone). Server component: página só de leitura, sem interatividade.
const CSS = `
  html, body { margin: 0; background: #0b0f14; }
  * { box-sizing: border-box; }
  .el-tp-wrap {
    min-height: 100dvh; padding: 24px 16px 48px; max-width: 720px; margin: 0 auto;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
  }
  .el-tp-head { display: flex; align-items: center; gap: 16px; }
  .el-tp-crest { width: 72px; height: 72px; border-radius: 14px; object-fit: cover; flex-shrink: 0; }
  .el-tp-mono {
    width: 72px; height: 72px; border-radius: 14px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 900; color: #fff;
  }
  .el-tp-name { font-size: 26px; font-weight: 900; margin: 0; letter-spacing: 0.3px; }
  .el-tp-founded { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.5); }
  .el-tp-desc { margin-top: 20px; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.75); white-space: pre-wrap; }
  .el-tp-section-title { margin: 28px 0 12px; font-size: 13px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 1px; color: rgba(255,255,255,0.5); }
  .el-tp-roster { display: flex; flex-direction: column; gap: 8px; }
  .el-tp-player {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px;
    background: #161d26; border: 1px solid rgba(255,255,255,0.08); text-decoration: none; color: #fff;
  }
  .el-tp-player-photo { width: 36px; height: 36px; border-radius: 999px; object-fit: cover; flex-shrink: 0; }
  .el-tp-player-mono {
    width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0; background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;
  }
  .el-tp-player-number { font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.5); width: 28px; }
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

  return (
    <>
      <style>{CSS}</style>
      <div className="el-tp-wrap">
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
            <h1 className="el-tp-name">{team.name}</h1>
            {founded && <p className="el-tp-founded">{founded}</p>}
          </div>
        </div>

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
                <span className="el-tp-player-number">{player.number != null ? `#${player.number}` : ""}</span>
                <span>{player.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
