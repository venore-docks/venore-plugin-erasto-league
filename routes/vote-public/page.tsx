import Link from "next/link";
import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getFeaturedMatchPoll, listOpenMatchPolls } from "../../runtime/fan-votes";
import { listTeams } from "../../runtime/teams";
import { readVoterKey } from "../../runtime/voter";
import { getTurnstileSiteKey } from "../../runtime/turnstile";
import { readFanVoteWindowHours, readFavoriteTeamVotingOpenFresh } from "../../shared/config";
import { FavoriteTeamVoteSection, MatchVoteSection } from "./vote-sections";

// /erasto-league/votar — hub da votação da torcida, destino do QR do overlay
// (/ext/erasto-league/vote-overlay) e do link na descrição do vídeo no YouTube. Um endereço fixo
// que sempre mostra o que está aberto: com UMA partida em votação, a cédula dela aparece direto
// aqui (menos um toque pra quem chegou pelo QR); com várias, um cartão por partida; sem nenhuma, o
// último resultado. Time favorito sempre embaixo. Rota "public" (dentro da shell/tema do host).
export default async function VoteHubPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const windowHours = await readFanVoteWindowHours();
  const [openPolls, voterKey, favoriteOpen, teams] = await Promise.all([
    listOpenMatchPolls(windowHours),
    readVoterKey(),
    readFavoriteTeamVotingOpenFresh(),
    listTeams(),
  ]);
  const featuredClosed = openPolls.length === 0 ? await getFeaturedMatchPoll(windowHours) : null;
  const turnstileSiteKey = getTurnstileSiteKey();
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Votação da torcida</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Escolha o Jogador da Torcida de cada jogo e o seu time favorito da temporada. Sem cadastro: cada aparelho vota uma vez.
        </p>
      </div>

      <section className="space-y-4 rounded-panel border border-border bg-card p-4 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">⭐ Jogador da Torcida</p>
        {openPolls.length === 1 && (
          <MatchVoteSection poll={openPolls[0]} voterKey={voterKey} windowHours={windowHours} turnstileSiteKey={turnstileSiteKey} headingLevel="h2" />
        )}

        {openPolls.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Mais de um jogo com votação aberta — escolha qual:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {openPolls.map((poll) => (
                <li key={poll.match.id}>
                  <Link
                    href={`/erasto-league/votar/jogo/${poll.match.id}`}
                    className="flex items-center justify-between gap-3 rounded-panel border border-border bg-background px-4 py-3 ui-motion-base hover:bg-muted/40"
                  >
                    <span className="min-w-0 truncate text-sm font-bold text-foreground">
                      {teamById.get(poll.match.homeTeamId)?.name ?? "—"} × {teamById.get(poll.match.awayTeamId)?.name ?? "—"}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-primary">Votar →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openPolls.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nenhum jogo com votação aberta agora. A votação abre no apito inicial e fica aberta até {windowHours}h depois do fim do jogo.
            </p>
            {featuredClosed && (
              <MatchVoteSection
                poll={featuredClosed}
                voterKey={voterKey}
                windowHours={windowHours}
                turnstileSiteKey={turnstileSiteKey}
                headingLevel="h2"
              />
            )}
          </div>
        )}
      </section>

      <section className="rounded-panel border border-border bg-card p-4 sm:p-6">
        <FavoriteTeamVoteSection voterKey={voterKey} isOpen={favoriteOpen} turnstileSiteKey={turnstileSiteKey} headingLevel="h2" />
      </section>
    </div>
  );
}
