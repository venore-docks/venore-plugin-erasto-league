import Link from "next/link";
import { formatScore } from "../shared/score";
import type { MatchSummary, TeamProfile } from "../contracts/types";

function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

// Vencedor com destaque forte (fundo success-soft no chip inteiro + brasão com anel sólido), não
// só cor no nome — pedido explícito depois do destaque anterior (só peso/cor do nome) ter ficado
// sutil demais.
function TeamChip({ team, align, won, lost }: { team: TeamProfile; align: "left" | "right"; won: boolean; lost: boolean }) {
  return (
    <Link
      href={`/erasto-league/teams/${team.slug}`}
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 transition hover:opacity-80 ${
        align === "right" ? "flex-row-reverse pl-2 text-right" : "pr-2"
      } ${won ? "bg-success-soft" : ""}`}
    >
      {team.crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.crestUrl}
          alt=""
          className={`size-8 shrink-0 rounded-full object-cover shadow-sm ${won ? "border-2 border-success" : "border border-border/60"}`}
        />
      ) : (
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            won ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {team.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className={`truncate text-sm ${won ? "font-bold text-success" : lost ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}>
        {team.name}
      </span>
    </Link>
  );
}

// Cartão de resultado — compartilhado entre o bloco de últimos resultados
// (blocks/recent-results-block.tsx) e a lista completa (routes/results-public), mesmo padrão de
// blocks/scorer-row.tsx pra artilharia/MVPs. O placar central linka pra página pública do jogo
// (routes/match-public — súmula + transmissão no YouTube); os brasões/nomes continuam linkando
// pro perfil de cada time, então o placar (não aninhado em nenhum dos dois Links) é quem carrega
// esse segundo destino. "▶ Assista o jogo" embaixo do placar é só um empurrão sutil pra esse
// destino — pedido explícito, já que todo jogo é transmitido (ver routes/match-public).
export function MatchResultCard({
  match,
  home,
  away,
  mvpName,
}: {
  match: MatchSummary;
  home: TeamProfile | undefined;
  away: TeamProfile | undefined;
  mvpName: string | null;
}) {
  const homeWon = match.homeScore > match.awayScore;
  const awayWon = match.awayScore > match.homeScore;

  return (
    <div className="flex items-center gap-3 rounded-panel border border-border bg-card px-4 py-3 shadow-sm transition hover:border-primary/40">
      {home && <TeamChip team={home} align="left" won={homeWon} lost={awayWon} />}

      <Link
        href={`/erasto-league/jogos/${match.id}`}
        className="flex shrink-0 flex-col items-center gap-0.5 rounded-panel px-1 ui-motion-base hover:opacity-80"
      >
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold tabular-nums text-primary">
          {formatScore(match.homeScore)}-{formatScore(match.awayScore)}
        </span>
        {match.finishedAt && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{formatMatchDate(match.finishedAt)}</span>
        )}
        {mvpName && (
          <span className="mt-0.5 max-w-[7rem] truncate text-[9px] font-bold uppercase tracking-wide text-warning" title={`MVP: ${mvpName}`}>
            ⭐ {mvpName}
          </span>
        )}
        <span className="mt-0.5 text-[9px] font-medium tracking-wide text-muted-foreground">▶ Assista o jogo</span>
      </Link>

      {away && <TeamChip team={away} align="right" won={awayWon} lost={homeWon} />}
    </div>
  );
}
