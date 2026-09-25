import Link from "next/link";
import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatch } from "../../runtime/matches";
import { toMatchVotePoll } from "../../runtime/fan-votes";
import { readVoterKey } from "../../runtime/voter";
import { getTurnstileSiteKey } from "../../runtime/turnstile";
import { readFanVoteWindowHours } from "../../shared/config";
import { MatchVoteSection } from "./vote-sections";

// /erasto-league/votar/jogo/:id — votação do Jogador da Torcida de UM jogo (link direto; o hub
// /erasto-league/votar manda pra cá quando há mais de um jogo aberto ao mesmo tempo). Aberta ou
// encerrada, sempre mostra o resultado — encerrada vira a página do "resultado final".
export default async function MatchVotePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { id } = await params;
  const match = await getMatch(id);
  if (!match || match.status === "cancelled") {
    notFound();
  }

  const [windowHours, voterKey] = await Promise.all([readFanVoteWindowHours(), readVoterKey()]);
  const poll = toMatchVotePoll(match, windowHours);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League · Jogador da Torcida</p>
      </div>
      <MatchVoteSection poll={poll} voterKey={voterKey} windowHours={windowHours} turnstileSiteKey={getTurnstileSiteKey()} />
      <Link href="/erasto-league/votar" className="inline-block text-sm font-semibold text-primary hover:underline">
        ← Todas as votações (e o seu time favorito)
      </Link>
    </div>
  );
}
