import Link from "next/link";
import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { readVoterKey } from "../../runtime/voter";
import { getTurnstileSiteKey } from "../../runtime/turnstile";
import { readFavoriteTeamVotingOpenFresh } from "../../shared/config";
import { FavoriteTeamVoteSection } from "./vote-sections";
import { resolveRequestOrigin } from "../../runtime/request-origin";
import { storyPath } from "../../shared/story-request";
import { ShareBar } from "../../blocks/share-bar";

// /erasto-league/votar/time-favorito — votação do time favorito da temporada (link direto pra
// divulgar pros alunos; o hub /erasto-league/votar também mostra esta mesma seção).
export default async function FavoriteTeamVotePage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const [voterKey, isOpen, { origin }] = await Promise.all([readVoterKey(), readFavoriteTeamVotingOpenFresh(), resolveRequestOrigin()]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League · Votação da torcida</p>
      </div>
      <FavoriteTeamVoteSection voterKey={voterKey} isOpen={isOpen} turnstileSiteKey={getTurnstileSiteKey()} />
      <ShareBar
        url={`${origin}/erasto-league/votar/time-favorito`}
        text="💚 Qual é o seu time favorito da Erasto League? Vote!"
        storyUrl={storyPath({ kind: "favorite-team" })}
      />
      <Link href="/erasto-league/votar" className="inline-block text-sm font-semibold text-primary hover:underline">
        ← Todas as votações
      </Link>
    </div>
  );
}
