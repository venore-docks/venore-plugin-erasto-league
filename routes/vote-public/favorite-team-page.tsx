import Link from "next/link";
import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { readVoterKey } from "../../runtime/voter";
import { getTurnstileSiteKey } from "../../runtime/turnstile";
import { readFavoriteTeamVotingOpenFresh } from "../../shared/config";
import { FavoriteTeamVoteSection } from "./vote-sections";

// /erasto-league/votar/time-favorito — votação do time favorito da temporada (link direto pra
// divulgar pros alunos; o hub /erasto-league/votar também mostra esta mesma seção).
export default async function FavoriteTeamVotePage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const [voterKey, isOpen] = await Promise.all([readVoterKey(), readFavoriteTeamVotingOpenFresh()]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League · Votação da torcida</p>
      </div>
      <FavoriteTeamVoteSection voterKey={voterKey} isOpen={isOpen} turnstileSiteKey={getTurnstileSiteKey()} />
      <Link href="/erasto-league/votar" className="inline-block text-sm font-semibold text-primary hover:underline">
        ← Todas as votações
      </Link>
    </div>
  );
}
