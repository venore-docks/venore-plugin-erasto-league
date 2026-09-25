import Link from "next/link";
import { MonitorPlay, QrCode, Tv, Vote } from "lucide-react";
import { getPluginAdminPageData } from "@venore/plugin-sdk/admin";
import { AdminAccessDenied, AdminPageHeader, AdminStatTile, Badge, Button } from "@venore/plugin-sdk/ui";
import { resolveErastoLeagueConfig } from "../../../shared/config";
import { listMatches } from "../../../runtime/matches";
import { listTeams } from "../../../runtime/teams";
import {
  countMatchFanVotesByMatch,
  getFavoriteTeamResults,
  getFavoriteTeamVoteAudit,
  toMatchVotePoll,
} from "../../../runtime/fan-votes";
import { getTurnstileSiteKey } from "../../../runtime/turnstile";
import { VoteResultsList } from "../../../blocks/vote-results-list";
import { VoteAuditGroups } from "./audit-groups";
import { VoteWindowForm } from "./vote-window-form";
import { ResetFavoriteVotesControl } from "./reset-favorite-votes-control";
import { setFavoriteVotingOpenAction } from "./actions";

const RECENT_MATCHES = 12;

// /admin/erasto-league/votes — votação da torcida. Jogador da Torcida é por jogo: aqui só a
// janela + a lista de jogos (a auditoria de cada jogo fica na súmula dele); Time favorito é da
// temporada inteira: abrir/fechar, parcial, auditoria e "zerar" moram aqui.
export default async function VotesAdminPage() {
  const gate = await getPluginAdminPageData("erasto-league");
  if (!gate.granted) {
    return <AdminAccessDenied message="Você não tem permissão para ver o Erasto League." />;
  }

  const [config, matches, teams, favoriteResults, favoriteAudit] = await Promise.all([
    resolveErastoLeagueConfig(),
    listMatches(),
    listTeams(),
    getFavoriteTeamResults(),
    getFavoriteTeamVoteAudit(),
  ]);
  const recent = matches.filter((match) => match.status !== "cancelled").slice(0, RECENT_MATCHES);
  const voteCounts = await countMatchFanVotesByMatch(recent.map((match) => match.id));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const turnstileOn = getTurnstileSiteKey() !== null;
  const favoriteOpen = config.favoriteTeamVotingOpen;
  const openMatchPolls = recent.map((match) => toMatchVotePoll(match, config.fanVoteWindowHours)).filter((poll) => poll.isOpen);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Votação da torcida"
        description="Jogador da Torcida (por jogo) e Time favorito (temporada). Sem login: cada aparelho vota uma vez (cookie)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/erasto-league/votar" target="_blank" rel="noreferrer">
                <Vote className="size-4" /> Página de votação ↗
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/ext/erasto-league/vote-overlay" target="_blank" rel="noreferrer">
                <QrCode className="size-4" /> Overlay do QR (OBS) ↗
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/ext/erasto-league/vote-tv" target="_blank" rel="noreferrer">
                <Tv className="size-4" /> TV da votação ↗
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        <AdminStatTile label="Jogos com votação aberta" value={openMatchPolls.length} />
        <AdminStatTile label="Votos no Time favorito" value={favoriteResults.totalVotes} hint={favoriteOpen ? "Votação aberta" : "Votação fechada"} />
        <AdminStatTile label="Anti-robô (Turnstile)" value={turnstileOn ? "Ligado" : "Desligado"} />
      </div>

      <section className="space-y-3 rounded-panel border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MonitorPlay className="size-4 text-muted-foreground" /> Na transmissão
        </h2>
        <p className="text-xs text-muted-foreground">
          O QR é uma fonte de navegador <strong>separada</strong> do placar no OBS (<code>/ext/erasto-league/vote-overlay</code>) — quem
          opera o OBS liga e desliga quando quiser; o controle de gols não mexe nela. Com votação de jogo aberta ela chama o Jogador da
          Torcida; sem nenhuma, o Time favorito (se aberto); sem as duas, fica transparente. Posição: acrescente{" "}
          <code>?pos=top-left</code>, <code>top-right</code> (padrão), <code>bottom-left</code> ou <code>bottom-right</code>. Coloque
          também o link <code>/erasto-league/votar</code> na descrição do vídeo no YouTube — é o mesmo destino do QR. A TV da votação
          aceita <code>?pagina=jogador</code> ou <code>?pagina=time</code> pra fixar uma das páginas.
        </p>
        {!turnstileOn && (
          <p className="text-xs text-muted-foreground">
            Anti-robô desligado: pra ligar o Cloudflare Turnstile (gratuito), crie as variáveis de ambiente{" "}
            <code>ERASTO_LEAGUE_TURNSTILE_SITE_KEY</code> e <code>ERASTO_LEAGUE_TURNSTILE_SECRET_KEY</code> e faça o redeploy.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-panel border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">⭐ Jogador da Torcida</h2>
        <p className="text-xs text-muted-foreground">
          Abre no apito inicial de cada jogo e fecha {config.fanVoteWindowHours}h depois de encerrado. A auditoria de cada jogo (votos
          suspeitos, anular/restaurar) fica na súmula dele.
        </p>
        <VoteWindowForm hours={config.fanVoteWindowHours} />

        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma partida registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-border rounded-panel border border-border">
            {recent.map((match) => {
              const poll = toMatchVotePoll(match, config.fanVoteWindowHours);
              const votes = voteCounts.get(match.id) ?? 0;
              return (
                <li key={match.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <Link href={`/admin/erasto-league/matches/${match.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline">
                    {teamById.get(match.homeTeamId)?.name ?? "—"} × {teamById.get(match.awayTeamId)?.name ?? "—"}
                  </Link>
                  <Badge variant={poll.isOpen ? "default" : "secondary"}>{poll.isOpen ? "Aberta" : "Encerrada"}</Badge>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {votes} voto{votes === 1 ? "" : "s"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-panel border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">💚 Time favorito</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={favoriteOpen ? "default" : "secondary"}>{favoriteOpen ? "Votação aberta" : "Votação fechada"}</Badge>
            <form action={setFavoriteVotingOpenAction}>
              <input type="hidden" name="open" value={favoriteOpen ? "false" : "true"} />
              <Button type="submit" size="sm" variant="outline">
                {favoriteOpen ? "Fechar votação" : "Abrir votação"}
              </Button>
            </form>
            <ResetFavoriteVotesControl totalVotes={favoriteAudit.totalVotes} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Vale a temporada inteira: cada aparelho vota uma vez e pode trocar o voto enquanto estiver aberta. Fechar congela o resultado
          (continua visível); nova temporada = zerar os votos.
        </p>
        <VoteResultsList results={favoriteResults} emptyMessage="Nenhum voto ainda." />
        <h3 className="pt-2 text-sm font-semibold text-foreground">Auditoria</h3>
        <VoteAuditGroups audit={favoriteAudit} scope="favorite" />
      </section>
    </div>
  );
}
