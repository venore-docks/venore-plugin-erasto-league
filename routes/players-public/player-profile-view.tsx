import Link from "next/link";
import type { CSSProperties } from "react";
import type { MatchSummary, PlayerProfile, TeamProfile } from "../../contracts/types";
import type { PlayerStats } from "../../runtime/stats";
import { formatScore } from "../../shared/score";

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
  .el-pp-name { display: flex; align-items: center; gap: 10px; font-size: 26px; font-weight: 900; margin: 0; }
  .el-pp-captain {
    display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px;
    background: color-mix(in srgb, var(--primary, #22c55e) 70%, white); color: #0a0d12; font-size: 12px; font-weight: 900; flex-shrink: 0;
  }
  .el-pp-meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
  .el-pp-number {
    display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 800;
    color: color-mix(in srgb, var(--primary, #22c55e) 75%, white);
  }
  .el-pp-team { display: inline-flex; align-items: center; gap: 6px; font-size: 13px;
    color: rgba(255,255,255,0.6); text-decoration: none; }
  .el-pp-team:hover { color: #fff; }

  .el-pp-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
    background: rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .el-pp-stat { background: #10141a; padding: 12px 6px; text-align: center; }
  .el-pp-stat-value { font-size: 18px; font-weight: 900; font-variant-numeric: tabular-nums; }
  .el-pp-stat-label { margin-top: 2px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.4); }

  .el-pp-body { padding: 24px 20px 0; }
  .el-pp-bio { font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.78); white-space: pre-wrap; }
  .el-pp-section-title { margin: 30px 0 14px; font-size: 12px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 1.5px; color: rgba(255,255,255,0.45); }
  .el-pp-empty { font-size: 13px; color: rgba(255,255,255,0.4); }
  .el-pp-matches { display: flex; flex-direction: column; gap: 8px; }
  .el-pp-match {
    display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px;
    background: linear-gradient(180deg, #151b23, #10141a); border: 1px solid rgba(255,255,255,0.08);
    text-decoration: none; color: #fff;
  }
  .el-pp-match-result {
    flex: none; width: 26px; height: 26px; border-radius: 999px; display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 900;
  }
  .el-pp-match-result.win { background: rgba(34,197,94,0.18); color: #4ade80; }
  .el-pp-match-result.draw { background: rgba(234,179,8,0.18); color: #facc15; }
  .el-pp-match-result.loss { background: rgba(239,68,68,0.18); color: #f87171; }
  .el-pp-match-opponent { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .el-pp-match-score { flex: none; font-size: 15px; font-weight: 900; font-variant-numeric: tabular-nums; }
  .el-pp-match-date { flex: none; font-size: 11px; color: rgba(255,255,255,0.4); width: 52px; text-align: right; }

  @media (min-width: 900px) {
    .el-pp-cover { padding: 88px 48px 48px; }
    .el-pp-head { gap: 28px; }
    .el-pp-photo, .el-pp-mono { width: 140px; height: 140px; }
    .el-pp-mono { font-size: 44px; }
    .el-pp-eyebrow { font-size: 13px; }
    .el-pp-name { font-size: 48px; }
    .el-pp-meta { margin-top: 12px; gap: 16px; }
    .el-pp-number, .el-pp-team { font-size: 15px; }
    .el-pp-stat { padding: 18px 6px; }
    .el-pp-stat-value { font-size: 26px; }
    .el-pp-stat-label { font-size: 10px; }
    .el-pp-body { padding: 40px 48px 0; }
    .el-pp-bio { font-size: 16px; max-width: 640px; }
  }
`;

function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function PlayerProfileView({
  player,
  team,
  stats,
  recentMatches,
  teamById,
}: {
  player: PlayerProfile;
  team: TeamProfile | null;
  stats: PlayerStats;
  recentMatches: MatchSummary[];
  teamById: Map<string, TeamProfile>;
}) {
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
              <h1 className="el-pp-name">
                {player.name}
                {player.isCaptain && <span className="el-pp-captain" title="Capitão">C</span>}
              </h1>
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

        {stats.matchesPlayed > 0 && (
          <div className="el-pp-stats">
            <div className="el-pp-stat">
              <p className="el-pp-stat-value">{formatScore(stats.goals)}</p>
              <p className="el-pp-stat-label">Gols</p>
            </div>
            <div className="el-pp-stat">
              <p className="el-pp-stat-value">{stats.matchesPlayed}</p>
              <p className="el-pp-stat-label">Jogos</p>
            </div>
            <div className="el-pp-stat">
              <p className="el-pp-stat-value">🟨 {stats.yellowCards}</p>
              <p className="el-pp-stat-label">Amarelos</p>
            </div>
            <div className="el-pp-stat">
              <p className="el-pp-stat-value">🟥 {stats.redCards}</p>
              <p className="el-pp-stat-label">Vermelhos</p>
            </div>
          </div>
        )}

        <div className="el-pp-body">
          {player.bio && <p className="el-pp-bio">{player.bio}</p>}

          <h2 className="el-pp-section-title">Últimos jogos</h2>
          {recentMatches.length === 0 ? (
            <p className="el-pp-empty">Nenhuma partida encerrada ainda.</p>
          ) : (
            <div className="el-pp-matches">
              {recentMatches.map((match) => {
                const isHome = match.homeTeamId === player.teamId;
                const ownScore = isHome ? match.homeScore : match.awayScore;
                const opponentScore = isHome ? match.awayScore : match.homeScore;
                const opponent = teamById.get(isHome ? match.awayTeamId : match.homeTeamId);
                const result = ownScore > opponentScore ? "win" : ownScore < opponentScore ? "loss" : "draw";
                const resultLabel = result === "win" ? "V" : result === "loss" ? "D" : "E";
                return (
                  <Link
                    key={match.id}
                    href={opponent ? `/ext/erasto-league/teams/${opponent.slug}` : "#"}
                    className="el-pp-match"
                  >
                    <span className={`el-pp-match-result ${result}`}>{resultLabel}</span>
                    <span className="el-pp-match-opponent">vs {opponent?.name ?? "—"}</span>
                    <span className="el-pp-match-score">
                      {formatScore(ownScore)} × {formatScore(opponentScore)}
                    </span>
                    {match.finishedAt && <span className="el-pp-match-date">{formatMatchDate(match.finishedAt)}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
